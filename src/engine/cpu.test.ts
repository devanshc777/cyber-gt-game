import { describe, expect, it } from 'vitest';
import { affordable, attackerOptions, newGame, resolveRound } from './engine';
import { makeRng } from './rng';
import { website as arena } from './arenas/website';
import {
  attackerView, defenderView, insideBelief, makeAttackerCpu, makeDefenderCpu, winChance,
  type CpuKind, type DefenderView,
} from './cpu';
import type { GameState, RoundResult } from './types';

const st = arena.settings.attacker.normal;
const kinds: CpuKind[] = ['random', 'easy', 'greedy', 'nash'];

function playOut(att: CpuKind, def: CpuKind, seed: number) {
  const A = makeAttackerCpu(att, arena, st);
  const D = makeDefenderCpu(def, arena, st);
  const rng = makeRng(seed);
  let s = newGame(st);
  const hist: RoundResult[] = [];
  const picks: { state: GameState; a: string; d: string }[] = [];
  while (!s.winner) {
    const a = A(attackerView(s, hist), rng);
    const d = D(defenderView(s, hist), rng);
    picks.push({ state: s, a, d });
    const out = resolveRound(arena, st, s, a, d, rng);
    hist.push(out.result);
    s = out.state;
  }
  return { final: s, hist, picks };
}

describe('information sets (s9)', () => {
  const { final, hist } = playOut('nash', 'nash', 3);

  it('the defender view carries no phase, risk, knowledge or backdoor', () => {
    const v = defenderView(final, hist);
    expect(Object.keys(v).sort()).toEqual(['budget', 'compromise', 'history', 'round']);
  });

  it('the defender sees an attack only in rounds it ran IDS', () => {
    defenderView(final, hist).history.forEach((h, i) => {
      expect(h.seen !== null).toBe(hist[i]!.defense === 'D1');
      if (h.seen) expect(h.seen).toEqual({ attack: hist[i]!.attack, phase: hist[i]!.phaseBefore });
    });
  });

  it('a hunt on an empty network looks the same to the defender as missing a dormant intruder', () => {
    const rng = makeRng(1);
    const out = resolveRound(arena, st, newGame(st), 'A7', 'D7', rng);
    const ins = resolveRound(arena, st, { ...newGame(st), phase: 'inside' }, 'A7', 'D7', rng);
    expect(defenderView(out.state, [out.result]).history).toEqual(defenderView(ins.state, [ins.result]).history);
    expect(attackerView(out.state, [out.result]).history[0]!.hunt).toBeNull();
  });

  it('the attacker view never names a defense or the budget', () => {
    const v = attackerView(final, hist);
    expect(Object.keys(v)).not.toContain('budget');
    for (const h of v.history) expect(Object.keys(h).sort()).toEqual(['attack', 'blocked', 'hunt', 'phase']);
  });
});

describe('every CPU plays legal moves', () => {
  for (const att of kinds) for (const def of kinds) {
    it(`${att} attacker vs ${def} defender`, () => {
      for (const seed of [1, 2, 3]) {
        for (const { state, a, d } of playOut(att, def, seed).picks) {
          expect(attackerOptions(arena, state.phase)).toContain(a);
          expect(affordable(arena, state.budget)).toContain(d);
        }
      }
    });
  }
});

describe('determinism', () => {
  it('the same seed replays the same game', () => {
    expect(playOut('nash', 'nash', 11).hist).toEqual(playOut('nash', 'nash', 11).hist);
    expect(playOut('greedy', 'easy', 12).hist).toEqual(playOut('greedy', 'easy', 12).hist);
  });
});

describe('defender belief about the phase', () => {
  const view = (history: DefenderView['history']): DefenderView => ({ round: history.length + 1, budget: 20, compromise: 0, history });
  const quiet = { defense: 'D8', seen: null, hunt: null, compromiseDelta: 0 };

  it('starts at 0 and creeps up while nothing is seen', () => {
    expect(insideBelief(view([]))).toBe(0);
    const b1 = insideBelief(view([quiet]));
    const b3 = insideBelief(view([quiet, quiet, quiet]));
    expect(b1).toBeGreaterThan(0);
    expect(b3).toBeGreaterThan(b1);
  });

  it('is certain after hard evidence', () => {
    expect(insideBelief(view([{ ...quiet, defense: 'D1', seen: { attack: 'A8', phase: 'inside' } }]))).toBe(1);
    expect(insideBelief(view([{ ...quiet, compromiseDelta: 30 }]))).toBe(1);
    expect(insideBelief(view([{ ...quiet, defense: 'D7', hunt: 'backdoor-burned' }]))).toBe(1);
  });

  it('drops to 0 after an eviction, and DoS-sized damage points outside', () => {
    expect(insideBelief(view([{ ...quiet, compromiseDelta: 30 }, { ...quiet, defense: 'D7', hunt: 'evicted' }]))).toBe(0);
    expect(insideBelief(view([quiet, quiet, quiet, { ...quiet, compromiseDelta: 6 }]))).toBeLessThanOrEqual(0.3);
  });
});

describe('win-chance estimate (clock awareness)', () => {
  it('is 100 at C 100, higher inside than outside, and falls as rounds run out', () => {
    expect(winChance(100, false, 0)).toBe(100);
    expect(winChance(40, true, 10)).toBeGreaterThan(winChance(40, false, 10));
    expect(winChance(40, true, 3)).toBeLessThan(winChance(40, true, 10));
  });
});

describe('CPU strength (smell test; full numbers in tools/eval-cpus.ts)', () => {
  const rate = (att: CpuKind, def: CpuKind, n = 60) => {
    let w = 0;
    for (let i = 1; i <= n; i++) if (playOut(att, def, i).final.winner === 'attacker') w++;
    return w / n;
  };

  it('Nash attacker beats a random defender far more often than a Nash defender', () => {
    expect(rate('nash', 'random')).toBeGreaterThan(rate('nash', 'nash') + 0.3);
  });

  it('Nash defender holds a random attacker to almost nothing', () => {
    expect(rate('random', 'nash')).toBeLessThan(0.1);
  });
});
