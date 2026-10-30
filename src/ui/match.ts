import { website as arena } from '../engine/arenas/website';
import { affordable, attackerOptions, newGame, resolveRound } from '../engine/engine';
import { attackerView, defenderView, insideBelief, makeAttackerCpu, makeDefenderCpu, type CpuKind } from '../engine/cpu';
import { makeRng } from '../engine/rng';
import type { Difficulty, GameState, Role, RoundResult } from '../engine/types';
import { ACTION_BLURB } from './copy';
import { animate, art, topologySvg, type NodeId } from './topology';
import { TOUR, attachHelp, moveNote, tip, tour } from './guide';

export interface MatchSetup { role: Role; difficulty: Difficulty; cpu: CpuKind; label: string }
export interface MatchEnd { setup: MatchSetup; final: GameState; history: RoundResult[] }

const name = (id: string) => [...arena.attackers, ...arena.defenders].find((x) => x.id === id)!.name;
const signed = (x: number) => (x > 0 ? `+${x}` : `${x}`);
const fmt = (x: number) => (Number.isInteger(x) ? `${x}` : x.toFixed(1));

// Last shown value per meter, so a re-render can slide each bar from where it was and flag what changed.
const shown = new Map<string, { value: string; fill: number }>();

function meter(label: string, value: string, fill?: number, opts: { hot?: boolean; mark?: number; right?: string } = {}) {
  const before = shown.get(label);
  const to = Math.min(100, fill ?? 0);
  shown.set(label, { value, fill: to });
  const bar = fill === undefined ? '' : `<div class="bar-track"><div class="bar-fill${opts.hot ? ' hot' : ''}" style="width:${before?.fill ?? to}%" data-w="${to}"></div>${opts.mark === undefined ? '' : `<div class="bar-mark" style="left:${opts.mark}%"></div>`}</div>`;
  const bump = before && before.value !== value ? ' bump' : '';
  return `<div class="meter${bump}"><div class="k"><span>${label} <button class="q" data-help="${label}" aria-label="What is ${label.toLowerCase()}?">?</button></span><span>${opts.right ?? ''}</span></div><div class="v">${value}</div>${bar}</div>`;
}

/** Restart a one-shot CSS animation on an element whose content just changed. */
function replay(e: HTMLElement, cls: string) {
  e.classList.remove(cls);
  void e.offsetWidth;
  e.classList.add(cls);
}

