import { website as arena } from '../engine/arenas/website';
import type { Difficulty, Role } from '../engine/types';
import type { CpuKind } from '../engine/cpu';
import { REASON_TEXT, SUBTITLE, TITLE } from './copy';
import type { MatchEnd, MatchSetup } from './match';

const BOOT = [
  'BIOS 1.0 .......... ok',
  'mounting /arenas .. 1 found',
  'loading website ... ok',
  'opponent cpu ...... armed',
];

type Level = Difficulty | 'learned';
const LEVELS: Level[] = ['easy', 'normal', 'hard', 'learned'];
export const LEVEL_SETUP: Record<Level, { settings: Difficulty; cpu: CpuKind }> = {
  easy: { settings: 'easy', cpu: 'easy' },
  normal: { settings: 'normal', cpu: 'greedy' },
  hard: { settings: 'hard', cpu: 'nash' },
  learned: { settings: 'normal', cpu: 'trained' },
};

const DIFF_TEXT: Record<Role, Record<Level, string>> = {
  attacker: {
    easy: 'Trace line at 50, risk x0.75. The defender half-guesses.',
    normal: 'Trace line at 40. The defender counters what it has seen.',
    hard: 'Trace line at 30, risk x1.25. The defender solves the game each round.',
    learned: 'Normal rules. The defender learned its play over 20,000 self-play games.',
  },
  defender: {
    easy: 'Budget 26. The attacker half-guesses.',
    normal: 'Budget 20. The attacker counters what it has learned.',
    hard: 'Budget 14. The attacker solves the game each round.',
    learned: 'Normal rules. The attacker learned its play over 20,000 self-play games.',
  },
};

/** Battleground, role and difficulty, one column each, then start. */
export function menu(root: HTMLElement, onStart: (s: MatchSetup) => void, onAnalysis: () => void) {
  const pick: { arena?: string; role?: Role; difficulty?: Level } = {};
  root.innerHTML = `
    <div class="menu">
      <div>
        <h1 class="title">ATTACKER<br><em>//</em> DEFENDER</h1>
        <p class="note">${SUBTITLE}</p>
        <div class="boot" id="boot"></div>
        <div class="menu-foot">
          <button class="link" id="to-analysis">Game theory analysis</button>
          <button class="link" id="to-how">How a round works</button>
        </div>
        <div class="win" id="how" hidden style="margin-top:16px"><div class="bar"><span>readme.txt</span></div><div class="body prose">
          <p>Both sides pick a move in secret. Then the round resolves.</p>
          <p><b>Attacker:</b> start outside. Phishing, SQL injection or brute force can breach. Once inside, exfiltrate data. Compromise 100 wins. Every attack raises Risk; past the trace line you may be caught.</p>
          <p><b>Defender:</b> one budget for 20 rounds. Each defense counters something. You never know if the attacker is inside unless IDS shows you, a hunt hits, or data starts leaving. Survive 20 rounds or get them caught.</p>
          <p>No move wins everything. Mixing your moves is the point.</p>
        </div></div>
      </div>
      <div class="win"><div class="bar"><span>new_game.exe</span></div><div class="body">
        <p class="step-label">1. CHOOSE YOUR BATTLEGROUND</p>
        <div class="choices" id="arenas">
          <button class="card" data-v="website"><b>${arena.name.toUpperCase()}</b><small>A web app, its database and the staff who run it.</small></button>
        </div>
        <div id="role-step" hidden>
          <p class="step-label" style="margin-top:18px">2. CHOOSE YOUR SIDE</p>
          <div class="choices" id="roles" style="grid-template-columns:1fr 1fr">
            <button class="card" data-v="attacker"><b>ATTACKER</b><small>Short on time. Risk rises with every move.</small></button>
            <button class="card" data-v="defender"><b>DEFENDER</b><small>Short on money. Budget never refills.</small></button>
          </div>
        </div>
        <div id="diff-step" hidden>
          <p class="step-label" style="margin-top:18px">3. PLAY AGAINST COMPUTER</p>
          <div class="choices" id="diffs"></div>
        </div>
        <div style="margin-top:18px"><button class="btn primary" id="start" disabled>START MATCH</button></div>
      </div></div>
    </div>`;
  const $ = (id: string) => root.querySelector(`#${id}`)! as HTMLElement;
  const select = (box: HTMLElement, v: string) => box.querySelectorAll('.card').forEach((c) => c.classList.toggle('on', (c as HTMLElement).dataset.v === v));

  let line = 0;
  const tick = setInterval(() => {
    if (!root.contains($('boot'))) return clearInterval(tick);
    line++;
    $('boot').innerHTML = BOOT.slice(0, line).join('\n') + (line >= BOOT.length ? '\n> choose your battleground <span class="cursor"></span>' : '');
    if (line >= BOOT.length) clearInterval(tick);
  }, 260);

  const ready = () => (($('start') as HTMLButtonElement).disabled = !(pick.arena && pick.role && pick.difficulty));
  $('arenas').addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!c) return;
    pick.arena = c.dataset.v;
    select($('arenas'), pick.arena!);
    $('role-step').hidden = false;
    ready();
  });
  $('roles').addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!c) return;
    pick.role = c.dataset.v as Role;
    select($('roles'), pick.role);
    $('diffs').innerHTML = LEVELS.map((d) =>
      `<button class="card${pick.difficulty === d ? ' on' : ''}" data-v="${d}"><b>${d.toUpperCase()}</b><small>${DIFF_TEXT[pick.role!][d]}</small></button>`).join('');
    $('diff-step').hidden = false;
    ready();
  });
  $('diffs').addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!c) return;
    pick.difficulty = c.dataset.v as Level;
    select($('diffs'), pick.difficulty);
    ready();
  });
  $('start').addEventListener('click', () => onStart({ role: pick.role!, difficulty: LEVEL_SETUP[pick.difficulty!].settings, cpu: LEVEL_SETUP[pick.difficulty!].cpu, label: pick.difficulty!.toUpperCase() }));
  $('to-analysis').addEventListener('click', onAnalysis);
  $('to-how').addEventListener('click', () => ($('how').hidden = !$('how').hidden));
}

