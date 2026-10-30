import { website as arena } from '../engine/arenas/website';
import type { Difficulty, Role } from '../engine/types';
import type { CpuKind } from '../engine/cpu';
import { END_TEXT, REASON_TEXT, SUBTITLE, TITLE } from './copy';
import { turningPoint } from './guide';
import { website as arenaData } from '../engine/arenas/website';
import type { MatchEnd, MatchSetup } from './match';
import { art } from './topology';

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

/** Full-screen boot scene. Any key or a click moves on. */
export function title(root: HTMLElement, next: () => void) {
  root.innerHTML = `<div class="title-screen"><div class="ts-bg" style="background-image:url(${import.meta.env.BASE_URL}art/menu.jpg)"></div>
    <div class="ts-copy"><h1 class="title">ATTACKER<br><em>//</em> DEFENDER</h1><p class="note">${SUBTITLE}</p>
    <pre class="boot" id="boot"></pre><p class="press" id="press" hidden>PRESS ENTER <span class="cursor"></span></p></div></div>`;
  const screen = root.querySelector<HTMLElement>('.title-screen')!;
  const bg = root.querySelector<HTMLElement>('.ts-bg')!;
  let line = 0;
  const tick = setInterval(() => {
    line++;
    root.querySelector('#boot')!.textContent = BOOT.slice(0, line).join('\n');
    if (line >= BOOT.length) { clearInterval(tick); (root.querySelector('#press') as HTMLElement).hidden = false; }
  }, 240);
  // the scene drifts a little against the pointer, so the old machine feels like it sits in a room
  const drift = (e: PointerEvent) => (bg.style.transform = `scale(1.06) translate(${(e.clientX / innerWidth - 0.5) * -14}px, ${(e.clientY / innerHeight - 0.5) * -10}px)`);
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    clearInterval(tick);
    removeEventListener('keydown', key);
    removeEventListener('pointermove', drift);
    screen.classList.add('off');
    setTimeout(next, 520);
  };
  const key = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) go(); };
  addEventListener('keydown', key);
  addEventListener('pointermove', drift);
  screen.addEventListener('click', go);
}

/** Battleground, role and difficulty, revealed one step at a time, then start. */
export function menu(root: HTMLElement, onStart: (s: MatchSetup) => void, onAnalysis: () => void) {
  const pick: { arena?: string; role?: Role; difficulty?: Level } = {};
  root.innerHTML = `
    <div class="setup">
      <div class="win"><div class="bar"><span>new_game.exe</span></div><div class="body">
        <p class="step-label">1. CHOOSE YOUR BATTLEGROUND</p>
        <div class="choices" id="arenas">
          <button class="card" data-v="website"><span class="pics"><img class="wide" src="${art('card-website')}" alt=""></span><b>${arena.name.toUpperCase()}</b><small>A web app, its database and the staff who run it.</small></button>
        </div>
        <div id="role-step" hidden>
          <p class="step-label" style="margin-top:18px">2. CHOOSE YOUR SIDE</p>
          <div class="choices two" id="roles">
            <button class="card" data-v="attacker"><span class="pics"><img src="${art('atk')}" alt=""></span><b>ATTACKER</b><small>Break in and steal the data. Short on time, and every move makes noise.</small></button>
            <button class="card" data-v="defender"><span class="pics"><img src="${art('soc')}" alt=""></span><b>DEFENDER</b><small>Keep them out for 20 rounds. Short on money, and you cannot see them.</small></button>
          </div>
        </div>
        <div id="diff-step" hidden>
          <p class="step-label" style="margin-top:18px">3. PLAY AGAINST COMPUTER</p>
          <div class="choices" id="diffs"></div>
        </div>
        <div style="margin-top:18px"><button class="btn primary" id="start" disabled>START</button></div>
      </div></div>
      <div class="menu-foot">
        <button class="link" id="to-analysis">Game theory analysis</button>
      </div>
    </div>`;
  const $ = (id: string) => root.querySelector(`#${id}`)! as HTMLElement;
  const select = (box: HTMLElement, v: string) => box.querySelectorAll('.card').forEach((c) => c.classList.toggle('on', (c as HTMLElement).dataset.v === v));

  const ready = () => (($('start') as HTMLButtonElement).disabled = !(pick.arena && pick.role && pick.difficulty));
  $('arenas').addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest('.card') as HTMLElement | null;
    if (!c) return;
    pick.arena = c.dataset.v;
    select($('arenas'), pick.arena!);
    $('role-step').hidden = false;
    $('role-step').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
    $('diff-step').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
}

