// CPU opponents, spec s8. Every CPU sees only its seat's information set (s9): views are built from the
// round history by attackerView / defenderView, never from the raw GameState.
import type { Arena, GameState, HuntResult, Phase, RoundResult, Settings } from './types';
import { affordable, attackerOptions, riskMultiplier } from './engine';
import { solveZeroSum } from './lp';
import type { Rng } from './rng';

export type CpuKind = 'random' | 'easy' | 'greedy' | 'nash';

export interface AttackerView {
  round: number;
  phase: Phase;
  compromise: number;
  risk: number;
  knowledge: number;
  backdoor: boolean;
  /** Own moves and what came back: blocked, breached, hunted. Never the defender's action. */
  history: { phase: Phase; attack: string; blocked: boolean | null; hunt: HuntResult | null }[];
}

export interface DefenderView {
  round: number;
  budget: number;
  compromise: number;
  /** Own moves and what came back. The attack (and its phase) only when IDS was up that round. */
  history: {
    defense: string;
    seen: { attack: string; phase: Phase } | null;
    hunt: HuntResult | null;
    compromiseDelta: number;
  }[];
}

export function attackerView(state: GameState, history: RoundResult[]): AttackerView {
  return {
    round: state.round, phase: state.phase, compromise: state.compromise, risk: state.risk,
    knowledge: state.knowledge, backdoor: state.backdoor,
    history: history.map((r) => ({ phase: r.phaseBefore, attack: r.attack, blocked: r.blocked, hunt: r.hunt })),
  };
}

