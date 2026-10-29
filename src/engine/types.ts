// An arena is pure data: everything spec s3-s7 says about one battleground.
// A new arena is a new file shaped like this, never new engine code.

export type Role = 'attacker' | 'defender';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Phase = 'outside' | 'inside';

export interface AttackerAction {
  id: string;
  name: string;
  phase: Phase | 'both';
  baseRisk: number;
}

export interface DefenderAction {
  id: string;
  name: string;
  cost: number;
}

export interface RiskMultiplier {
  defender: string;
  attackers: string[] | 'any';
  multiplier: number;
}

export interface Settings {
  rounds: number;
  budget: number;
  riskScale: number;
  threshold: number;
}

export interface Arena {
  id: string;
  name: string;
  attackers: AttackerAction[];
  defenders: DefenderAction[];
  /** payoff[phase][attackerId][defenderIndex], attacker's damage points (s4). */
  payoff: Record<Phase, Record<string, number[]>>;
  riskMultipliers: RiskMultiplier[];
  /** The no-attack action: fixed risk change, no multipliers, no noisy failure; dodges a hunt (s5). */
  layLow: { id: string; risk: number };
  /** Forced when the defender cannot afford its pick (s5.2). */
  idle: string;
  /** Outside attacks that can breach, with chance min(P / divisor, cap) (s5.5). */
  breach: { attacks: string[]; divisor: number; cap: number };
  /** C added per point of positive P (s5.5). */
  damage: Record<string, number>;
  knowledge: {
    max: number;
    /** Attacks that add min(K, bonusCap) to a positive P (s5.4). */
    bonusAttacks: string[];
    bonusCap: number;
    /** Attacks that raise K by 1 when P > 0 (s5.6). */
    gainAttacks: string[];
    /** Defenses that lower K by 1 while the attacker is outside (s5.6). */
    reduceDefenders: string[];
  };
  /** Inside: this defense evicts an active attacker unless a backdoor absorbs it (s5.5). */
  hunt: { defender: string; evictRisk: number };
  /** Inside: this attack plants a backdoor. */
  persist: string;
  noisyFailureRisk: number;
  /** Defenses under which the defender sees the attacker's action and phase (s9). */
  detectors: string[];
  /** Settings per player role and difficulty (s7). */
  settings: Record<Role, Record<Difficulty, Settings>>;
}

export interface GameState {
  round: number;
  phase: Phase;
  compromise: number;
  risk: number;
  knowledge: number;
  backdoor: boolean;
  budget: number;
  winner: Role | null;
  reason: 'breach' | 'caught' | 'timeout' | null;
}

export type HuntResult = 'evicted' | 'backdoor-burned' | 'nothing-found';

export interface RoundResult {
  round: number;
  phaseBefore: Phase;
  attack: string;
  /** What the defender picked, and what actually ran after the budget check. */
  defensePicked: string;
  defense: string;
  payoff: number;
  breached: boolean;
  /** Set when the defender hunted while the attacker was inside. */
  hunt: HuntResult | null;
  compromiseDelta: number;
  riskDelta: number;
  knowledgeDelta: number;
  caughtChance: number;
  caught: boolean;
  /** Attacker's view: the attack was blocked (P <= 0). Null on Lay Low. */
  blocked: boolean | null;
  /** Defender's view: it saw the attacker's action and phase this round. */
  attackSeen: boolean;
}
