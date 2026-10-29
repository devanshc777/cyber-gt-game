// Throwaway probe for the "kill chain" rubric candidate (v2). Self-contained on purpose:
// the real engine gets rewritten only after Devansh picks a rubric.
// Run: npx vite-node tools/probe2.ts
import { makeRng, type Rng } from '../src/engine/rng';
import { solveZeroSum } from '../src/engine/lp';

const D = ['IDS', 'WAF', 'RateLim', 'Encrypt', 'Firewall', 'Training', 'Hunt', 'Idle'];
const COST = [2, 2, 1, 2, 1, 2, 2, 0];
// OUT phase: his original rows. IN phase: post-breach rows.
const OUT = {
  ids: ['Scan', 'Brute', 'SQLi', 'DoS', 'Phish', 'LayLow'],
  risk: [6, 15, 10, 18, 7, -10],
  P: [
    [-2, 1, 1, 1, -2, 2, -1, 2],
    [-3, 3, -4, 3, 0, 4, 1, 5],
    [2, -5, 6, 6, 3, 6, 2, 8],
    [1, 3, -2, 4, -2, 4, 2, 5],
    [2, 5, 5, 5, 5, -4, 4, 6],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
};
const IN = {
  ids: ['Sniff', 'Exfil', 'Persist', 'LayLow'],
  risk: [4, 8, 5, -10],
  P: [
    [1, 3, 3, -3, 1, 3, 0, 4],
    [2, 5, 5, 2, 2, 5, -3, 6],
    [0, 0, 0, 0, 0, 0, -2, 0],
    [0, 0, 0, 0, 0, 0, 0, 0],
  ],
};
const MULT = (a: string, d: string) =>
  a === 'LayLow' ? 1 : d === 'IDS' ? 1.5 :
  d === 'RateLim' && (a === 'Brute' || a === 'DoS') ? 1.25 :
  d === 'Firewall' && (a === 'Scan' || a === 'DoS' || a === 'Exfil') ? 1.25 : 1;

interface Cfg { budget: number; threshold: number; rounds: number; exfilScale: number; dosScale: number; breachDiv: number }
interface S { t: number; B: number; R: number; K: number; inside: boolean; token: boolean; Dmg: number; seenInside: boolean; lastDmg: number }
type Pol = (s: S, rng: Rng) => string;

function step(c: Cfg, s: S, a: string, dPick: string, rng: Rng): { s: S; end: null | 'breach' | 'caught' | 'timeout' } {
  let d = dPick;
  if (COST[D.indexOf(d)]! > s.B) d = 'Idle';
  const di = D.indexOf(d);
  const n: S = { ...s, B: s.B - COST[di]!, lastDmg: 0 };
  const tbl = s.inside ? IN : OUT;
  const ai = tbl.ids.indexOf(a);
  if (ai < 0) throw new Error(`${a} not available ${s.inside ? 'inside' : 'outside'}`);
  let P = tbl.P[ai]![di]!;
  if ((a === 'Brute' || a === 'SQLi' || a === 'Exfil') && P > 0) P += Math.min(s.K, 3);
  let risk = a === 'LayLow' ? -10 : tbl.risk[ai]! * MULT(a, d) + (P <= 0 ? 5 : 0);

  if (!s.inside) {
    if (a === 'Scan' && P > 0) n.K = Math.min(3, n.K + 1);
    if ((d === 'Firewall' || d === 'Hunt') && n.K > 0) n.K -= 1;
    if (a === 'DoS' && P > 0) n.Dmg += P * c.dosScale;
    if ((a === 'Brute' || a === 'SQLi' || a === 'Phish') && P > 0 && rng() < Math.min(0.9, P / c.breachDiv)) n.inside = true;
  } else {
    if (d === 'Hunt' && a !== 'LayLow') {
      if (s.token && a !== 'Persist') n.token = false;
      else { n.inside = false; n.token = false; n.K = Math.max(0, n.K - 1); risk += 10; }
    } else {
      if (a === 'Exfil' && P > 0) n.Dmg += P * c.exfilScale;
      if (a === 'Sniff' && P > 0) n.K = Math.min(3, n.K + 1);
      if (a === 'Persist') n.token = true;
    }
  }
  n.lastDmg = n.Dmg - s.Dmg;
  if (d === 'IDS' || (d === 'Hunt' && s.inside && a !== 'LayLow')) n.seenInside = s.inside;
  if (n.lastDmg > 0 && s.inside) n.seenInside = true;
  if (!n.inside && s.inside) n.seenInside = false;
  n.R = Math.min(100, Math.max(0, s.R + risk));
  n.Dmg = Math.min(100, n.Dmg);
  n.t = s.t + 1;
  if (n.Dmg >= 100) return { s: n, end: 'breach' };
  if (n.R >= c.threshold && rng() < (n.R - c.threshold) / (100 - c.threshold)) return { s: n, end: 'caught' };
  if (s.t >= c.rounds) return { s: n, end: 'timeout' };
  return { s: n, end: null };
}

const pick = (ids: string[], w: number[], rng: Rng) => {
  let r = rng() * w.reduce((x, y) => x + y, 0);
  for (let i = 0; i < ids.length; i++) if ((r -= w[i]!) < 0) return ids[i]!;
  return ids[ids.length - 1]!;
};

function policies(c: Cfg) {
  // LP CPUs value progress in damage terms with a risk weight that bites near the threshold.
  // Breaching is worth a fixed continuation value; a crude stand-in for real lookahead.
  const V_IN = 25;
  const KAPPA = 3; // one budget point burned is worth 3 damage to the attacker: keeps each stage game zero-sum
  const w = (s: S) => 0.05 + 1.5 * (s.R / c.threshold) ** 2;
  const attValue = (s: S, inside: boolean, ai: number, di: number) => {
    const tbl = inside ? IN : OUT;
    const a = tbl.ids[ai]!;
    let P = tbl.P[ai]![di]!;
    if ((a === 'Brute' || a === 'SQLi' || a === 'Exfil') && P > 0) P += Math.min(s.K, 3);
    const risk = a === 'LayLow' ? -10 : tbl.risk[ai]! * MULT(a, D[di]!) + (P <= 0 ? 5 : 0);
    let gain = 0;
    if (!inside) {
      if (a === 'Scan' && P > 0) gain = 3;
      if (a === 'DoS' && P > 0) gain = P * c.dosScale;
      if ((a === 'Brute' || a === 'SQLi' || a === 'Phish') && P > 0) gain = Math.min(0.9, P / c.breachDiv) * V_IN;
    } else {
      const hunted = D[di] === 'Hunt' && a !== 'LayLow';
      if (hunted) gain = s.token && a !== 'Persist' ? -2 : -V_IN;
      else if (a === 'Exfil' && P > 0) gain = P * c.exfilScale;
      else if (a === 'Sniff' && P > 0) gain = 4;
      else if (a === 'Persist' && !s.token) gain = 5;
    }
    const riskEff = Math.min(100, Math.max(0, s.R + risk)) - s.R;
    return gain - w(s) * riskEff + KAPPA * COST[di]!;
  };
  const nashAtt: Pol = (s, r) => {
    const tbl = s.inside ? IN : OUT;
    const M = tbl.ids.map((_, ai) => D.map((_, di) => attValue(s, s.inside, ai, di)));
    return pick(tbl.ids, solveZeroSum(M).row, r);
  };
  // Defender does not see the phase: it believes "inside" from evidence (damage rising, IDS, hunt).
  const nashDef: Pol = (s, r) => {
    const ok = D.map((_, i) => i).filter((i) => COST[i]! <= s.B);
    const mu = 1 + (c.budget - s.B) / c.budget;
    const inside = s.seenInside;
    const tbl = inside ? IN : OUT;
    const T = ok.map((di) => tbl.ids.map((_, ai) => -attValue(s, inside, ai, di) - COST[di]! * (mu - 1) * 3));
    return pick(ok.map((i) => D[i]!), solveZeroSum(T).row, r);
  };
  const att: Record<string, Pol> = {
    random: (s, r) => { const ids = (s.inside ? IN : OUT).ids; return pick(ids, ids.map(() => 1), r); },
    nashLP: nashAtt,
    phishThenExfil: (s) => (s.inside ? 'Exfil' : 'Phish'),
    cautious: (s) => (s.R >= c.threshold - 15 ? 'LayLow' : s.inside ? 'Exfil' : 'Phish'),
    sqliCautious: (s) => (s.R >= c.threshold - 15 ? 'LayLow' : s.inside ? 'Exfil' : 'SQLi'),
    persistFirst: (s) => (s.R >= c.threshold - 15 ? 'LayLow' : !s.inside ? 'Phish' : !s.token ? 'Persist' : 'Exfil'),
  };
  const def: Record<string, Pol> = {
    random: (s, r) => { const ok = D.filter((_, i) => COST[i]! <= s.B); return pick(ok, ok.map(() => 1), r); },
    nashLP: nashDef,
    alwaysIDS: () => 'IDS',
    alwaysHunt: () => 'Hunt',
    alwaysTraining: () => 'Training',
    trainThenHunt: (s) => (s.seenInside ? 'Hunt' : 'Training'),
  };
  return { att, def };
}

export function report(name: string, c: Cfg, N = 2000) {
  const { att, def } = policies(c);
  console.log(`\n== ${name}. cell = attacker win% [caught/timeout] rounds, N=${N}`);
  console.log(''.padEnd(15) + Object.keys(def).map((d) => d.padEnd(21)).join(''));
  let mix = '';
  for (const [an, ap] of Object.entries(att)) {
    let line = an.padEnd(15);
    for (const [dn, dp] of Object.entries(def)) {
      let win = 0, caught = 0, rounds = 0;
      const counts: Record<string, number> = {};
      for (let i = 0; i < N; i++) {
        const rng = makeRng(i + 1);
        let s: S = { t: 1, B: c.budget, R: 0, K: 0, inside: false, token: false, Dmg: 0, seenInside: false, lastDmg: 0 };
        for (;;) {
          const a = ap(s, rng), d = dp(s, rng);
          counts[a] = (counts[a] ?? 0) + 1; counts[d] = (counts[d] ?? 0) + 1;
          const o = step(c, s, a, d, rng);
          s = o.s;
          if (o.end) { if (o.end === 'breach') win++; else if (o.end === 'caught') caught++; break; }
        }
        rounds += s.t - 1;
      }
      line += `${((100 * win) / N).toFixed(0)}% [${((100 * caught) / N).toFixed(0)}/${((100 * (N - win - caught)) / N).toFixed(0)}] ${(rounds / N).toFixed(1)}r`.padEnd(21);
      if (an === 'nashLP' && dn === 'nashLP') mix = Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${((100 * v) / rounds).toFixed(0)}%`).join(' ');
    }
    console.log(line);
  }
  console.log('LP vs LP action share (each side sums to 100%):', mix);
}

const base: Cfg = { budget: 24, threshold: 40, rounds: 20, exfilScale: 5, dosScale: 2, breachDiv: 10 };
report('v2 kill chain, Normal', base);
report('v2 kill chain, threshold 50', { ...base, threshold: 50 });
