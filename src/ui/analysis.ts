// The game theory under the game. Stage games are solved live in the browser with the same LP the CPUs use;
// everything else reads public/data/sim.json, written by `npm run sim`.
import { website as arena } from '../engine/arenas/website';
import { attackerOptions } from '../engine/engine';
import { solveZeroSum } from '../engine/lp';
import policy from '../engine/trained-policy.json';
import { ATTACKER, DEFENDER, attachTooltips, diverging, groupedBars, heatmap, hbars, histogram, legend, stack } from './charts';

interface Batch {
  label: string; attacker: string; defender: string; games: number; attackerWin: number; caught: number; timeout: number;
  meanRounds: number; lengthHistogram: number[]; attackShare: Record<string, number>; defenseShare: Record<string, number>;
  evictionsPerGame: number; meanFirstBreachRound: number | null; defenderBrokePct: number;
}
interface Sim {
  seed: number; games: number; names: Record<string, string>;
  grid: Batch[]; ladder: (Batch & { role: string; difficulty: string })[];
  exploit?: { cpus: string[]; attackerPlans: { plan: string; vs: number[] }[]; defenderPlans: { plan: string; vs: number[] }[] };
}

const NAME = Object.fromEntries([...arena.attackers, ...arena.defenders].map((x) => [x.id, x.name]));
const SHORT: Record<string, string> = { D1: 'IDS', D2: 'WAF', D3: 'RATE', D4: 'TLS', D5: 'FW', D6: 'TRAIN', D7: 'HUNT', D8: 'IDLE' };
const COST = arena.defenders.map((d) => d.cost);
const pctFmt = (v: number) => `${Math.round(v)}`;
const GREY = 'rgb(207,206,199)';

function stageBlock(phase: 'outside' | 'inside', kappa: number): string {
  const rows = attackerOptions(arena, phase);
  const M = rows.map((a) => arena.payoff[phase][a]!.map((v, j) => v + kappa * COST[j]!));
  const s = solveZeroSum(M);
  const pure = rows.flatMap((a, i) => M[i]!.map((v, j) =>
    v === Math.max(...M.map((r) => r[j]!)) && v === Math.min(...M[i]!) ? `${NAME[a]} / ${NAME[arena.defenders[j]!.id]}` : null)).filter(Boolean);
  const span = Math.max(...M.flat().map(Math.abs), 1);
  return `
    <h3 style="margin-top:14px">${phase.toUpperCase()} &middot; value ${s.value.toFixed(2)} to the attacker</h3>
    <p class="note">${pure.length ? `Pure Nash equilibrium: <b>${pure.join(', ')}</b>. No mixing needed: the corner case.` : 'No pure Nash equilibrium: every cell has a profitable deviation, so both sides must mix.'}</p>
    ${heatmap({
      rows: rows.map((a) => NAME[a]!), cols: arena.defenders.map((d) => SHORT[d.id]!), values: M,
      color: (v) => diverging(v / span), fmt: (v) => `${+v.toFixed(1)}`,
      tip: (i, j) => `${NAME[rows[i]!]} vs ${NAME[arena.defenders[j]!.id]}: ${+M[i]![j]!.toFixed(2)} to the attacker`,
    })}
    <div class="grid2">
      <div><p class="step-label">ATTACKER MINIMAX MIX</p>${hbars(rows.map((a, i) => ({ label: NAME[a]!, value: Math.round(s.row[i]! * 1000) / 10 })), { max: 100, color: ATTACKER, unit: '%' })}</div>
      <div><p class="step-label">DEFENDER MINIMAX MIX</p>${hbars(arena.defenders.map((d, j) => ({ label: d.name.split(' ')[0]!, value: Math.round(s.col[j]! * 1000) / 10 })), { max: 100, color: DEFENDER, unit: '%' })}</div>
    </div>`;
}

function inspection(g: number, L: number, h: number): string {
  const q = Math.min(1, h / (g + L)), p = g / (g + L);
  return `<p>Attacker exfiltrates with <b>q* = h / (g + L) = ${(q * 100).toFixed(1)}%</b>; defender hunts with <b>p* = g / (g + L) = ${(p * 100).toFixed(1)}%</b>.</p>
    ${stack([{ label: 'exfiltrate', value: q * 100, color: ATTACKER }, { label: 'lay low', value: 100 - q * 100, color: GREY }])}
    ${stack([{ label: 'hunt', value: p * 100, color: DEFENDER }, { label: 'no hunt', value: 100 - p * 100, color: GREY }])}`;
}

