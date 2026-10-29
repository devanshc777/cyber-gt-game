// Trains the "learned" CPU tier by regret matching in self-play (Hart & Mas-Colell 2000).
// Both sides learn at once, one regret table per coarse state bucket. After each round every action the side
// could have played is scored against what the opponent actually did (the shared cell value, spec s8), and
// regret accumulates for the ones that would have done better. The average strategy is what ships.
// Run: npx vite-node tools/train.ts [games] [seed]   -> src/engine/trained-policy.json
import { writeFileSync } from 'node:fs';
import { website as arena } from '../src/engine/arenas/website';
import { affordable, attackerOptions, newGame, resolveRound } from '../src/engine/engine';
import { attackerBucket, attackerView, cellValue, defenderBucket, defenderView, type Policy } from '../src/engine/cpu';
import { makeRng, type Rng } from '../src/engine/rng';
import type { RoundResult } from '../src/engine/types';

const games = Number(process.argv[2] ?? 20000);
const seed = Number(process.argv[3] ?? 1);
const st = arena.settings.attacker.normal;
const rng = makeRng(seed);

type Table = Record<string, Record<string, number>>;
const regret = { attacker: {} as Table, defender: {} as Table };
const sum = { attacker: {} as Table, defender: {} as Table };

function strategy(t: Table, bucket: string, legal: string[]): number[] {
  const r = (t[bucket] ??= {});
  const pos = legal.map((a) => Math.max(0, r[a] ?? 0));
  const total = pos.reduce((x, y) => x + y, 0);
  return total > 0 ? pos.map((x) => x / total) : legal.map(() => 1 / legal.length);
}

function draw(ids: string[], w: number[], r: Rng): string {
  let x = r();
  for (let i = 0; i < ids.length; i++) if ((x -= w[i]!) < 0) return ids[i]!;
  return ids[ids.length - 1]!;
}

for (let g = 0; g < games; g++) {
  let s = newGame(st);
  const hist: RoundResult[] = [];
  while (!s.winner) {
    const av = attackerView(s, hist), dv = defenderView(s, hist);
    const ab = attackerBucket(av, st), db = defenderBucket(dv, st);
    const aLegal = attackerOptions(arena, s.phase), dLegal = affordable(arena, s.budget);
    const aMix = strategy(regret.attacker, ab, aLegal), dMix = strategy(regret.defender, db, dLegal);
    const a = draw(aLegal, aMix, rng), d = draw(dLegal, dMix, rng);

    // Accumulate the average strategy, then the regrets against the realised opponent move.
    const sa = (sum.attacker[ab] ??= {}), sd = (sum.defender[db] ??= {});
    aLegal.forEach((x, i) => (sa[x] = (sa[x] ?? 0) + aMix[i]!));
    dLegal.forEach((x, i) => (sd[x] = (sd[x] ?? 0) + dMix[i]!));
    const e = { round: s.round, compromise: s.compromise, risk: s.risk, knowledge: s.knowledge, backdoor: s.backdoor, budget: s.budget };
    const di = (id: string) => arena.defenders.findIndex((x) => x.id === id);
    const va = (x: string) => cellValue(arena, st, e, s.phase, x, di(d));
    const vd = (y: string) => -cellValue(arena, st, e, s.phase, a, di(y));
    const ra = regret.attacker[ab]!, rd = regret.defender[db]!;
    const baseA = va(a), baseD = vd(d);
    for (const x of aLegal) ra[x] = (ra[x] ?? 0) + va(x) - baseA;
    for (const y of dLegal) rd[y] = (rd[y] ?? 0) + vd(y) - baseD;

    const out = resolveRound(arena, st, s, a, d, rng);
    hist.push(out.result);
    s = out.state;
  }
}

const normalise = (t: Table): Table => Object.fromEntries(Object.entries(t).sort().map(([b, row]) => {
  const total = Object.values(row).reduce((x, y) => x + y, 0);
  return [b, Object.fromEntries(Object.entries(row).sort().map(([k, v]) => [k, Math.round((v / total) * 1e4) / 1e4]))];
}));
const policy: Policy = { games, attacker: normalise(sum.attacker), defender: normalise(sum.defender) };
writeFileSync('src/engine/trained-policy.json', JSON.stringify(policy, null, 1) + '\n');
console.error(`trained on ${games} self-play games: ${Object.keys(policy.attacker).length} attacker buckets, ${Object.keys(policy.defender).length} defender buckets`);