const nm = (id: string) => [...arena.attackers, ...arena.defenders].find((x) => x.id === id)!.name;

const END_PIC = { breach: 'end-breach', caught: 'end-caught', timeout: 'end-timeout' } as const;

/** Result plus the full reveal: every round, both moves, now that the game is over. */
export function endScreen(root: HTMLElement, e: MatchEnd, again: () => void, toMenu: () => void, onAnalysis: () => void) {
  const won = e.final.winner === e.setup.role;
  const text = END_TEXT[e.setup.role][e.final.reason!];
  const point = turningPoint(e.setup.role, arenaData.settings[e.setup.role][e.setup.difficulty], e.history, e.final.reason!);
  const rows = e.history.map((r) => `<tr>
    <td>${r.round}</td><td>${r.phaseBefore}</td><td>${nm(r.attack)}</td>
    <td>${nm(r.defense)}${r.defense !== r.defensePicked ? ' (broke)' : ''}</td>
    <td>${r.blocked === null ? '·' : r.blocked ? 'blocked' : 'landed'}${r.breached ? ', BREACH' : ''}${r.hunt ? `, ${r.hunt}` : ''}</td>
    <td>${r.compromiseDelta ? `+${r.compromiseDelta}` : ''}</td><td>${r.riskDelta > 0 ? '+' : ''}${+r.riskDelta.toFixed(2)}</td>
    <td>${r.attackSeen ? 'yes' : '<span class="reveal-hidden">no</span>'}</td></tr>`).join('');
  root.innerHTML = `
    <div class="end-card win"><div class="body">
    <img class="end-scene" src="${art(END_PIC[e.final.reason!])}" alt=""><div class="end-head"><h1>${won ? 'YOU WIN' : 'YOU LOSE'}</h1><span class="tag ${won ? 'net' : 'alert'}">${e.final.reason!.toUpperCase()}</span></div>
    <p class="end-why"><b>${text.why}</b></p>
    ${point ? `<p>${point}</p>` : ''}
    <p class="end-next"><b>Next time:</b> ${text.next}</p>
    <p class="note">Compromise ${e.final.compromise} · Risk ${+e.final.risk.toFixed(1)} · budget left ${e.final.budget} · ${e.history.length} rounds</p>
    <div class="menu-foot" style="margin-bottom:18px">
      <button class="btn primary" id="again">PLAY AGAIN</button><button class="btn" id="menu">MENU</button><button class="btn" id="an">ANALYSIS</button>
    </div></div></div>
    <details class="win reveal"><summary class="bar"><span>full_reveal.log: every round, both moves</span></summary><div class="body">
      <p class="note">During play each side saw only its own information. Here is everything.</p>
      <div style="overflow-x:auto"><table><thead><tr><th>R</th><th>PHASE</th><th>ATTACK</th><th>DEFENSE</th><th>RESULT</th><th>C</th><th>RISK</th><th>IDS SAW IT</th></tr></thead><tbody>${rows}</tbody></table></div>
    </div></details>`;
  root.querySelector('#again')!.addEventListener('click', again);
  root.querySelector('#menu')!.addEventListener('click', toMenu);
  root.querySelector('#an')!.addEventListener('click', onAnalysis);
}

export { TITLE };
