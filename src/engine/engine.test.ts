import { describe, expect, it } from 'vitest';
import { attackerOptions, newGame, resolveRound } from './engine';
import { makeRng, type Rng } from './rng';
import { website as arena } from './arenas/website';
import type { GameState, Settings } from './types';

const normal = arena.settings.attacker.normal;
const hard = arena.settings.attacker.hard;

/** Hands out the given rolls in order and fails the test if the engine asks for more. */
const rolls = (...xs: number[]): Rng => () => {
  if (!xs.length) throw new Error('unexpected rng() call');
  return xs.shift()!;
};
const noRolls = rolls();

const at = (patch: Partial<GameState> = {}): GameState => ({ ...newGame(normal), ...patch });
const play = (s: GameState, a: string, d: string, rng: Rng = noRolls, st: Settings = normal) =>
  resolveRound(arena, st, s, a, d, rng);

describe('step 1: simultaneous choice', () => {
  it('is pure: same inputs and seed give the same output, input state untouched', () => {
    const s = at();
    const frozen = structuredClone(s);
    const x = play(s, 'A6', 'D8', makeRng(7));
    const y = play(s, 'A6', 'D8', makeRng(7));
    expect(x).toEqual(y);
    expect(s).toEqual(frozen);
  });

  it('offers each phase its own attacker actions', () => {
    expect(attackerOptions(arena, 'outside')).toEqual(['A1', 'A3', 'A4', 'A5', 'A6', 'A7']);
    expect(attackerOptions(arena, 'inside')).toEqual(['A2', 'A8', 'A9', 'A7']);
    expect(() => play(at(), 'A8', 'D8')).toThrow(/not available outside/);
    expect(() => play(at({ phase: 'inside' }), 'A4', 'D8')).toThrow(/not available inside/);
  });
});

describe('step 2: defender pays', () => {
  it('deducts the cost', () => {
    expect(play(at(), 'A7', 'D3').state.budget).toBe(normal.budget - 1);
    expect(play(at(), 'A7', 'D1').state.budget).toBe(normal.budget - 2);
  });

  it('forces Idle when the budget cannot cover the pick', () => {
    const { state, result } = play(at({ budget: 1 }), 'A7', 'D2');
    expect(result.defensePicked).toBe('D2');
    expect(result.defense).toBe('D8');
    expect(state.budget).toBe(1);
  });
});

describe("step 3: payoff from the current phase's matrix", () => {
  it('reads the outside and inside matrices', () => {
    expect(play(at(), 'A4', 'D2').result.payoff).toBe(-5);
    expect(play(at({ phase: 'inside' }), 'A2', 'D4').result.payoff).toBe(-3);
  });
});

describe('step 4: knowledge bonus', () => {
  it('adds min(K, 3) to a positive P for A3, A4, A8', () => {
    expect(play(at({ knowledge: 2 }), 'A4', 'D8', rolls(0.99)).result.payoff).toBe(10);
    expect(play(at({ knowledge: 5 }), 'A4', 'D8', rolls(0.99)).result.payoff).toBe(11);
    expect(play(at({ phase: 'inside', knowledge: 2 }), 'A8', 'D8').result.payoff).toBe(8);
  });

  it('never touches a blocked attack or an attack without the bonus', () => {
    expect(play(at({ knowledge: 3 }), 'A4', 'D2').result.payoff).toBe(-5);
    expect(play(at({ knowledge: 3 }), 'A6', 'D8', rolls(0.99)).result.payoff).toBe(6);
  });
});

