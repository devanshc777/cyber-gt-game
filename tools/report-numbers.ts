// Writes report/NUMBERS.md from public/data/sim.json: every number the report quotes, in one place, never typed by hand.
// Run: npx vite-node tools/report-numbers.ts  (after any npm run sim)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const sim = JSON.parse(readFileSync('public/data/sim.json', 'utf8'));
const name = (id: string) => sim.names[id] ?? id;
const pct = (x: number) => `${Math.round(x * 1000) / 10}%`;
const row = (cells: (string | number)[]) => `| ${cells.join(' | ')} |`;
const table = (head: string[], rows: (string | number)[][]) => [row(head), row(head.map(() => '---')), ...rows.map(row)].join('\n');
const cell = (a: string, d: string) => sim.grid.find((b: any) => b.attacker === a && b.defender === d);
const kinds: string[] = [...new Set<string>(sim.grid.map((b: any) => b.attacker))];
const nn = cell('nash', 'nash');

const md = [
  '# Report numbers',
  '',
  `Generated from \`public/data/sim.json\` (seed ${sim.seed}, ${sim.games.toLocaleString()} games per batch) by \`tools/report-numbers.ts\`. Do not edit by hand: rerun the sim, then this script.`,
  '',
  '## Stage games (one round, zero-sum, no costs)',
  ...sim.stage.flatMap((s: any) => [
    '',
    `**${s.phase}**: value ${s.value} to the attacker.`,
    '',
    table(['', 'equilibrium mix'], [
      ['attacker', s.rows.map((r: string, i: number) => [r, s.attackerMix[i]] as const).filter(([, p]: any) => p > 0).map(([r, p]: any) => `${name(r)} ${pct(p)}`).join(', ')],
      ['defender', s.cols.map((c: string, i: number) => [c, s.defenderMix[i]] as const).filter(([, p]: any) => p > 0).map(([c, p]: any) => `${name(c)} ${pct(p)}`).join(', ')],
    ]),
  ]),
  '',
  '## CPU vs CPU, attacker win % at Normal',
  '',
  table(['attacker (row) / defender (col)', ...kinds], kinds.map((a) => [a, ...kinds.map((d) => cell(a, d).attackerWin)])),
  '',
  '## Hard vs Hard (Nash vs Nash)',
  '',
  table(['measure', 'value'], [
    ['attacker breach', `${nn.attackerWin}%`], ['caught', `${nn.caught}%`], ['defender survives 20', `${nn.timeout}%`],
    ['mean rounds', nn.meanRounds], ['games with a breach', `${nn.breachedGames}%`], ['mean first breach round', nn.meanFirstBreachRound],
    ['evictions per game', nn.evictionsPerGame], ['defender ran out of budget', `${nn.defenderBrokePct}%`],
  ]),
  '',
  table(['attacker move', 'share'], Object.entries(nn.attackShare as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([k, v]) => [name(k), `${v}%`])),
  '',
  table(['defender move', 'share'], Object.entries(nn.defenseShare as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([k, v]) => [name(k), `${v}%`])),
  '',
  '## Difficulty ladder (Nash CPU as the player)',
  '',
  table(['player side', 'level', 'player win %', 'settings'], sim.ladder.map((b: any) => [
    b.role, b.difficulty, b.role === 'attacker' ? b.attackerWin : Math.round((100 - b.attackerWin) * 100) / 100,
    Object.entries(b.settings).map(([k, v]) => `${k} ${v}`).join(', '),
  ])),
  '',
  '## Exploitability: fixed plans vs adaptive CPUs (attacker win %)',
  '',
  table(['fixed attacker plan', ...sim.exploit.cpus], sim.exploit.attackerPlans.map((p: any) => [p.plan, ...p.vs])),
  '',
  table(['fixed defender plan', ...sim.exploit.cpus], sim.exploit.defenderPlans.map((p: any) => [p.plan, ...p.vs])),
  '',
].join('\n');

mkdirSync('report', { recursive: true });
writeFileSync('report/NUMBERS.md', md);
console.log('report/NUMBERS.md', md.length, 'chars');
