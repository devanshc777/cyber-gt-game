// Balance sweep (spec s10.4 knobs in order): Nash vs Nash at Normal per variant, plus the worst fixed plan.
// Run: npx vite-node tools/tune.ts [N]
import { website } from '../src/engine/arenas/website';
import { makeRng } from '../src/engine/rng';
import { makeAttackerCpu, makeDefenderCpu, type AttackerCpu, type DefenderCpu } from '../src/engine/cpu';
import { playMatch } from '../src/engine/match';
import type { Arena } from '../src/engine/types';

const N = Number(process.argv[2] ?? 400);

interface Knobs { budget: number; threshold: number; exfil: number; breachDiv: number; evictRisk: number }
const base: Knobs = { budget: 24, threshold: 40, exfil: 5, breachDiv: 10, evictRisk: 10 };

function arenaWith(k: Knobs): Arena {
  const a = structuredClone(website);
  for (const m of ['defender', 'attacker'] as const) {
    for (const d of ['easy', 'normal', 'hard'] as const) {
      const s = a.settings[m][d];
      if (m === 'attacker') s.budget = k.budget;
      else s.budget += k.budget - 24; // keep the easy/hard offsets
      s.threshold += k.threshold - 40;
    }
  }
  a.damage.A8 = k.exfil;
  a.breach.divisor = k.breachDiv;
  a.hunt.evictRisk = k.evictRisk;
  return a;
}

function run(arena: Arena, att: AttackerCpu, def: DefenderCpu, n = N) {
  const st = arena.settings.attacker.normal;
  let win = 0, rounds = 0;
  const a: Record<string, number> = {}, d: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const { final, history } = playMatch(arena, st, att, def, makeRng(i + 1));
    if (final.winner === 'attacker') win++;
    rounds += history.length;
    for (const r of history) { a[r.attack] = (a[r.attack] ?? 0) + 1; d[r.defense] = (d[r.defense] ?? 0) + 1; }
  }
  const top = (c: Record<string, number>) => Object.entries(c).sort((x, y) => y[1] - x[1])[0]!;
  const [ta, na] = top(a), [td, nd] = top(d);
  return { win: (100 * win) / n, rounds: rounds / n, topA: `${ta} ${((100 * na) / rounds).toFixed(0)}%`, topD: `${td} ${((100 * nd) / rounds).toFixed(0)}%` };
}

export function evaluate(k: Knobs) {
  const arena = arenaWith(k);
  const st = arena.settings.attacker.normal;
  const A = makeAttackerCpu('nash', arena, st), D = makeDefenderCpu('nash', arena, st);
  const nn = run(arena, A, D);
  const plans: AttackerCpu[] = [
    (v) => (v.risk >= st.threshold - 15 ? 'A7' : v.phase === 'inside' ? 'A8' : 'A6'),
    (v) => (v.risk >= st.threshold - 15 ? 'A7' : v.phase === 'inside' ? 'A8' : 'A4'),
    (v) => (v.phase === 'inside' ? 'A8' : 'A6'),
  ];
  const defPlans: DefenderCpu[] = [() => 'D7', () => 'D1', (v) => ['D3', 'D5', 'D8'][v.round % 3]!];
  const worstAtt = Math.max(...plans.map((p) => run(arena, p, D, N / 2).win));
  const worstDef = Math.min(...defPlans.map((p) => run(arena, A, p, N / 2).win));
  return { ...nn, worstPlanVsNashDef: worstAtt, nashAttVsWorstPlan: worstDef };
}

{
  const variants: Partial<Knobs>[] = [
    { budget: 20 }, { budget: 21 }, { budget: 20, threshold: 45 }, { budget: 21, threshold: 45 },
    { budget: 22, exfil: 6 }, { budget: 21, exfil: 6 }, { budget: 22, exfil: 6, threshold: 45 },
    { budget: 21, breachDiv: 9 }, { budget: 22, breachDiv: 8 },
  ];
  for (const v of variants) {
    const k = { ...base, ...v };
    const r = evaluate(k);
    console.log(JSON.stringify(v).padEnd(42), `nash-v-nash ${r.win.toFixed(0)}% ${r.rounds.toFixed(1)}r  top ${r.topA} / ${r.topD}  worst plan vs nashDef ${r.worstPlanVsNashDef.toFixed(0)}%  nashAtt vs worst plan ${r.nashAttVsWorstPlan.toFixed(0)}%`);
  }
}
