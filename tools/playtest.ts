// Newbie playtest + arithmetic audit. Run: npx vite-node tools/playtest.ts [games]
// 1. Audit: every round of every match is recomputed from spec s5 by an independent re-implementation below
//    (only the payoff/cost tables are shared) and must match the engine's next state exactly.
// 2. Newbie: how a player with no strategy (random legal moves) and a player who follows the in-game tips do
//    against the Easy and Normal CPUs, as attacker and as defender.
import { website as arena } from '../src/engine/arenas/website';
import { affordable, attackerOptions, newGame, resolveRound } from '../src/engine/engine';
import { attackerView, defenderView, insideBelief, makeAttackerCpu, makeDefenderCpu, type CpuKind } from '../src/engine/cpu';
import { makeRng, type Rng } from '../src/engine/rng';
import type { GameState, Role, RoundResult, Settings } from '../src/engine/types';

const games = Number(process.argv[2] ?? 2000);
const DEF = arena.defenders.map((d) => d.id);
const cost = (d: string) => arena.defenders.find((x) => x.id === d)!.cost;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const pick = <T>(xs: T[], rng: Rng) => xs[Math.floor(rng() * xs.length)]!;

// --- spec s5, written out again from the document, step by step ---
const BASE_RISK: Record<string, number> = { A1: 6, A3: 15, A4: 10, A5: 18, A6: 7, A2: 4, A8: 8, A9: 5 };
function mult(a: string, d: string) {
  if (d === 'D1') return 1.5;
  if (d === 'D3' && (a === 'A3' || a === 'A5')) return 1.25;
  if (d === 'D5' && (a === 'A1' || a === 'A5' || a === 'A8')) return 1.25;
  return 1;
}
function expect(st: Settings, s: GameState, r: RoundResult) {
  const out = s.phase === 'outside';
  const d = cost(r.defensePicked) > s.budget ? 'D8' : r.defensePicked; // step 2
  let P = arena.payoff[s.phase][r.attack]![DEF.indexOf(d)]!; // step 3
  if (['A3', 'A4', 'A8'].includes(r.attack) && P > 0) P += Math.min(s.knowledge, 3); // step 4
  let phase = s.phase, C = s.compromise, bd = s.backdoor, evicted = false, hit = false;
  if (out) { if (r.breached) phase = 'inside'; } // the breach roll is random: take the engine's outcome, check its odds below
  else if (d === 'D7' && r.attack !== 'A7') {
    hit = true;
    if (bd && r.attack !== 'A9') bd = false;
    else { evicted = true; phase = 'outside'; bd = false; }
  }
  if (!hit) {
    if (out && r.attack === 'A5' && P > 0) C += P * 2;
    if (!out && r.attack === 'A8' && P > 0) C += P * 5;
    if (!out && r.attack === 'A9') bd = true;
  }
  C = clamp(C, 0, 100);
  let K = s.knowledge; // step 6
  if (!hit && ((out && r.attack === 'A1') || (!out && r.attack === 'A2')) && P > 0) K += 1;
  if (out && (d === 'D5' || d === 'D7')) K -= 1;
  if (evicted) K -= 1;
  K = clamp(K, 0, 5);
  let dR: number; // step 7
  if (r.attack === 'A7') dR = -10;
  else { dR = BASE_RISK[r.attack]! * mult(r.attack, d); if (P <= 0) dR += 5; if (evicted) dR += 10; dR *= st.riskScale; }
  const R = clamp(s.risk + dR, 0, 100);
  const chance = R >= st.threshold ? (R - st.threshold) / (100 - st.threshold) : 0; // step 8
  const canBreach = out && ['A3', 'A4', 'A6'].includes(r.attack) && P > 0;
  return { d, P, phase, C, bd, K, R, chance, canBreach, budget: s.budget - cost(d) };
}

let rounds = 0;
const errors: string[] = [];
function audit(st: Settings, s: GameState, r: RoundResult, n: GameState) {
  rounds++;
  const e = expect(st, s, r);
  const bad: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  if (r.defense !== e.d) bad.push(`defense ${r.defense} vs ${e.d}`);
  if (r.payoff !== e.P) bad.push(`payoff ${r.payoff} vs ${e.P}`);
  if (r.breached && !e.canBreach) bad.push('breached when it could not');
  if (n.phase !== e.phase) bad.push(`phase ${n.phase} vs ${e.phase}`);
  if (!near(n.compromise, e.C)) bad.push(`C ${n.compromise} vs ${e.C}`);
  if (n.backdoor !== e.bd) bad.push(`backdoor ${n.backdoor} vs ${e.bd}`);
  if (n.knowledge !== e.K) bad.push(`K ${n.knowledge} vs ${e.K}`);
  if (!near(n.risk, e.R)) bad.push(`R ${n.risk} vs ${e.R}`);
  if (!near(r.caughtChance, e.chance)) bad.push(`caught chance ${r.caughtChance} vs ${e.chance}`);
  if (n.budget !== e.budget) bad.push(`budget ${n.budget} vs ${e.budget}`);
  if (n.compromise >= 100 && n.winner !== 'attacker') bad.push('C hit 100 but no attacker win');
  if (!n.winner && s.round >= st.rounds) bad.push('no timeout after the last round');
  // the next round offers exactly the moves of the new phase, and only defences the budget covers
  const opts = attackerOptions(arena, n.phase);
  if (opts.some((a) => !arena.payoff[n.phase][a])) bad.push('offered a move from the wrong phase');
  if (affordable(arena, n.budget).some((dd) => cost(dd) > n.budget)) bad.push('offered an unaffordable defence');
  if (bad.length && errors.length < 10) errors.push(`R${r.round} ${r.attack} vs ${r.defensePicked}: ${bad.join('; ')}`);
}

