// Frozen copy of the v1 engine (spec GAME-SPEC-v1.md), kept only so tools/probe.ts can reproduce the
// numbers in docs/RUBRIC-REVIEW.md. Not used by the game.
import type { Rng } from '../../src/engine/rng';

export interface RiskMultiplier { defender: string; attackers: string[] | 'any'; multiplier: number }
export interface Settings { rounds: number; budget: number; riskScale: number; threshold: number }
export interface Arena {
  attackers: { id: string; baseRisk: number }[];
  defenders: { id: string; cost: number }[];
  payoff: number[][];
  riskMultipliers: RiskMultiplier[];
  layLow: { id: string; risk: number; counteredBy?: Record<string, number> };
  idle: string;
  knowledge: { max: number; bonusAttacks: string[]; bonusCap: number; gainAttacks: string[]; reduceDefenders: string[] };
  compromiseScale: number;
  repair: Record<string, number>;
  noisyFailureRisk: number;
  settings: { attacker: { normal: Settings } };
}
export interface GameState {
  round: number; compromise: number; risk: number; knowledge: number; budget: number;
  winner: 'attacker' | 'defender' | null; reason: 'breach' | 'caught' | 'timeout' | null;
}

export const website: Arena = {
  attackers: [
    { id: 'A1', baseRisk: 6 }, { id: 'A2', baseRisk: 4 }, { id: 'A3', baseRisk: 15 }, { id: 'A4', baseRisk: 10 },
    { id: 'A5', baseRisk: 18 }, { id: 'A6', baseRisk: 7 }, { id: 'A7', baseRisk: -10 },
  ],
  defenders: [
    { id: 'D1', cost: 1 }, { id: 'D2', cost: 2 }, { id: 'D3', cost: 1 }, { id: 'D4', cost: 2 },
    { id: 'D5', cost: 1 }, { id: 'D6', cost: 2 }, { id: 'D7', cost: 1 }, { id: 'D8', cost: 0 },
  ],
  payoff: [
    [-2, 1, 1, 1, -2, 2, -1, 2], [1, 3, 3, -3, 1, 3, 0, 4], [-3, 3, -4, 3, 0, 4, 1, 5], [2, -5, 6, 6, 3, 6, 2, 8],
    [1, 3, -2, 4, -2, 4, 2, 5], [2, 5, 5, 5, 5, -4, 4, 6], [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  riskMultipliers: [
    { defender: 'D1', attackers: 'any', multiplier: 1.75 },
    { defender: 'D3', attackers: ['A3', 'A5'], multiplier: 1.25 },
    { defender: 'D5', attackers: ['A1', 'A5'], multiplier: 1.25 },
    { defender: 'D7', attackers: ['A1'], multiplier: 1.25 },
  ],
  layLow: { id: 'A7', risk: -10 },
  idle: 'D8',
  knowledge: { max: 5, bonusAttacks: ['A3', 'A4'], bonusCap: 3, gainAttacks: ['A1'], reduceDefenders: ['D5', 'D7'] },
  compromiseScale: 3,
  repair: { D2: 4 },
  noisyFailureRisk: 5,
  settings: { attacker: { normal: { rounds: 20, budget: 24, riskScale: 1, threshold: 40 } } },
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function newGame(s: Settings): GameState {
  return { round: 1, compromise: 0, risk: 0, knowledge: 0, budget: s.budget, winner: null, reason: null };
}
export function affordable(arena: Arena, budget: number): string[] {
  return arena.defenders.filter((d) => d.cost <= budget).map((d) => d.id);
}
export function riskMultiplier(arena: Arena, attack: string, defense: string): number {
  if (attack === arena.layLow.id) return 1;
  const m = arena.riskMultipliers.find((r) => r.defender === defense && (r.attackers === 'any' || r.attackers.includes(attack)));
  return m ? m.multiplier : 1;
}

export function resolveRound(arena: Arena, st: Settings, s: GameState, attack: string, picked: string, rng: Rng) {
  const ai = arena.attackers.findIndex((a) => a.id === attack);
  let defense = picked;
  if (s.budget < arena.defenders.find((d) => d.id === defense)!.cost) defense = arena.idle;
  const di = arena.defenders.findIndex((d) => d.id === defense);
  const budget = s.budget - arena.defenders[di]!.cost;
  let P = arena.payoff[ai]![di]!;
  if (arena.knowledge.bonusAttacks.includes(attack) && P > 0) P += Math.min(s.knowledge, arena.knowledge.bonusCap);
  const compromise = clamp(s.compromise + Math.max(P, 0) * arena.compromiseScale - (arena.repair[defense] ?? 0), 0, 100);
  let knowledge = s.knowledge;
  if (arena.knowledge.gainAttacks.includes(attack) && P > 0) knowledge += 1;
  if (arena.knowledge.reduceDefenders.includes(defense)) knowledge -= 1;
  knowledge = clamp(knowledge, 0, arena.knowledge.max);
  let d: number;
  if (attack === arena.layLow.id) d = arena.layLow.counteredBy?.[defense] ?? arena.layLow.risk;
  else d = (arena.attackers[ai]!.baseRisk * riskMultiplier(arena, attack, defense) + (P <= 0 ? arena.noisyFailureRisk : 0)) * st.riskScale;
  const risk = clamp(s.risk + d, 0, 100);
  let caught = false;
  if (risk >= st.threshold) caught = rng() < (risk - st.threshold) / (100 - st.threshold) || risk >= 100;
  let winner: GameState['winner'] = null, reason: GameState['reason'] = null;
  if (compromise >= 100) [winner, reason] = ['attacker', 'breach'];
  else if (caught) [winner, reason] = ['defender', 'caught'];
  else if (s.round >= st.rounds) [winner, reason] = ['defender', 'timeout'];
  return {
    state: { round: s.round + 1, compromise, risk, knowledge, budget, winner, reason } as GameState,
    result: { round: s.round, defense, defensePicked: picked },
  };
}