export async function analysis(root: HTMLElement, back: () => void) {
  root.innerHTML = `<div class="top-row"><h2>GAME THEORY ANALYSIS</h2><button class="btn" id="back">MENU</button></div><p id="loading">Loading simulation data…</p>`;
  root.querySelector('#back')!.addEventListener('click', back);
  let sim: Sim;
  try {
    sim = await (await fetch(`${import.meta.env.BASE_URL}data/sim.json`)).json();
  } catch {
    root.querySelector('#loading')!.textContent = 'No simulation data. Run `npm run sim` to create public/data/sim.json.';
    return;
  }
  const kinds = [...new Set(sim.grid.map((b) => b.attacker))];
  const cell = (a: string, d: string) => sim.grid.find((b) => b.attacker === a && b.defender === d)!;
  const nn = cell('nash', 'nash');
  const levels = ['easy', 'normal', 'hard', 'learned'].filter((l) => sim.ladder.some((x) => x.difficulty === l));
  const ladder = (role: string) => levels.map((l) => {
    const b = sim.ladder.find((x) => x.role === role && x.difficulty === l)!;
    return Math.round((role === 'attacker' ? b.attackerWin : 100 - b.attackerWin) * 10) / 10;
  });
  const share = (m: Record<string, number>) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: NAME[k]!, value: v }));
  const learned = policy as { games: number; attacker: Record<string, Record<string, number>> };
  const ex = sim.exploit;

  root.innerHTML = `
    <div class="top-row"><h2>GAME THEORY ANALYSIS</h2><button class="btn" id="back">MENU</button></div>
    <div class="stack">
      <div class="win"><div class="bar"><span>01_what_kind_of_game.txt</span></div><div class="body prose">
        <p>A <b>finite, repeated, simultaneous-move, stochastic game with imperfect information</b>. Each round is a zero-sum
        stage game between two players who pick in secret. The state (compromise, risk, knowledge, budget) carries from round to round.</p>
        <p>The attacker moves through a <b>kill chain</b>: outside, breach, inside. The defender never sees which stage game it is
        playing unless IDS shows it, a hunt hits, or data starts leaving. That makes it a two-state stochastic game where one player cannot see the state.</p>
      </div></div>

      <div class="win"><div class="bar"><span>02_stage_games.lp</span></div><div class="body">
        <label class="note"><input type="checkbox" id="kappa"> Price the defender's costs into the payoff (kappa = 3, spec s8)</label>
        <div id="stages"></div>
        <p class="note">Solved live in your browser with the same simplex the Hard CPU uses; it matches the Python reference (scipy) to 1e-6. Warm cells favour the attacker, blue-green cells the defender.</p>
      </div></div>

      <div class="win"><div class="bar"><span>03_inspection_game.txt</span></div><div class="body">
        <div class="prose"><p>Inside the network the core choice is <b>Exfiltrate or Lay Low</b> against <b>Hunt or not</b>. With g = gain from an
        unhunted exfiltration, L = the foothold lost if hunted, and h = what a hunt costs the defender, the 2x2 has a closed-form mixed equilibrium.
        The cost of inspecting, not the size of the penalty, sets how often the attacker acts.</p></div>
        <div class="sliders">
          <label>g <input type="range" id="g" min="5" max="60" value="30"><span></span></label>
          <label>L <input type="range" id="L" min="5" max="60" value="25"><span></span></label>
          <label>h <input type="range" id="h" min="1" max="30" value="6"><span></span></label>
        </div>
        <div id="insp"></div>
      </div></div>

      <div class="win"><div class="bar"><span>04_cpu_vs_cpu.csv</span></div><div class="body">
        <p class="note">Attacker win % at Normal, ${sim.games.toLocaleString()} games per cell, seed ${sim.seed}. Rows attacker CPU, columns defender CPU. 50 is a fair fight.</p>
        ${heatmap({
          rows: kinds, cols: kinds, values: kinds.map((a) => kinds.map((d) => cell(a, d).attackerWin)), cell: 76, rowW: 80,
          color: (v) => diverging((v - 50) / 50), fmt: pctFmt,
          tip: (i, j) => { const b = cell(kinds[i]!, kinds[j]!); return `${b.label}: attacker ${b.attackerWin}%, caught ${b.caught}%, timeout ${b.timeout}%, ${b.meanRounds} rounds`; },
        })}
      </div></div>

      <div class="grid2">
        <div class="win"><div class="bar"><span>05_difficulty_ladder</span></div><div class="body">
          <p class="note">Win % for a strong player (the Nash CPU stands in) at each level.</p>
          ${groupedBars(levels.map((l) => l.toUpperCase()), [
            { name: 'as attacker', color: ATTACKER, values: ladder('attacker') },
            { name: 'as defender', color: DEFENDER, values: ladder('defender') },
          ], { max: 100, unit: '%' })}
        </div></div>
        <div class="win"><div class="bar"><span>06_nash_vs_nash</span></div><div class="body">
          <p class="note">Hard CPU against itself: attacker ${nn.attackerWin}% in ${nn.meanRounds} rounds on average. Spec target: 45-55%, 10-18 rounds.</p>
          ${stack([
            { label: 'breach', value: nn.attackerWin, color: ATTACKER },
            { label: 'caught', value: nn.caught, color: 'rgb(74,77,75)' },
            { label: 'timeout', value: nn.timeout, color: DEFENDER },
          ])}
          ${legend([{ name: 'attacker breach', color: ATTACKER }, { name: 'caught', color: 'rgb(74,77,75)' }, { name: 'survived 20', color: DEFENDER }])}
          <p class="step-label" style="margin-top:12px">GAME LENGTH (ROUNDS)</p>
          ${histogram(nn.lengthHistogram, DEFENDER)}
        </div></div>
      </div>

      <div class="grid2">
        <div class="win"><div class="bar"><span>07a_attacker_actions</span></div><div class="body">
          <p class="note">Share of the Hard attacker's moves, Nash vs Nash.</p>${hbars(share(nn.attackShare), { max: 100, color: ATTACKER, unit: '%' })}</div></div>
        <div class="win"><div class="bar"><span>07b_defender_actions</span></div><div class="body">
          <p class="note">Share of the Hard defender's moves, Nash vs Nash.</p>${hbars(share(nn.defenseShare), { max: 100, color: DEFENDER, unit: '%', labelW: 200 })}</div></div>
      </div>

      ${ex ? `<div class="win"><div class="bar"><span>08_exploitability</span></div><div class="body">
        <p class="note">Fixed, non-adaptive plans against each adaptive CPU (attacker win %). A CPU that a fixed plan beats over 80% is exploitable; Greedy is meant to be.</p>
        <div class="grid2">
          <div><p class="step-label">FIXED ATTACKER PLANS</p>${heatmap({
            rows: ex.attackerPlans.map((p) => p.plan), cols: ex.cpus, values: ex.attackerPlans.map((p) => p.vs), cell: 70, rowW: 130,
            color: (v) => diverging((v - 50) / 50), fmt: pctFmt, tip: (i, j) => `${ex.attackerPlans[i]!.plan} vs ${ex.cpus[j]} defender: attacker ${ex.attackerPlans[i]!.vs[j]}%`,
          })}</div>
          <div><p class="step-label">FIXED DEFENDER PLANS</p>${heatmap({
            rows: ex.defenderPlans.map((p) => p.plan), cols: ex.cpus, values: ex.defenderPlans.map((p) => p.vs), cell: 70, rowW: 150,
            color: (v) => diverging((v - 50) / 50), fmt: pctFmt, tip: (i, j) => `${ex.cpus[j]} attacker vs ${ex.defenderPlans[i]!.plan}: attacker ${ex.defenderPlans[i]!.vs[j]}%`,
          })}</div>
        </div>
      </div></div>` : ''}

      <div class="win"><div class="bar"><span>09_learned_policy.json</span></div><div class="body">
        <div class="prose"><p>The <b>Learned</b> tier was trained by <b>regret matching</b> in self-play (${learned.games.toLocaleString()} games): after every round
        each side scores the moves it could have made against what the opponent actually did, and shifts weight toward the ones it regrets not playing.
        In zero-sum games the average strategy of regret matching converges to equilibrium (Hart &amp; Mas-Colell, 2000). Below: the attacker's learned mix per situation.</p></div>
        <div style="overflow-x:auto"><table><thead><tr><th>PHASE</th><th>RISK</th><th>STAGE OF GAME</th><th>LEARNED MIX</th></tr></thead><tbody>
        ${Object.entries(learned.attacker).map(([b, mixRow]) => {
          const [ph, r, t] = b.split('|');
          const parts = Object.entries(mixRow).filter(([, v]) => v >= 0.05).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${NAME[k]} ${Math.round(v * 100)}%`).join(', ');
          return `<tr><td>${ph}</td><td>${['low', 'mid', 'over trace line'][+r!.slice(1)]}</td><td>${['early', 'middle', 'late'][+t!.slice(1)]}</td><td>${parts}</td></tr>`;
        }).join('')}
        </tbody></table></div>
      </div></div>
    </div>`;
  root.querySelector('#back')!.addEventListener('click', back);

  const kappaBox = root.querySelector<HTMLInputElement>('#kappa')!;
  const drawStages = () => (root.querySelector('#stages')!.innerHTML = stageBlock('outside', kappaBox.checked ? 3 : 0) + stageBlock('inside', kappaBox.checked ? 3 : 0));
  kappaBox.addEventListener('change', drawStages);
  drawStages();

  const sliders = ['g', 'L', 'h'].map((id) => root.querySelector<HTMLInputElement>(`#${id}`)!);
  const drawInsp = () => {
    sliders.forEach((s) => (s.nextElementSibling!.textContent = s.value));
    root.querySelector('#insp')!.innerHTML = inspection(+sliders[0]!.value, +sliders[1]!.value, +sliders[2]!.value);
  };
  sliders.forEach((s) => s.addEventListener('input', drawInsp));
  drawInsp();
  attachTooltips(root);
}