export function defenderView(state: GameState, history: RoundResult[]): DefenderView {
  return {
    round: state.round, budget: state.budget, compromise: state.compromise,
    history: history.map((r) => ({
      defense: r.defense,
      seen: r.attackSeen ? { attack: r.attack, phase: r.phaseBefore } : null,
      hunt: r.hunt,
      compromiseDelta: r.compromiseDelta,
    })),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Shared cell value (s8): what one round of (attack, defense) is worth to the attacker. Both Nash CPUs solve
// the same number, so each stage game stays zero-sum. It is a one-step lookahead: score the state the cell
// leads to by a rough win chance (can the attacker still reach C 100 in the rounds left?). That makes the CPUs
// clock-aware: a round spent hiding costs little early and everything late, because a timeout loses too.

const KAPPA = 3;
const EXFIL_PER_ROUND = 5; // expected C per round inside against a mixed defense (hunts, blocks, hiding)
const ROUNDS_TO_BREACH = 3;
const WIN_SCALE = 15;
const PROGRESS_PULL = 0.5;
const FOOTHOLD = 15; // C-equivalent of being inside, for the linear pull

/** Rough chance (0-100) the attacker still reaches C 100 from here. */
export function winChance(compromise: number, inside: boolean, roundsLeft: number): number {
  if (compromise >= 100) return 100;
  const reach = EXFIL_PER_ROUND * Math.max(0, roundsLeft - (inside ? 0 : ROUNDS_TO_BREACH));
  return 100 / (1 + Math.exp(-(reach - (100 - compromise)) / WIN_SCALE));
}

export interface Estimate {
  round: number;
  compromise: number;
  risk: number;
  knowledge: number;
  backdoor: boolean;
  budget: number;
}

export function cellValue(arena: Arena, st: Settings, e: Estimate, phase: Phase, attack: string, di: number): number {
  const d = arena.defenders[di]!;
  const left = st.rounds - e.round; // rounds after this one
  const clock = Math.min(1, (left + 1) / 5);

  let P = arena.payoff[phase][attack]![di]!;
  if (arena.knowledge.bonusAttacks.includes(attack) && P > 0) P += Math.min(e.knowledge, arena.knowledge.bonusCap);
  const isLayLow = attack === arena.layLow.id;
  const hunted = phase === 'inside' && d.id === arena.hunt.defender && !isLayLow;
  const evicted = hunted && !(e.backdoor && attack !== arena.persist);

  const dmg = !hunted && P > 0 ? P * (arena.damage[attack] ?? 0) : 0;
  const c = Math.min(100, e.compromise + dmg);
  const wIn = winChance(c, true, left);
  const wOut = winChance(c, false, left);
  // The win-chance curve goes flat when a game looks lost, and a flat curve makes the CPU give up even against an
  // opponent who has stopped defending. A linear pull toward damage and footholds keeps it trying.
  let gain = PROGRESS_PULL * (c - e.compromise);
  if (phase === 'outside') {
    const breach = arena.breach.attacks.includes(attack) && P > 0 ? Math.min(P / arena.breach.divisor, arena.breach.cap) : 0;
    gain += breach * (wIn + PROGRESS_PULL * FOOTHOLD) + (1 - breach) * wOut;
  } else {
    gain += evicted ? wOut : wIn + PROGRESS_PULL * FOOTHOLD;
    // A backdoor is insurance worth half the gap between staying in and being thrown out.
    const keeps = e.backdoor && !(hunted && !evicted);
    if (keeps || (attack === arena.persist && !hunted)) gain += (wIn - wOut) / 2;
  }
  if (c >= 100) gain += 50;
  if (!hunted && arena.knowledge.gainAttacks.includes(attack) && P > 0 && e.knowledge < arena.knowledge.max) gain += 3 * clock;

  let risk = isLayLow ? arena.layLow.risk : arena.attackers.find((a) => a.id === attack)!.baseRisk * riskMultiplier(arena, attack, d.id);
  if (!isLayLow) {
    if (P <= 0) risk += arena.noisyFailureRisk;
    if (evicted) risk += arena.hunt.evictRisk;
    risk *= st.riskScale;
  }
  const riskEff = Math.min(100, Math.max(0, e.risk + risk)) - e.risk;
  const w = (0.05 + 1.5 * (e.risk / st.threshold) ** 2) * clock;

  // Budget is worth more while it is scarce against the rounds still to defend.
  const scarcity = Math.min(1.5, Math.max(0.25, (2 * (left + 1)) / (e.budget + 1)));
  return gain - w * riskEff + KAPPA * scarcity * d.cost;
}

// ---------------------------------------------------------------------------------------------------------
// Beliefs.

/** Probability the attacker is inside, from the defender's evidence alone. */
export function insideBelief(v: DefenderView): number {
  const BREACH_HAZARD = 0.2; // rough per-round breach chance while unobserved
  let b = 0;
  for (const h of v.history) {
    b = b + (1 - b) * BREACH_HAZARD;
    if (h.seen) b = h.seen.phase === 'inside' ? 1 : BREACH_HAZARD * (h.seen.attack === 'A4' || h.seen.attack === 'A3' || h.seen.attack === 'A6' ? 1 : 0);
    if (h.hunt === 'evicted') b = 0;
    if (h.hunt === 'backdoor-burned') b = 1;
    if (h.hunt === 'nothing-found') b *= 0.5;
    // Exfiltration moves C in steps of 5; DoS moves it by 2, 6 or 8 (10 is ambiguous).
    const dc = h.compromiseDelta;
    if (dc > 0 && (dc % 5 === 0 && dc !== 10)) b = 1;
    else if (dc === 10) b = Math.max(b, 0.5);
    else if (dc > 0) b = Math.min(b, 0.3);
  }
  return b;
}

function defenderEstimate(v: DefenderView, st: Settings): Estimate {
  // The defender never sees R, K or the backdoor: assume a mid-game attacker.
  return { round: v.round, compromise: v.compromise, risk: st.threshold / 2, knowledge: 1, backdoor: false, budget: v.budget };
}

/** Most the defender can have left: the start budget minus every hunt the attacker has felt. */
function budgetCeiling(arena: Arena, v: AttackerView, st: Settings): number {
  const huntCost = arena.defenders.find((d) => d.id === arena.hunt.defender)!.cost;
  return st.budget - huntCost * v.history.filter((h) => h.hunt).length;
}

function attackerEstimate(arena: Arena, v: AttackerView, st: Settings): Estimate {
  // The attacker never sees the budget: assume the defender spends about 1.2 a round, capped by what it saw.
  return {
    round: v.round, compromise: v.compromise, risk: v.risk, knowledge: v.knowledge, backdoor: v.backdoor,
    budget: Math.max(0, Math.min(st.budget - 1.2 * (v.round - 1), budgetCeiling(arena, v, st))),
  };
}

// ---------------------------------------------------------------------------------------------------------
// Sampling helpers.

function sample(ids: string[], weights: number[], rng: Rng): string {
  const total = weights.reduce((a, b) => a + Math.max(0, b), 0);
  let r = rng() * total;
  for (let i = 0; i < ids.length; i++) if ((r -= Math.max(0, weights[i]!)) < 0) return ids[i]!;
  return ids[ids.length - 1]!;
}

function argmax(ids: string[], score: (id: string) => number, rng: Rng): string {
  let best = -Infinity;
  let top: string[] = [];
  for (const id of ids) {
    const s = score(id);
    if (s > best + 1e-9) [best, top] = [s, [id]];
    else if (Math.abs(s - best) <= 1e-9) top.push(id);
  }
  return top[Math.floor(rng() * top.length)]!;
}

// ---------------------------------------------------------------------------------------------------------
// Attacker CPUs.

export type AttackerCpu = (v: AttackerView, rng: Rng) => string;
export type DefenderCpu = (v: DefenderView, rng: Rng) => string;

/** Defender actions the attacker's own observations are consistent with, weighted 1/|set| per round. */
function inferredDefenderMix(arena: Arena, v: AttackerView): number[] {
  const n = arena.defenders.length;
  const w = new Array<number>(n).fill(1 / n); // uniform prior worth one round
  for (const h of v.history) {
    const row = arena.payoff[h.phase][h.attack]!;
    const fits = arena.defenders.map((d, j) => {
      if (h.hunt) return d.id === arena.hunt.defender;
      if (h.phase === 'inside' && d.id === arena.hunt.defender && h.attack !== arena.layLow.id) return false;
      if (h.blocked === null) return true;
      return h.blocked === (row[j]! <= 0);
    });
    const k = fits.filter(Boolean).length;
    if (k) fits.forEach((f, j) => { if (f) w[j]! += 1 / k; });
  }
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

export function makeAttackerCpu(kind: CpuKind, arena: Arena, st: Settings): AttackerCpu {
  const random: AttackerCpu = (v, rng) => {
    const ids = attackerOptions(arena, v.phase);
    return ids[Math.floor(rng() * ids.length)]!;
  };
  // Columns the defender can still afford for sure: drop any costing more than the budget ceiling.
  const possible = (v: AttackerView) => {
    const cap = budgetCeiling(arena, v, st);
    return arena.defenders.map((_, j) => j).filter((j) => arena.defenders[j]!.cost <= cap);
  };
  const restrictedMix = (v: AttackerView, cols: number[]) => {
    const all = inferredDefenderMix(arena, v);
    const w = cols.map((j) => all[j]!);
    const total = w.reduce((a, b) => a + b, 0) || 1;
    return w.map((x) => x / total);
  };
  const greedy: AttackerCpu = (v, rng) => {
    const cols = possible(v);
    const mix = restrictedMix(v, cols);
    const e = attackerEstimate(arena, v, st);
    return argmax(attackerOptions(arena, v.phase), (a) =>
      cols.reduce((acc, j, c) => acc + mix[c]! * cellValue(arena, st, e, v.phase, a, j), 0), rng);
  };
  const nash: AttackerCpu = (v, rng) => {
    const ids = attackerOptions(arena, v.phase);
    const cols = possible(v);
    const e = attackerEstimate(arena, v, st);
    const M = ids.map((a) => cols.map((j) => cellValue(arena, st, e, v.phase, a, j)));
    const x = solveZeroSum(M).row;
    // Safe exploitation: as evidence builds, sometimes play the best response to the defence seen so far,
    // but only when it beats the equilibrium mix against that same defence.
    if (rng() < Math.min(0.9, v.history.length / 8)) {
      const mix = restrictedMix(v, cols);
      const ev = M.map((row) => row.reduce((acc, m, c) => acc + mix[c]! * m, 0));
      const best = ev.indexOf(Math.max(...ev));
      if (ev[best]! > x.reduce((acc, p, i) => acc + p * ev[i]!, 0)) return ids[best]!;
    }
    return sample(ids, x, rng);
  };
  if (kind === 'random') return random;
  if (kind === 'greedy') return greedy;
  if (kind === 'nash') return nash;
  return (v, rng) => (rng() < 0.5 ? random(v, rng) : greedy(v, rng));
}

// ---------------------------------------------------------------------------------------------------------
// Defender CPUs.

/** Observed attack frequencies per phase (A3 ruling: only rounds with IDS up), plus a uniform prior. */
function observedAttackMix(arena: Arena, v: DefenderView, phase: Phase): number[] {
  const ids = attackerOptions(arena, phase);
  const w = ids.map(() => 1 / ids.length);
  for (const h of v.history) if (h.seen?.phase === phase) w[ids.indexOf(h.seen.attack)]! += 1;
  const total = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / total);
}

/**
 * The defender does not know the phase, so it faces two attacker "types". With belief b, choosing one Outside
 * action and one Inside action is a pair (i, k) worth (1-b) Out[i] + b In[k]; the defender minimises the best
 * pair. That is an ordinary matrix game with |Out| x |In| rows.
 */
function beliefMatrix(arena: Arena, st: Settings, e: Estimate, b: number, cols: number[]): number[][] {
  const out = attackerOptions(arena, 'outside').map((a) => cols.map((j) => cellValue(arena, st, e, 'outside', a, j)));
  const ins = attackerOptions(arena, 'inside').map((a) => cols.map((j) => cellValue(arena, st, e, 'inside', a, j)));
  const M: number[][] = [];
  for (const o of out) for (const i of ins) M.push(cols.map((_, c) => (1 - b) * o[c]! + b * i[c]!));
  return M;
}

export function makeDefenderCpu(kind: CpuKind, arena: Arena, st: Settings): DefenderCpu {
  const colsFor = (budget: number) => {
    const ok = affordable(arena, budget);
    return arena.defenders.map((_, j) => j).filter((j) => ok.includes(arena.defenders[j]!.id));
  };
  const random: DefenderCpu = (v, rng) => {
    const ok = affordable(arena, v.budget);
    return ok[Math.floor(rng() * ok.length)]!;
  };
  /** Defender's payoff for column j against the attacks it has seen, weighted by its phase belief. */
  const vsObserved = (v: DefenderView) => {
    const b = insideBelief(v);
    const e = defenderEstimate(v, st);
    const mix = { outside: observedAttackMix(arena, v, 'outside'), inside: observedAttackMix(arena, v, 'inside') };
    const expected = (j: number, phase: Phase) =>
      attackerOptions(arena, phase).reduce((acc, a, i) => acc + mix[phase][i]! * cellValue(arena, st, e, phase, a, j), 0);
    return (j: number) => -((1 - b) * expected(j, 'outside') + b * expected(j, 'inside'));
  };
  const greedy: DefenderCpu = (v, rng) => {
    const score = vsObserved(v);
    const cols = colsFor(v.budget);
    return argmax(cols.map((j) => arena.defenders[j]!.id), (id) => score(arena.defenders.findIndex((d) => d.id === id)), rng);
  };
  const nash: DefenderCpu = (v, rng) => {
    const cols = colsFor(v.budget);
    const ids = cols.map((j) => arena.defenders[j]!.id);
    const M = beliefMatrix(arena, st, defenderEstimate(v, st), insideBelief(v), cols);
    const y = solveZeroSum(M).col;
    // Safe exploitation, as for the attacker: evidence here is the rounds where IDS showed the attack.
    const seen = v.history.filter((h) => h.seen).length;
    if (rng() < Math.min(0.9, seen / 5)) {
      const score = vsObserved(v);
      const ev = cols.map(score);
      const best = ev.indexOf(Math.max(...ev));
      if (ev[best]! > y.reduce((acc, p, c) => acc + p * ev[c]!, 0)) return ids[best]!;
    }
    return sample(ids, y, rng);
  };
  if (kind === 'random') return random;
  if (kind === 'greedy') return greedy;
  if (kind === 'nash') return nash;
  return (v, rng) => (rng() < 0.5 ? random(v, rng) : greedy(v, rng));
}