describe('step 5: action effects', () => {
  it('breaches with probability P / 10', () => {
    const hit = play(at(), 'A6', 'D8', rolls(0.59));
    expect(hit.result.breached).toBe(true);
    expect(hit.state.phase).toBe('inside');
    const miss = play(at(), 'A6', 'D8', rolls(0.6));
    expect(miss.result.breached).toBe(false);
    expect(miss.state.phase).toBe('outside');
  });

  it('caps the breach chance at 90%', () => {
    expect(play(at({ knowledge: 3 }), 'A4', 'D8', rolls(0.89)).state.phase).toBe('inside');
    expect(play(at({ knowledge: 3 }), 'A4', 'D8', rolls(0.9)).state.phase).toBe('outside');
  });

  it('does not roll for a blocked attack or a non-breach attack', () => {
    expect(play(at(), 'A6', 'D6').result.breached).toBe(false);
    expect(play(at(), 'A1', 'D8').result.breached).toBe(false);
  });

  it('DoS deals P x 2 from outside', () => {
    expect(play(at(), 'A5', 'D8').state.compromise).toBe(10);
  });

  it('Exfiltrate deals P x 5 and Persist plants a backdoor', () => {
    expect(play(at({ phase: 'inside' }), 'A8', 'D8').state.compromise).toBe(30);
    expect(play(at({ phase: 'inside' }), 'A9', 'D8').state.backdoor).toBe(true);
  });

  it('a hunt evicts an active intruder and cancels its action', () => {
    const { state, result } = play(at({ phase: 'inside', compromise: 20 }), 'A8', 'D7');
    expect(result.hunt).toBe('evicted');
    expect(state.phase).toBe('outside');
    expect(state.compromise).toBe(20);
  });

  it('a backdoor absorbs one hunt, except while it is being planted', () => {
    const burned = play(at({ phase: 'inside', backdoor: true }), 'A8', 'D7');
    expect(burned.result.hunt).toBe('backdoor-burned');
    expect(burned.state.phase).toBe('inside');
    expect(burned.state.backdoor).toBe(false);
    expect(burned.state.compromise).toBe(0);
    const planting = play(at({ phase: 'inside', backdoor: true }), 'A9', 'D7');
    expect(planting.result.hunt).toBe('evicted');
    expect(planting.state.backdoor).toBe(false);
  });

  it('a dormant intruder is not found', () => {
    const { state, result } = play(at({ phase: 'inside' }), 'A7', 'D7');
    expect(result.hunt).toBe('nothing-found');
    expect(state.phase).toBe('inside');
  });

  it('a hunt outside reads "nothing found", the same as missing a dormant intruder', () => {
    expect(play(at(), 'A7', 'D7').result.hunt).toBe('nothing-found');
    expect(play(at(), 'A1', 'D8').result.hunt).toBeNull();
  });

  it('clamps C at 100', () => {
    expect(play(at({ phase: 'inside', compromise: 90 }), 'A8', 'D8').state.compromise).toBe(100);
  });
});

describe('step 6: knowledge update', () => {
  it('Port Scan outside and Sniffing inside raise K when they land', () => {
    expect(play(at(), 'A1', 'D8').state.knowledge).toBe(1);
    expect(play(at({ phase: 'inside' }), 'A2', 'D8').state.knowledge).toBe(1);
    expect(play(at({ knowledge: 5 }), 'A1', 'D8').state.knowledge).toBe(5);
  });

  it('Firewall and Hunt lower K only while the attacker is outside', () => {
    expect(play(at({ knowledge: 2 }), 'A3', 'D5').state.knowledge).toBe(1);
    expect(play(at({ knowledge: 2 }), 'A7', 'D7').state.knowledge).toBe(1);
    expect(play(at(), 'A1', 'D5').state.knowledge).toBe(0);
    expect(play(at({ phase: 'inside', knowledge: 2 }), 'A7', 'D5').state.knowledge).toBe(2);
  });

  it('eviction costs 1 K, and a hunted Sniff gains nothing', () => {
    expect(play(at({ phase: 'inside', knowledge: 2 }), 'A8', 'D7').state.knowledge).toBe(1);
    expect(play(at({ phase: 'inside', knowledge: 2 }), 'A2', 'D7').state.knowledge).toBe(1);
  });
});

describe('step 7: risk update', () => {
  it('base x multiplier, +5 when blocked', () => {
    expect(play(at(), 'A4', 'D8', rolls(0.99)).state.risk).toBe(10);
    expect(play(at(), 'A4', 'D1', rolls(0.99)).state.risk).toBe(15);
    expect(play(at(), 'A4', 'D2').state.risk).toBe(15);
    expect(play(at(), 'A3', 'D3').state.risk).toBe(23.75);
  });

  it('eviction adds +10', () => {
    expect(play(at({ phase: 'inside' }), 'A8', 'D7').state.risk).toBe(23);
  });

  it('Lay Low is always -10, floored at 0, and ignores every multiplier', () => {
    expect(play(at({ risk: 30 }), 'A7', 'D1').state.risk).toBe(20);
    expect(play(at({ risk: 5 }), 'A7', 'D8').state.risk).toBe(0);
    expect(play(at({ risk: 30 }), 'A7', 'D8', noRolls, hard).state.risk).toBe(20);
  });

  it('the difficulty multiplier scales the whole delta, noisy failure included', () => {
    expect(play(at(), 'A4', 'D2', noRolls, hard).state.risk).toBe(18.75);
  });
});

