// M2 check: CPUs vs each other and vs fixed plans, on the real engine.
// Done means: no fixed plan wins over 80% against the Nash CPU, and Nash beats Random and Greedy clearly.
// Run: npx vite-node tools/eval-cpus.ts [N]
import { website as arena } from '../src/engine/arenas/website';
import { makeRng } from '../src/engine/rng';
import { makeAttackerCpu, makeDefenderCpu, type AttackerCpu, type CpuKind, type DefenderCpu } from '../src/engine/cpu';
import { fixedAttackers as fixedAttackersFor, fixedDefenders as fixedDefendersFor } from './plans';
import { playMatch } from '../src/engine/match';

const N = Number(process.argv[2] ?? 1000);
const st = arena.settings.attacker.normal;
const kinds: CpuKind[] = ['random', 'easy', 'greedy', 'nash', 'trained'];

const fixedAttackers = fixedAttackersFor(st);
const fixedDefenders = fixedDefendersFor();

function match(att: AttackerCpu, def: DefenderCpu, n = N) {
  let win = 0, rounds = 0;
  for (let i = 0; i < n; i++) {
    const { final } = playMatch(arena, st, att, def, makeRng(i + 1));
    if (final.winner === 'attacker') win++;
    rounds += final.round - 1;
  }
  return { win: (100 * win) / n, rounds: rounds / n };
}

const cell = (r: { win: number; rounds: number }) => `${r.win.toFixed(0)}% ${r.rounds.toFixed(1)}r`.padEnd(13);
const A = Object.fromEntries(kinds.map((k) => [k, makeAttackerCpu(k, arena, st)]));
const D = Object.fromEntries(kinds.map((k) => [k, makeDefenderCpu(k, arena, st)]));

console.log(`Normal, N=${N}. Cell = attacker win %, mean rounds.\n`);
console.log('CPU vs CPU (rows attacker, cols defender)');
console.log(''.padEnd(20) + kinds.map((k) => k.padEnd(13)).join(''));
for (const a of kinds) console.log(a.padEnd(20) + kinds.map((d) => cell(match(A[a]!, D[d]!))).join(''));

console.log('\nFixed attacker plans vs defender CPUs (want < 80% vs nash)');
console.log(''.padEnd(20) + kinds.map((k) => k.padEnd(13)).join(''));
for (const [name, p] of Object.entries(fixedAttackers)) console.log(name.padEnd(20) + kinds.map((d) => cell(match(p, D[d]!))).join(''));

console.log('\nAttacker CPUs vs fixed defender plans (want > 20% for nash: defender plan wins < 80%)');
console.log(''.padEnd(22) + kinds.map((k) => k.padEnd(13)).join(''));
for (const [name, p] of Object.entries(fixedDefenders)) console.log(name.padEnd(22) + kinds.map((a) => cell(match(A[a]!, p))).join(''));

console.log('\nhide from hunts vs always Hunt:', cell(match(fixedAttackers['hide from hunts']!, fixedDefenders['always Hunt']!)));