const nm = (id: string) => [...arena.attackers, ...arena.defenders].find((x) => x.id === id)!.name;

/** Result plus the full reveal: every round, both moves, now that the game is over. */
export function endScreen(root: HTMLElement, e: MatchEnd, again: () => void, toMenu: () => void, onAnalysis: () => void) {
  const won = e.final.winner === e.setup.role;
  const rows = e.history.map((r) => `<tr>
    <td>${r.round}</td><td>${r.phaseBefore}</td><td>${nm(r.attack)}</td>
    <td>${nm(r.defense)}${r.defense !== r.defensePicked ? ' (broke)' : ''}</td>
    <td>${r.blocked === null ? '·' : r.blocked ? 'blocked' : 'landed'}${r.breached ? ', BREACH' : ''}${r.hunt ? `, ${r.hunt}` : ''}</td>
    <td>${r.compromiseDelta ? `+${r.compromiseDelta}` : ''}</td><td>${r.riskDelta > 0 ? '+' : ''}${+r.riskDelta.toFixed(2)}</td>
    <td>${r.attackSeen ? 'yes' : '<span class="reveal-hidden">no</span>'}</td></tr>`).join('');
  root.innerHTML = `
    <div class="end-head"><h1>${won ? 'YOU WIN' : 'YOU LOSE'}</h1><span class="tag ${won ? 'net' : 'alert'}">${e.final.reason!.toUpperCase()}</span></div>
    <p>${REASON_TEXT[e.final.reason!]} Final: Compromise ${e.final.compromise}, Risk ${+e.final.risk.toFixed(1)}, budget left ${e.final.budget}, ${e.history.length} rounds.</p>
    <div class="menu-foot" style="margin-bottom:18px">
      <button class="btn primary" id="again">PLAY AGAIN</button><button class="btn" id="menu">MENU</button><button class="btn" id="an">ANALYSIS</button>
    </div>
    <div class="win"><div class="bar"><span>full_reveal.log</span></div><div class="body">
      <p class="note">During play each side saw only its own information. Here is everything.</p>
      <div style="overflow-x:auto"><table><thead><tr><th>R</th><th>PHASE</th><th>ATTACK</th><th>DEFENSE</th><th>RESULT</th><th>C</th><th>RISK</th><th>IDS SAW IT</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></div>`;
  root.querySelector('#again')!.addEventListener('click', again);
  root.querySelector('#menu')!.addEventListener('click', toMenu);
  root.querySelector('#an')!.addEventListener('click', onAnalysis);
}

export { TITLE };
