import type { Arena, GameState, HuntResult, Phase, RoundResult, Settings } from './types';
import type { Rng } from './rng';

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function newGame(settings: Settings): GameState {
  return {
    round: 1, phase: 'outside', compromise: 0, risk: 0, knowledge: 0, backdoor: false,
    budget: settings.budget, winner: null, reason: null,
  };
}

/** Attacker actions open in this phase, in arena order. */
export function attackerOptions(arena: Arena, phase: Phase): string[] {
  return arena.attackers.filter((a) => a.phase === phase || a.phase === 'both').map((a) => a.id);
}

/** Defender actions affordable with this budget (s5.2). */
export function affordable(arena: Arena, budget: number): string[] {
  return arena.defenders.filter((d) => d.cost <= budget).map((d) => d.id);
}

export function riskMultiplier(arena: Arena, attack: string, defense: string): number {
  if (attack === arena.layLow.id) return 1;
  const m = arena.riskMultipliers.find(
    (r) => r.defender === defense && (r.attackers === 'any' || r.attackers.includes(attack)),
  );
  return m ? m.multiplier : 1;
}

/**
 * One round, spec s5 steps 2-9 in order. Step 1 (secret simultaneous choice) is the caller's job:
 * both actions arrive together. Pure apart from rng(): at most one breach roll, then at most one caught roll.
 */
export function resolveRound(
  arena: Arena,
  settings: Settings,
  state: GameState,
  attack: string,
  defensePicked: string,
  rng: Rng,
): { state: GameState; result: RoundResult } {
  if (state.winner) throw new Error('game is over');
  const row = arena.payoff[state.phase][attack];
  if (!row) throw new Error(`${attack} is not available ${state.phase}`);
  const attacker = arena.attackers.find((a) => a.id === attack)!;
  const isLayLow = attack === arena.layLow.id;
  const outside = state.phase === 'outside';

  // 2. Defender pays; unaffordable means forced Idle.
  const costOf = (id: string) => {
    const d = arena.defenders.find((x) => x.id === id);
    if (!d) throw new Error(`unknown action ${id}`);
    return d.cost;
  };
  const defense = costOf(defensePicked) > state.budget ? arena.idle : defensePicked;
  const di = arena.defenders.findIndex((d) => d.id === defense);
  const budget = state.budget - costOf(defense);

  // 3. Payoff from the current phase's matrix.
  let payoff = row[di]!;

  // 4. Knowledge bonus, using K from before this round.
  if (arena.knowledge.bonusAttacks.includes(attack) && payoff > 0) {
    payoff += Math.min(state.knowledge, arena.knowledge.bonusCap);
  }

  // 5. Action effects.
  let phase = state.phase;
  let compromise = state.compromise;
  let backdoor = state.backdoor;
  let breached = false;
  let hunt: HuntResult | null = null;
  let evicted = false;
  let effectsApply = true;
  if (outside) {
    if (arena.breach.attacks.includes(attack) && payoff > 0) {
      breached = rng() < Math.min(payoff / arena.breach.divisor, arena.breach.cap);
      if (breached) phase = 'inside';
    }
    // A hunt with nobody inside reads exactly like one that missed a dormant intruder (s9).
    if (defense === arena.hunt.defender) hunt = 'nothing-found';
  } else if (defense === arena.hunt.defender) {
    if (isLayLow) {
      hunt = 'nothing-found';
    } else {
      effectsApply = false;
      if (backdoor && attack !== arena.persist) {
        hunt = 'backdoor-burned';
        backdoor = false;
      } else {
        hunt = 'evicted';
        evicted = true;
        phase = 'outside';
        backdoor = false;
      }
    }
  }
  if (effectsApply) {
    if (payoff > 0) compromise += payoff * (arena.damage[attack] ?? 0);
    if (!outside && attack === arena.persist) backdoor = true;
  }
  compromise = clamp(compromise, 0, 100);

  // 6. Knowledge.
  let knowledge = state.knowledge;
  if (effectsApply && arena.knowledge.gainAttacks.includes(attack) && payoff > 0) knowledge += 1;
  if (outside && arena.knowledge.reduceDefenders.includes(defense)) knowledge -= 1;
  if (evicted) knowledge -= 1;
  knowledge = clamp(knowledge, 0, arena.knowledge.max);

  // 7. Risk. Lay Low is fixed; otherwise base x defender multiplier, +noisy failure, +eviction, x difficulty.
  let riskDelta: number;
  if (isLayLow) {
    riskDelta = arena.layLow.risk;
  } else {
    riskDelta = attacker.baseRisk * riskMultiplier(arena, attack, defense);
    if (payoff <= 0) riskDelta += arena.noisyFailureRisk;
    if (evicted) riskDelta += arena.hunt.evictRisk;
    riskDelta *= settings.riskScale;
  }
  const risk = clamp(state.risk + riskDelta, 0, 100);

  // 8. Caught check: one roll once R reaches the threshold.
  let caughtChance = 0;
  let caught = false;
  if (risk >= settings.threshold) {
    caughtChance = settings.threshold >= 100 ? 1 : (risk - settings.threshold) / (100 - settings.threshold);
    caught = caughtChance >= 1 || (caughtChance > 0 && rng() < caughtChance);
  }

  // 9. Win checks. A breach-to-100 in the same round as a catch goes to the attacker.
  let winner: GameState['winner'] = null;
  let reason: GameState['reason'] = null;
  if (compromise >= 100) [winner, reason] = ['attacker', 'breach'];
  else if (caught) [winner, reason] = ['defender', 'caught'];
  else if (state.round >= settings.rounds) [winner, reason] = ['defender', 'timeout'];

  return {
    state: { round: state.round + 1, phase, compromise, risk, knowledge, backdoor, budget, winner, reason },
    result: {
      round: state.round,
      phaseBefore: state.phase,
      attack,
      defensePicked,
      defense,
      payoff,
      breached,
      hunt,
      compromiseDelta: compromise - state.compromise,
      riskDelta: risk - state.risk,
      knowledgeDelta: knowledge - state.knowledge,
      caughtChance,
      caught,
      blocked: isLayLow ? null : payoff <= 0,
      attackSeen: arena.detectors.includes(defense),
    },
  };
}