// --- players ---
type Att = (s: GameState, h: RoundResult[], rng: Rng) => string;
type Def = (s: GameState, h: RoundResult[], rng: Rng) => string;
const randomAtt: Att = (s, _h, rng) => pick(attackerOptions(arena, s.phase), rng);
const randomDef: Def = (s, _h, rng) => pick(affordable(arena, s.budget), rng);
// Does what the in-game tip says (src/ui/guide.ts tip()), picking at random where the tip names several moves.
function tipAtt(st: Settings): Att {
  return (s, h, rng) => {
    const r = h[h.length - 1], prev = h[h.length - 2];
    if (s.risk >= st.threshold - 8) return 'A7';
    if (r?.blocked && prev?.blocked && prev.attack === r.attack) return pick(attackerOptions(arena, s.phase).filter((a) => a !== r.attack && a !== 'A7'), rng);
    if (s.phase === 'outside') return s.knowledge < 2 ? 'A1' : pick(['A3', 'A4', 'A6'], rng);
    if (!s.backdoor) return 'A9';
    if (r?.attack === 'A8' && r.compromiseDelta > 0 && r.compromiseDelta <= 15 && s.knowledge < 3) return 'A2';
    return 'A8';
  };
}
const COUNTER: Record<string, string> = { A1: 'D5', A3: 'D3', A4: 'D2', A5: 'D3', A6: 'D6', A2: 'D4', A8: 'D7', A9: 'D7' };
const tipDef: Def = (s, h, rng) => {
  const r = h[h.length - 1];
  const ok = affordable(arena, s.budget);
  const want = (() => {
    if (s.budget <= 2) return 'D8';
    if (!r) return 'D1';
    if (r.attackSeen && r.attack === 'A7') return 'D8';
    if (r.attackSeen && r.phaseBefore === 'inside') return 'D7';
    if (r.attackSeen) return COUNTER[r.attack]!;
    if (r.compromiseDelta > 0) return pick(['D7', 'D4'], rng);
    if (insideBelief(defenderView(s, h)) > 0.5) return 'D7';
    return 'D1';
  })();
  return ok.includes(want) ? want : 'D8';
};

function play(role: Role, level: 'easy' | 'normal', me: Att | Def, seed: number) {
  const st = arena.settings[role][level];
  // matches the game: attacker Easy faces a random defender, defender Easy an Easy attacker
  const kind: CpuKind = level === 'normal' ? 'greedy' : role === 'attacker' ? 'random' : 'easy';
  const cpuA = makeAttackerCpu(kind, arena, st), cpuD = makeDefenderCpu(kind, arena, st);
  const rng = makeRng(seed);
  let s = newGame(st);
  const h: RoundResult[] = [];
  while (!s.winner) {
    const a = role === 'attacker' ? (me as Att)(s, h, rng) : cpuA(attackerView(s, h), rng);
    const d = role === 'defender' ? (me as Def)(s, h, rng) : cpuD(defenderView(s, h), rng);
    const out = resolveRound(arena, st, s, a, d, rng);
    audit(st, s, out.result, out.state);
    h.push(out.result);
    s = out.state;
  }
  return { won: s.winner === role, reason: s.reason!, rounds: h.length, c: s.compromise };
}

console.log(`${games} games per row\n`);
console.log('side      level   player        win%   how it ended (breach/caught/timeout)   avg rounds');
for (const role of ['attacker', 'defender'] as Role[]) {
  for (const level of ['easy', 'normal'] as const) {
    const st = arena.settings[role][level];
    const players: [string, Att | Def][] = role === 'attacker'
      ? [['random', randomAtt], ['follows tips', tipAtt(st)]]
      : [['random', randomDef], ['follows tips', tipDef]];
    for (const [label, p] of players) {
      let won = 0, rds = 0;
      const why = { breach: 0, caught: 0, timeout: 0 };
      for (let g = 0; g < games; g++) {
        const m = play(role, level, p, 1000 + g);
        won += +m.won; rds += m.rounds; why[m.reason as keyof typeof why]++;
      }
      const pc = (x: number) => `${Math.round((100 * x) / games)}`.padStart(3);
      console.log(`${role.padEnd(9)} ${level.padEnd(7)} ${label.padEnd(13)} ${pc(won)}%   ${pc(why.breach)} / ${pc(why.caught)} / ${pc(why.timeout)}                     ${(rds / games).toFixed(1)}`);
    }
  }
}
console.log(`\naudit: ${rounds.toLocaleString()} rounds re-derived from spec s5, ${errors.length ? 'MISMATCHES:' : 'all match'}`);
errors.forEach((e) => console.log('  ' + e));
