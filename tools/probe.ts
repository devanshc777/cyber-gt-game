// Rubric probe for v1 (frozen engine in tools/v1). Evidence for docs/RUBRIC-REVIEW.md s1 and s3.
// How does a rubric play under s8 CPUs and simple fixed policies?
// Run: npx vite-node tools/probe.ts
import { website, newGame, resolveRound, affordable, riskMultiplier, type Arena, type GameState, type Settings } from './v1/engine';
import { makeRng, type Rng } from '../src/engine/rng';
import { solveZeroSum } from '../src/engine/lp';

type Policy = (s: GameState, rng: Rng) => string;
const pick = (ids: string[], w: number[], rng: Rng) => {
  let r = rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]!) < 0) return ids[i]!;
  return ids[ids.length - 1]!;
};

function policies(arena: Arena, st: Settings) {
  const A = arena.attackers.map((a) => a.id);
  const riskDelta = (ai: number, di: number) => {
    const a = arena.attackers[ai]!;
    if (a.id === arena.layLow.id) return arena.layLow.risk;
    const P = arena.payoff[ai]![di]!;
    return (a.baseRisk * riskMultiplier(arena, a.id, arena.defenders[di]!.id) + (P <= 0 ? arena.noisyFailureRisk : 0)) * st.riskScale;
  };
  const nashAtt: Policy = (s, r) => {
    const lam = 0.1 + s.risk / 200;
    const M = arena.payoff.map((row, ai) => row.map((P, di) => {
      const bonus = arena.knowledge.bonusAttacks.includes(A[ai]!) && P > 0 ? Math.min(s.knowledge, arena.knowledge.bonusCap) : 0;
      const d = Math.min(100, Math.max(0, s.risk + riskDelta(ai, di))) - s.risk;
      return P + bonus - lam * d;
    }));
    return pick(A, solveZeroSum(M).row, r);
  };
  const nashDef: Policy = (s, r) => {
    const ok = affordable(arena, s.budget);
    const mu = 1 + (st.budget - s.budget) / st.budget;
    const cols = arena.defenders.map((d, di) => ({ d, di })).filter(({ d }) => ok.includes(d.id));
    const T = cols.map(({ d, di }) => arena.payoff.map((row) => -row[di]! - d.cost * mu));
    return pick(cols.map((c) => c.d.id), solveZeroSum(T).row, r);
  };
  const attackers: Record<string, Policy> = {
    random: (_s, r) => pick(A, A.map(() => 1), r),
    nashS8: nashAtt,
    alwaysPhish: () => 'A6',
    alwaysSQLi: () => 'A4',
    phishCautious: (s) => (s.risk >= st.threshold - 15 ? 'A7' : 'A6'),
    sqliCautious: (s) => (s.risk >= st.threshold - 15 ? 'A7' : 'A4'),
  };
  const defenders: Record<string, Policy> = {
    random: (s, r) => { const ok = affordable(arena, s.budget); return pick(ok, ok.map(() => 1), r); },
    nashS8: nashDef,
    alwaysIDS: () => 'D1',
    alwaysTraining: () => 'D6',
    alwaysWAF: () => 'D2',
  };
  return { attackers, defenders };
}

function play(arena: Arena, att: Policy, def: Policy, st: Settings, seed: number) {
  const rng = makeRng(seed);
  let s = newGame(st);
  const counts: Record<string, number> = {};
  while (!s.winner) {
    const a = att(s, rng), d = def(s, rng);
    const out = resolveRound(arena, st, s, a, d, rng);
    counts[a] = (counts[a] ?? 0) + 1;
    counts[out.result.defense] = (counts[out.result.defense] ?? 0) + 1;
    s = out.state;
  }
  return { s, counts };
}

export function report(name: string, arena: Arena, N = 2000) {
  const st = arena.settings.attacker.normal;
  const { attackers, defenders } = policies(arena, st);
  console.log(`\n== ${name} (Normal). cell = attacker win% [caught%/timeout%] mean rounds, N=${N}`);
  console.log(''.padEnd(14) + Object.keys(defenders).map((d) => d.padEnd(22)).join(''));
  for (const [an, ap] of Object.entries(attackers)) {
    let line = an.padEnd(14);
    for (const [dn, dp] of Object.entries(defenders)) {
      let win = 0, caught = 0, rounds = 0;
      const counts: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const g = play(arena, ap, dp, st, i + 1);
        if (g.s.reason === 'breach') win++; else if (g.s.reason === 'caught') caught++;
        rounds += g.s.round - 1;
        if (an === 'nashS8' && dn === 'nashS8') for (const [k, v] of Object.entries(g.counts)) counts[k] = (counts[k] ?? 0) + v;
      }
      line += `${((100 * win) / N).toFixed(0)}% [${((100 * caught) / N).toFixed(0)}/${((100 * (N - win - caught)) / N).toFixed(0)}] ${(rounds / N).toFixed(1)}r`.padEnd(22);
      if (an === 'nashS8' && dn === 'nashS8') {
        const tot = rounds;
        (globalThis as any).mix = Object.entries(counts).map(([k, v]) => `${k} ${((100 * v) / tot).toFixed(0)}%`).join(' ');
      }
    }
    console.log(line);
  }
  console.log('Nash vs Nash action share:', (globalThis as any).mix);
}

const variant = (patch: (a: Arena) => void): Arena => {
  const a = structuredClone(website);
  patch(a);
  return a;
};

report('v1 as written', website);
report('v1 tuned: IDS cost 2, IDS x1.4, compromise x5', variant((a) => {
  a.defenders[0]!.cost = 2;
  a.riskMultipliers[0]!.multiplier = 1.4;
  a.compromiseScale = 5;
}));
report('v1 tuned: + threshold 50', variant((a) => {
  a.defenders[0]!.cost = 2;
  a.riskMultipliers[0]!.multiplier = 1.4;
  a.compromiseScale = 5;
  a.settings.attacker.normal.threshold = 50;
}));
report('v1.5: tuned + Self-Audit counters Lay Low (risk +5 instead of -10)', variant((a) => {
  a.defenders[0]!.cost = 2;
  a.riskMultipliers[0]!.multiplier = 1.4;
  a.compromiseScale = 5;
  a.layLow.counteredBy = { D7: 5 };
}));