export function startMatch(root: HTMLElement, setup: MatchSetup, onEnd: (e: MatchEnd) => void, onQuit: () => void) {
  const st = arena.settings[setup.role][setup.difficulty];
  const rng = makeRng((Date.now() ^ (Math.random() * 2 ** 31)) >>> 0);
  const cpuAtt = setup.role === 'defender' ? makeAttackerCpu(setup.cpu, arena, st) : null;
  const cpuDef = setup.role === 'attacker' ? makeDefenderCpu(setup.cpu, arena, st) : null;
  let state = newGame(st);
  const history: RoundResult[] = [];
  const lines: string[] = [];
  let busy = false;
  shown.clear();

  root.innerHTML = `
    <div class="stage">
      <div class="top-row">
        <h2>YOU ARE THE ${setup.role.toUpperCase()}</h2>
        <span class="menu-foot" style="margin:0"><span class="tag">${setup.label} CPU</span><button class="btn" id="help">? HOW TO PLAY</button><button class="btn" id="quit">QUIT</button></span>
      </div>
      <div class="win status"><div class="body"><div class="hud" id="hud"></div></div></div>
      <div class="win topo"><div class="bar"><span>topology.pkt</span></div><div class="body">${topologySvg()}</div></div>
      <div class="report" id="report"><h3>ROUND 1</h3>${setup.role === 'attacker'
        ? 'You start outside. Break in, then steal data until Compromise hits 100. Keep Risk under the trace line.'
        : 'The attacker starts outside. You will not be told when they get in. Hold out 20 rounds or get them caught.'}</div>
      <div class="step-label">CHOOSE YOUR MOVE</div>
      <div class="actions" id="actions"></div>
      <details class="win log-box"><summary class="bar"><span>round_log.txt</span></summary><div class="body"><div class="log" id="log"></div></div></details>
    </div>`;
  const svg = root.querySelector('svg')! as SVGSVGElement;
  const $ = (id: string) => root.querySelector(`#${id}`)! as HTMLElement;

  function renderHud() {
    const t = Math.min(state.round, st.rounds);
    if (setup.role === 'attacker') {
      $('hud').innerHTML = [
        meter('ROUND', `${t} / ${st.rounds}`),
        meter('POSITION', state.phase === 'inside' ? `INSIDE${state.backdoor ? ' + BACKDOOR' : ''}` : 'OUTSIDE'),
        meter('COMPROMISE', fmt(state.compromise), state.compromise, { hot: true }),
        meter('RISK', fmt(state.risk), state.risk, { mark: st.threshold, right: `trace at ${st.threshold}`, hot: state.risk >= st.threshold }),
        meter('KNOWLEDGE', `${state.knowledge} / 5`, state.knowledge * 20),
      ].join('');
      slideBars();
    } else {
      const b = insideBelief(defenderView(state, history));
      $('hud').innerHTML = [
        meter('ROUND', `${t} / ${st.rounds}`),
        meter('BUDGET', `${state.budget}`, (100 * state.budget) / st.budget),
        meter('COMPROMISE', fmt(state.compromise), state.compromise, { hot: true }),
        meter('SUSPICION', `${Math.round(b * 100)}%`, b * 100),
      ].join('');
      slideBars();
    }
  }

  // Bars are drawn at last round's width, then set to the new one after a forced layout, so the transition runs.
  // Not on a frame callback: a hidden or throttled tab skips those and the bar fell a round behind its number.
  function slideBars() {
    const hud = $('hud');
    void hud.offsetWidth;
    hud.querySelectorAll<HTMLElement>('.bar-fill').forEach((f) => (f.style.width = `${f.dataset.w}%`));
  }

  function renderActions() {
    const ids = setup.role === 'attacker' ? attackerOptions(arena, state.phase) : arena.defenders.map((d) => d.id);
    const ok = setup.role === 'defender' ? affordable(arena, state.budget) : ids;
    $('actions').innerHTML = ids.map((id, i) => {
      const meta = setup.role === 'attacker'
        ? `risk ${arena.attackers.find((a) => a.id === id)!.baseRisk > 0 ? '+' : ''}${arena.attackers.find((a) => a.id === id)!.baseRisk}`
        : `cost ${arena.defenders.find((d) => d.id === id)!.cost}`;
      return `<button class="act" style="--i:${i}" data-id="${id}" ${ok.includes(id) && !state.winner ? '' : 'disabled'}><img src="${art(id)}" alt=""><b>${name(id)}<i>${meta}</i></b><small>${ACTION_BLURB[id]} <em>${moveNote(setup.role, id)}</em></small></button>`;
    }).join('');
    $('actions').querySelectorAll<HTMLButtonElement>('.act').forEach((b) => b.addEventListener('click', () => play(b.dataset.id!)));
  }

  function attackerReport(r: RoundResult) {
    const bits: string[] = [];
    let tone = '';
    if (r.hunt === 'evicted') { bits.push(`<b>Hunted.</b> They found you and threw you out. Back outside.`); tone = 'good'; }
    else if (r.hunt === 'backdoor-burned') bits.push(`<b>Hunted.</b> Your backdoor took the hit; you are still inside.`);
    // spec s9: the attacker feels a hunt only while inside
    else if (r.hunt === 'nothing-found' && r.phaseBefore === 'inside') bits.push(`A hunt swept past. You stayed dormant and unseen.`);
    else if (r.blocked === null) bits.push(`You laid low.`);
    else if (r.blocked) { bits.push(`<b>${name(r.attack)} was blocked.</b> You do not know by what.`); tone = 'good'; }
    else { bits.push(`<b>${name(r.attack)} landed.</b>`); tone = 'hit'; }
    if (r.breached) bits.push(`<b>BREACH.</b> You are inside. They were not told.`);
    if (r.compromiseDelta) bits.push(`Compromise ${signed(r.compromiseDelta)}.`);
    bits.push(`Risk ${signed(+r.riskDelta.toFixed(2))}${r.blocked === null ? ' (laying low cools you down)' : r.blocked ? ' (failed attempts are loud)' : ''}.`);
    if (r.knowledgeDelta) bits.push(`Knowledge ${signed(r.knowledgeDelta)}${r.knowledgeDelta > 0 ? ' (you learned more about the target)' : ''}.`);
    if (r.caughtChance > 0) bits.push(`Trace chance this round: ${Math.round(r.caughtChance * 100)}%.`);
    return { html: bits.join(' '), tone };
  }

  function defenderReport(r: RoundResult, belief: number) {
    const bits: string[] = [];
    let tone = '';
    if (r.defense !== r.defensePicked) bits.push(`Out of budget: you idled.`);
    else bits.push(`You ran ${name(r.defense)}.`);
    if (r.attackSeen) bits.push(`<b>IDS: ${r.attack === 'A7' ? 'no attack traffic' : name(r.attack)}</b>, attacker is ${r.phaseBefore === 'inside' ? '<b>inside</b>' : 'outside'}.`);
    else bits.push(`No visibility on the attacker this round.`);
    if (r.hunt === 'evicted') { bits.push(`<b>Hunt hit: intruder evicted.</b>`); tone = 'good'; }
    if (r.hunt === 'backdoor-burned') { bits.push(`<b>Hunt hit a backdoor</b> and burned it. The intruder is still in.`); tone = 'hit'; }
    if (r.hunt === 'nothing-found') bits.push(`Hunt found nothing. Clean, or dormant?`);
    if (r.compromiseDelta) { bits.push(`<b>Compromise ${signed(r.compromiseDelta)}.</b>`); tone = 'hit'; }
    bits.push(`Suspicion now ${Math.round(belief * 100)}%.`);
    return { html: bits.join(' '), tone };
  }

  async function play(mine: string) {
    if (busy || state.winner) return;
    busy = true;
    $('actions').querySelectorAll('button').forEach((b) => ((b as HTMLButtonElement).disabled = true));
    const a = setup.role === 'attacker' ? mine : cpuAtt!(attackerView(state, history), rng);
    const d = setup.role === 'defender' ? mine : cpuDef!(defenderView(state, history), rng);
    const out = resolveRound(arena, st, state, a, d, rng);
    history.push(out.result);
    state = out.state;
    const r = out.result;

    const hit: NodeId[] = r.attack === 'A6' ? ['staff'] : r.attack === 'A8' || r.attack === 'A4' ? ['db'] : ['web'];
    // only a hunt hit cancels an attack; an empty hunt outside leaves it alone (and the attacker never feels it)
    const hunted = r.hunt === 'evicted' || r.hunt === 'backdoor-burned';
    const landed = r.blocked === false && !hunted;
    const felt = r.hunt === 'nothing-found' && r.phaseBefore === 'outside' ? null : r.hunt;
    if (setup.role === 'attacker') {
      await animate(svg, { attack: a, landed, defense: null, hit, foothold: state.phase === 'inside' ? 'yes' : 'no', backdoor: state.backdoor });
      if (!svg.isConnected) return; // player left mid-animation
      const rep = attackerReport(r);
      $('report').className = `report ${rep.tone}`;
      $('report').innerHTML = `<h3>ROUND ${r.round}</h3>${rep.html}${state.winner ? '' : `<p class="tip-line"><b>TIP</b> ${tip('attacker', st, state, history, 0)}</p>`}`;
      replay($('report'), 'in');
    } else {
      const belief = insideBelief(defenderView(state, history));
      await animate(svg, {
        attack: r.attackSeen ? a : r.compromiseDelta > 0 && r.phaseBefore === 'inside' ? 'A8' : null,
        landed: r.attackSeen ? landed : true, defense: r.defense, hit,
        foothold: belief >= 1 ? 'yes' : belief > 0.3 ? 'unknown' : 'no', backdoor: false,
      });
      if (!svg.isConnected) return;
      const rep = defenderReport(r, belief);
      $('report').className = `report ${rep.tone}`;
      $('report').innerHTML = `<h3>ROUND ${r.round}</h3>${rep.html}${state.winner ? '' : `<p class="tip-line"><b>TIP</b> ${tip('defender', st, state, history, belief)}</p>`}`;
      replay($('report'), 'in');
    }
    heat();
    lines.unshift(`<div>R${r.round} ${setup.role === 'attacker' ? `${name(a)}${r.blocked ? ' (blocked)' : ''}${r.breached ? ' BREACH' : ''}${felt ? ` [${felt}]` : ''}` : `${name(r.defense)}${r.attackSeen ? ` / saw ${name(a)}` : ''}${r.hunt ? ` [${r.hunt}]` : ''}`} · C ${fmt(state.compromise)}</div>`);
    $('log').innerHTML = lines.join('');
    renderHud();
    busy = false;
    if (state.winner) {
      $('actions').innerHTML = `<button class="btn primary" id="finish">SEE RESULT</button>`;
      $('finish').addEventListener('click', () => onEnd({ setup, final: state, history }));
    } else renderActions();
  }

  // The room reddens as the attack goes deeper: attacker plays on a dark board, defender on paper.
  function heat() {
    const h = setup.role === 'attacker'
      ? (state.phase === 'inside' ? 0.3 : 0) + state.compromise / 140
      : state.compromise / 100;
    document.body.style.setProperty('--heat', `${Math.min(1, h)}`);
  }
  document.body.className = setup.role === 'attacker' ? 'dark' : 'light';
  heat();
  renderHud();
  renderActions();
  attachHelp(root);
  const key = `toured-${setup.role}`;
  const seen = (() => { try { return localStorage.getItem(key); } catch { return '1'; } })();
  const runTour = () => tour(root, TOUR[setup.role], () => { try { localStorage.setItem(key, '1'); } catch { /* private mode */ } });
  $('help').addEventListener('click', runTour);
  $('quit').addEventListener('click', onQuit);
  if (!seen) setTimeout(runTour, 500);
}
