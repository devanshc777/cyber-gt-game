// Simulation runner, spec s10. Writes public/data/sim.json, which the analysis page reads.
// Run: npm run sim -- --seed 1 --games 10000
// Same seed and games => byte-identical JSON (verification recipe step 3).
import { writeFileSync, mkdirSync } from 'node:fs';
import { website as arena } from '../src/engine/arenas/website';
import { attackerOptions } from '../src/engine/engine';
import { makeRng } from '../src/engine/rng';
import { makeAttackerCpu, makeDefenderCpu, type AttackerCpu, type CpuKind, type DefenderCpu } from '../src/engine/cpu';
import { fixedAttackers, fixedDefenders } from './plans';
import { playMatch } from '../src/engine/match';
import { solveZeroSum } from '../src/engine/lp';
import type { Difficulty, Settings } from '../src/engine/types';

const arg = (name: string, dflt: number) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : dflt;
};
const seed = arg('seed', 1);
const games = arg('games', 2000);
const out = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1]! : 'public/data/sim.json';

const round2 = (x: number) => Math.round(x * 100) / 100;
const pct = (x: number, n: number) => round2((100 * x) / n);

function batch(label: string, st: Settings, att: CpuKind, def: CpuKind, index: number) {
  const rng = makeRng((seed * 7919 + index * 104729) >>> 0);
  const A = makeAttackerCpu(att, arena, st);
  const D = makeDefenderCpu(def, arena, st);
  let breach = 0, caught = 0, timeout = 0, rounds = 0, finalC = 0, finalR = 0, broke = 0, evictions = 0;
  let breached = 0, firstBreach = 0;
  const attackCount: Record<string, number> = {};
  const defenseCount: Record<string, number> = {};
  const lengths = new Array<number>(st.rounds + 1).fill(0);
  for (let g = 0; g < games; g++) {
    const { final, history } = playMatch(arena, st, A, D, rng);
    if (final.reason === 'breach') breach++;
    else if (final.reason === 'caught') caught++;
    else timeout++;
    rounds += history.length;
    lengths[history.length]!++;
    finalC += final.compromise;
    finalR += final.risk;
    if (history.some((r) => r.defense !== r.defensePicked) || final.budget < 1) broke++;
    evictions += history.filter((r) => r.hunt === 'evicted').length;
    const fb = history.find((r) => r.breached);
    if (fb) { breached++; firstBreach += fb.round; }
    for (const r of history) {
      attackCount[r.attack] = (attackCount[r.attack] ?? 0) + 1;
      defenseCount[r.defense] = (defenseCount[r.defense] ?? 0) + 1;
    }
  }
  const share = (c: Record<string, number>) => Object.fromEntries(Object.entries(c).sort().map(([k, v]) => [k, pct(v, rounds)]));
  return {
    label, attacker: att, defender: def, settings: st, games,
    attackerWin: pct(breach, games), caught: pct(caught, games), timeout: pct(timeout, games),
    meanRounds: round2(rounds / games), lengthHistogram: lengths,
    meanFinalC: round2(finalC / games), meanFinalR: round2(finalR / games),
    breachedGames: pct(breached, games), meanFirstBreachRound: breached ? round2(firstBreach / breached) : null,
    evictionsPerGame: round2(evictions / games), defenderBrokePct: pct(broke, games),
    attackShare: share(attackCount), defenseShare: share(defenseCount),
  };
}

const kinds: CpuKind[] = ['random', 'easy', 'greedy', 'nash', 'trained'];
const cpuFor: Record<Difficulty, CpuKind> = { easy: 'easy', normal: 'greedy', hard: 'nash' };
const normal = arena.settings.attacker.normal;

let index = 0;
const t0 = Date.now();
// s10.2 pairings, plus the full CPU grid at Normal.
const grid = kinds.flatMap((a) => kinds.map((d) => batch(`${a} vs ${d}`, normal, a, d, index++)));
// Difficulty ladder: the Nash CPU stands in for a strong player against each difficulty's CPU and settings.
const ladder = (['easy', 'normal', 'hard'] as Difficulty[]).flatMap((diff) => [
  { role: 'attacker', difficulty: diff, ...batch(`player-attacker ${diff}`, arena.settings.attacker[diff], 'nash', cpuFor[diff], index++) },
  { role: 'defender', difficulty: diff, ...batch(`player-defender ${diff}`, arena.settings.defender[diff], cpuFor[diff], 'nash', index++) },
]).concat([
  // The learned tier plays on Normal rules, the settings it was trained on.
  { role: 'attacker', difficulty: 'learned' as Difficulty, ...batch('player-attacker learned', normal, 'nash', 'trained', index++) },
  { role: 'defender', difficulty: 'learned' as Difficulty, ...batch('player-defender learned', normal, 'trained', 'nash', index++) },
]);

// Exploitability: fixed plans against each adaptive CPU (attacker win %), a quarter of the games per cell.
const probeCpus: CpuKind[] = ['greedy', 'nash', 'trained'];
const probe = (att: AttackerCpu, def: DefenderCpu, i: number) => {
  const rng = makeRng((seed * 31337 + i * 7907) >>> 0);
  const n = Math.max(1, Math.floor(games / 4));
  let w = 0;
  for (let g = 0; g < n; g++) if (playMatch(arena, normal, att, def, rng).final.winner === 'attacker') w++;
  return pct(w, n);
};
let p = 0;
const exploit = {
  cpus: probeCpus,
  attackerPlans: Object.entries(fixedAttackers(normal)).map(([plan, f]) => ({
    plan, vs: probeCpus.map((k) => probe(f, makeDefenderCpu(k, arena, normal), p++)),
  })),
  defenderPlans: Object.entries(fixedDefenders()).map(([plan, f]) => ({
    plan, vs: probeCpus.map((k) => probe(makeAttackerCpu(k, arena, normal), f, p++)),
  })),
};

const stage = (['outside', 'inside'] as const).map((phase) => {
  const rows = attackerOptions(arena, phase);
  const M = rows.map((a) => arena.payoff[phase][a]!);
  const s = solveZeroSum(M);
  return {
    phase, rows, cols: arena.defenders.map((d) => d.id), matrix: M,
    value: round2(s.value), attackerMix: s.row.map((x) => Math.round(x * 1e4) / 1e4), defenderMix: s.col.map((x) => Math.round(x * 1e4) / 1e4),
  };
});

const result = {
  seed, games, arena: arena.id,
  names: Object.fromEntries([...arena.attackers, ...arena.defenders].map((x) => [x.id, x.name])),
  stage, grid, ladder, exploit,
};
mkdirSync(out.replace(/[^/]+$/, ''), { recursive: true });
writeFileSync(out, JSON.stringify(result, null, 1) + '\n');
console.error(`wrote ${out}: ${grid.length + ladder.length} batches x ${games} games in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
const nn = grid.find((b) => b.label === 'nash vs nash')!;
console.error(`nash vs nash: attacker ${nn.attackerWin}% (caught ${nn.caught}%, timeout ${nn.timeout}%), ${nn.meanRounds} rounds`);
console.error('nash attack share', nn.attackShare, '\nnash defense share', nn.defenseShare);
for (const l of ladder) console.error(`ladder ${l.role} ${l.difficulty}: player-proxy win ${l.role === 'attacker' ? l.attackerWin : round2(100 - l.attackerWin)}%  ${l.meanRounds}r`);