describe('step 8: caught check', () => {
  it('no roll below the threshold, and none exactly at it (p = 0)', () => {
    expect(play(at({ risk: 30 }), 'A4', 'D8', rolls(0.99)).result.caughtChance).toBe(0);
  });

  it('p = (R - threshold) / (100 - threshold), one roll', () => {
    expect(play(at({ risk: 45 }), 'A4', 'D8', rolls(0.99, 0.24)).result.caught).toBe(true);
    const free = play(at({ risk: 45 }), 'A4', 'D8', rolls(0.99, 0.25));
    expect(free.result.caughtChance).toBe(0.25);
    expect(free.result.caught).toBe(false);
  });

  it('R = 100 is caught without a roll', () => {
    expect(play(at({ risk: 95 }), 'A4', 'D8', rolls(0.99)).result.caught).toBe(true);
  });

  it('the breach roll comes before the caught roll', () => {
    const { result } = play(at({ risk: 45 }), 'A6', 'D8', rolls(0.1, 0.19));
    expect(result.breached).toBe(true);
    expect(result.caught).toBe(true);
  });
});

describe('step 9: win checks', () => {
  it('C 100 wins for the attacker, even if caught the same round', () => {
    const { state, result } = play(at({ phase: 'inside', compromise: 90, risk: 95 }), 'A8', 'D8');
    expect(result.caught).toBe(true);
    expect(state.winner).toBe('attacker');
    expect(state.reason).toBe('breach');
  });

  it('caught wins for the defender', () => {
    expect(play(at({ risk: 95 }), 'A4', 'D8', rolls(0.99)).state.reason).toBe('caught');
  });

  it('surviving round 20 wins for the defender, and the game then refuses more rounds', () => {
    const { state } = play(at({ round: 20 }), 'A7', 'D8');
    expect(state.winner).toBe('defender');
    expect(state.reason).toBe('timeout');
    expect(() => play(state, 'A7', 'D8')).toThrow(/over/);
  });
});

describe('scripted games', () => {
  it('a full 20-round game: recon, breach, backdoor, hunts, eviction, DoS, timeout', () => {
    // Traced by hand against spec s5. R stays under the threshold, so the only roll is the breach in round 5.
    const script: [string, string][] = [
      ['A1', 'D8'], ['A1', 'D8'], ['A4', 'D2'], ['A7', 'D8'], ['A6', 'D8'],
      ['A9', 'D1'], ['A7', 'D7'], ['A8', 'D7'], ['A7', 'D8'], ['A8', 'D8'],
      ['A7', 'D8'], ['A8', 'D4'], ['A7', 'D8'], ['A7', 'D8'], ['A8', 'D7'],
      ['A7', 'D8'], ['A7', 'D8'], ['A5', 'D8'], ['A7', 'D8'], ['A7', 'D8'],
    ];
    const rng = rolls(0);
    let s = newGame(normal);
    const risk: number[] = [];
    const hunts: (string | null)[] = [];
    for (const [a, d] of script) {
      const out = play(s, a, d, rng);
      s = out.state;
      risk.push(s.risk);
      hunts.push(out.result.hunt);
    }
    expect(risk).toEqual([6, 12, 27, 17, 24, 31.5, 21.5, 34.5, 24.5, 32.5, 22.5, 30.5, 20.5, 10.5, 33.5, 23.5, 13.5, 31.5, 21.5, 11.5]);
    expect(hunts.filter(Boolean)).toEqual(['nothing-found', 'backdoor-burned', 'evicted']);
    expect(s).toEqual({
      round: 21, phase: 'outside', compromise: 70, risk: 11.5, knowledge: 1, backdoor: false,
      budget: normal.budget - 12, winner: 'defender', reason: 'timeout',
    });
  });

  it('an undefended server falls in 5 rounds', () => {
    const rng = rolls(0, 0);
    let s = newGame(normal);
    s = play(s, 'A4', 'D8', rng).state;
    expect(s.phase).toBe('inside');
    for (let i = 0; i < 4; i++) s = play(s, 'A8', 'D8', rng).state;
    expect(s).toMatchObject({ round: 6, compromise: 100, risk: 42, winner: 'attacker', reason: 'breach' });
  });
});
