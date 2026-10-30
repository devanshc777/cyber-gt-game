// Teaching layer: the role briefing, the first-match spotlight tour, tap-to-explain help, per-round tips, and the
// "what stops what" lines on move cards. Wording lives in copy.ts.
import { website as arena } from '../engine/arenas/website';
import type { GameState, Role, RoundResult, Settings } from '../engine/types';
import { BRIEFING, HELP } from './copy';
import { art } from './topology';

const SHORT: Record<string, string> = {
  D1: 'IDS', D2: 'WAF', D3: 'Rate Limiting', D4: 'Encryption', D5: 'Firewall', D6: 'Training', D7: 'Threat Hunt', D8: 'Idle',
  A1: 'Port Scan', A2: 'Packet Sniffing', A3: 'Brute Force', A4: 'SQL Injection', A5: 'DoS Flood', A6: 'Phishing',
  A7: 'Lay Low', A8: 'Exfiltrate', A9: 'Persist',
};
const DEF_IDS = arena.defenders.map((d) => d.id);
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} or ${xs[xs.length - 1]}`);

/** Defences that block an attack: payoff <= 0 in the matrix (spec s5 step 3). */
export function stoppedBy(attack: string): string[] {
  const row = arena.payoff.outside[attack] ?? arena.payoff.inside[attack];
  return row ? DEF_IDS.filter((_, i) => row[i]! <= 0).map((d) => SHORT[d]!) : [];
}

/** Attacks a defence blocks, read from the same matrix. */
export function stops(defense: string): string[] {
  const i = DEF_IDS.indexOf(defense);
  return Object.values(arena.payoff).flatMap((m) => Object.entries(m).filter(([a, row]) => a !== 'A7' && row[i]! <= 0).map(([a]) => SHORT[a]!));
}

/** One line under each move card: the counter-play, so the player can reason instead of memorising. */
export function moveNote(role: Role, id: string): string {
  if (role === 'attacker') {
    if (id === 'A7') return 'Cannot be blocked.';
    const by = stoppedBy(id);
    return by.length ? `Blocked by ${list(by)}.` : 'Nothing blocks it outright.';
  }
  if (id === 'D7') return 'Inside: throws the attacker out.';
  if (id === 'D8') return 'Saves money.';
  const s = stops(id);
  return s.length ? `Blocks ${list(s)}.` : 'Blocks nothing outright.';
}

/** Full-screen, one idea per slide; Enter or click moves on, Esc skips. */
export function briefing(root: HTMLElement, role: Role, done: () => void, back: () => void) {
  const slides = BRIEFING[role];
  let i = 0;
  root.innerHTML = `<div class="brief"><div class="brief-card" id="card"></div>
    <div class="brief-foot"><div class="dots">${slides.map(() => '<i></i>').join('')}</div>
    <span class="menu-foot" style="margin:0"><button class="btn" id="prev">BACK</button><button class="btn" id="skip">SKIP</button><button class="btn primary" id="next">NEXT</button></span></div></div>`;
  const card = root.querySelector<HTMLElement>('#card')!;
  const next = root.querySelector<HTMLButtonElement>('#next')!;
  const show = () => {
    const s = slides[i]!;
    card.innerHTML = `<div class="brief-icons">${s.icons.map((id) => `<img src="${art(id)}" alt="">`).join('')}</div>
      <p class="step-label">${role.toUpperCase()} BRIEFING · ${i + 1} / ${slides.length}</p>
      <h2>${s.title}</h2>${s.lines.map((l, k) => `<p style="animation-delay:${180 + k * 260}ms">${l}</p>`).join('')}`;
    card.classList.remove('in');
    void card.offsetWidth;
    card.classList.add('in');
    root.querySelectorAll('.dots i').forEach((d, k) => d.classList.toggle('on', k <= i));
    next.textContent = i === slides.length - 1 ? 'START MATCH' : 'NEXT';
  };
  const finish = () => {
    removeEventListener('keydown', key);
    done();
  };
  const leave = () => {
    removeEventListener('keydown', key);
    back();
  };
  const step = (d: number) => {
    if (i + d >= slides.length) return finish();
    if (i + d < 0) return leave();
    i = Math.max(0, i + d);
    show();
  };
  const key = (e: KeyboardEvent) => {
    // left by the browser's Back button: stop listening
    if (!card.isConnected) return removeEventListener('keydown', key);
    if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape') finish();
  };
  addEventListener('keydown', key);
  next.addEventListener('click', () => step(1));
  root.querySelector('#prev')!.addEventListener('click', () => step(-1));
  root.querySelector('#skip')!.addEventListener('click', finish);
  show();
}

export interface TourStep { target: string; title: string; text: string }

/** Spotlight tour: dims the page, rings one element, explains it, then the next. */
export function tour(root: HTMLElement, steps: TourStep[], done = () => {}) {
  const shade = document.createElement('div');
  shade.className = 'tour';
  shade.innerHTML = `<div class="tour-ring"></div><div class="tour-box"><p class="step-label"></p><h3></h3><p class="tour-text"></p>
    <span class="menu-foot" style="margin:8px 0 0"><button class="btn" data-skip>SKIP TOUR</button><button class="btn primary" data-next>NEXT</button></span></div>`;
  document.body.append(shade);
  const ring = shade.querySelector<HTMLElement>('.tour-ring')!, box = shade.querySelector<HTMLElement>('.tour-box')!;
  let i = 0;
  const place = (): void => {
    const s = steps[i]!;
    const el = root.querySelector<HTMLElement>(s.target);
    if (!el) return go();
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    Object.assign(ring.style, { left: `${r.left - 6}px`, top: `${r.top - 6}px`, width: `${r.width + 12}px`, height: `${r.height + 12}px` });
    box.querySelector('.step-label')!.textContent = `${i + 1} / ${steps.length}`;
    box.querySelector('h3')!.textContent = s.title;
    box.querySelector('.tour-text')!.textContent = s.text;
    box.querySelector('[data-next]')!.textContent = i === steps.length - 1 ? 'GOT IT' : 'NEXT';
    // below the target, else above it, else pinned to the bottom of the screen over a tall target
    const h = box.offsetHeight;
    box.style.top = `${r.bottom + 14 + h < innerHeight ? r.bottom + 14 : r.top - h - 14 > 8 ? r.top - h - 14 : innerHeight - h - 16}px`;
    box.style.left = `${Math.min(Math.max(8, r.left), innerWidth - box.offsetWidth - 8)}px`;
    box.classList.remove('in');
    void box.offsetWidth;
    box.classList.add('in');
  };
  const end = () => {
    shade.remove();
    removeEventListener('keydown', key);
    removeEventListener('resize', place);
    done();
  };
  const go = (): void => (++i >= steps.length ? end() : place());
  const key = (e: KeyboardEvent) => {
    if (!shade.isConnected) return end();
    if (e.key === 'Enter') { e.preventDefault(); go(); }
    if (e.key === 'Escape') end();
  };
  shade.querySelector('[data-next]')!.addEventListener('click', go);
  shade.querySelector('[data-skip]')!.addEventListener('click', end);
  addEventListener('keydown', key);
  addEventListener('resize', place);
  requestAnimationFrame(place);
}

export const TOUR: Record<Role, TourStep[]> = {
  attacker: [
    { target: '.topo', title: 'The network', text: 'You are on the left, outside. The website, its database and the staff sit inside the dashed line. Your attacks travel along the wires.' },
    { target: '#hud', title: 'Your status', text: 'Position, Compromise, Risk and Knowledge. Tap any ? to see what it means.' },
    { target: '#actions', title: 'Your moves', text: 'Pick one each round. Each card says what it does and what blocks it. Phishing, SQL Injection or Brute Force can get you inside.' },
    { target: '#report', title: 'What happened', text: 'After each round this tells you what landed, what changed and why, plus a tip.' },
  ],
  defender: [
    { target: '.topo', title: 'Your network', text: 'The attacker is on the left. You guard everything inside the dashed line. You only see their attacks when IDS is running.' },
    { target: '#hud', title: 'Your status', text: 'Budget, Compromise and Suspicion. Tap any ? to see what it means.' },
    { target: '#actions', title: 'Your defences', text: 'Pick one each round. Each card says what it blocks and what it costs. Budget never refills.' },
    { target: '#report', title: 'What happened', text: 'After each round this tells you what you saw, what changed, and a suggestion for next round.' },
  ],
};

/** Tap a "?" to get a callout box next to it; tap anywhere else to close. */
export function attachHelp(root: HTMLElement) {
  const pop = document.createElement('div');
  pop.className = 'callout';
  pop.hidden = true;
  root.append(pop);
  root.addEventListener('click', (e) => {
    const q = (e.target as Element).closest<HTMLElement>('[data-help]');
    if (!q) return void (pop.hidden = true);
    e.stopPropagation();
    pop.innerHTML = `<b>${q.dataset.help}</b><br>${HELP[q.dataset.help!] ?? ''}`;
    pop.hidden = false;
    const r = q.getBoundingClientRect();
    pop.style.top = `${r.bottom + scrollY + 8}px`;
    pop.style.left = `${Math.min(r.left + scrollX - 12, scrollX + innerWidth - pop.offsetWidth - 12)}px`;
  });
}

/** One suggestion after each round. Repeated mistakes get named; a single miss does not. */
export function tip(role: Role, st: Settings, state: GameState, history: RoundResult[], belief: number): string {
  const r = history[history.length - 1]!;
  const prev = history[history.length - 2];
  if (role === 'attacker') {
    if (state.risk >= st.threshold - 8) return `Risk is close to the trace line (${st.threshold}). Lay Low cools it by 10.`;
    if (r.blocked && prev?.blocked && prev.attack === r.attack) return `${SHORT[r.attack]} was blocked twice in a row. They may be expecting it: switch.`;
    if (state.phase === 'outside' && state.knowledge < 2) return 'Port Scan raises Knowledge, which makes SQL Injection and Brute Force more likely to get you in.';
    if (state.phase === 'outside') return 'Try to break in: Phishing, SQL Injection or Brute Force.';
    if (!state.backdoor) return 'You are inside. Persist plants a backdoor, so one Threat Hunt cannot throw you out.';
    return 'Exfiltrate to raise Compromise. Mix in Lay Low so they cannot time a hunt.';
  }
  if (state.budget <= 2) return 'Budget is almost gone. Idle is free: save the rest for when you see something.';
  if (r.attackSeen && r.phaseBefore === 'inside' && r.attack !== 'A7') return 'They are inside. Threat Hunt can throw them out.';
  if (r.attackSeen && r.attack === 'A7') return 'IDS caught them laying low: they are cooling their Risk down. A cheap round for you.';
  if (r.attackSeen) {
    const by = stoppedBy(r.attack).filter((d) => d !== 'IDS' && d !== 'Idle');
    if (by.length) return `They tried ${SHORT[r.attack]}. ${list(by)} blocks it.`;
  }
  if (r.compromiseDelta > 0) return 'Compromise went up: data is leaving, so they are inside. Threat Hunt, or Encryption to slow the theft.';
  if (belief > 0.5) return 'Suspicion is high. A Threat Hunt now could catch them inside.';
  return 'No clues this round. IDS shows you their next move and makes them louder.';
}

/** The round that decided the match, in one sentence, for the end screen. */
export function turningPoint(role: Role, st: Settings, history: RoundResult[], reason: string): string {
  const breach = history.find((r) => r.breached);
  if (reason === 'caught') {
    const cross = history.find((r) => r.caughtChance > 0);
    return cross ? `Round ${cross.round}: ${SHORT[cross.attack]} pushed Risk past the trace line (${st.threshold}). From then on every round was a roll to get caught.` : '';
  }
  if (reason === 'breach') return breach ? `Round ${breach.round}: ${SHORT[breach.attack]} got the attacker inside${role === 'defender' ? ', and you were not told' : ''}.` : '';
  if (!breach) return role === 'attacker' ? 'You never got inside. Every way in was blocked or failed its roll.' : 'The attacker never got inside.';
  return `Round ${breach.round}: the attacker got in with ${SHORT[breach.attack]}, but could not steal enough in time.`;
}
