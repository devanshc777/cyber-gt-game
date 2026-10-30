import { website as arena } from '../engine/arenas/website';
import { affordable, attackerOptions, newGame, resolveRound } from '../engine/engine';
import { attackerView, defenderView, insideBelief, makeAttackerCpu, makeDefenderCpu, type CpuKind } from '../engine/cpu';
import { makeRng } from '../engine/rng';
import type { Difficulty, GameState, Role, RoundResult } from '../engine/types';
import { ACTION_BLURB } from './copy';
import { animate, art, topologySvg, type NodeId } from './topology';

export interface MatchSetup { role: Role; difficulty: Difficulty; cpu: CpuKind; label: string }
export interface MatchEnd { setup: MatchSetup; final: GameState; history: RoundResult[] }

const name = (id: string) => [...arena.attackers, ...arena.defenders].find((x) => x.id === id)!.name;
const signed = (x: number) => (x > 0 ? `+${x}` : `${x}`);
const fmt = (x: number) => (Number.isInteger(x) ? `${x}` : x.toFixed(1));

function meter(label: string, value: string, fill?: number, opts: { hot?: boolean; mark?: number; right?: string } = {}) {
  const bar = fill === undefined ? '' : `<div class="bar-track"><div class="bar-fill${opts.hot ? ' hot' : ''}" style="width:${Math.min(100, fill)}%"></div>${opts.mark === undefined ? '' : `<div class="bar-mark" style="left:${opts.mark}%"></div>`}</div>`;
  return `<div class="meter"><div class="k"><span>${label}</span><span>${opts.right ?? ''}</span></div><div class="v">${value}</div>${bar}</div>`;
}

export function startMatch(root: HTMLElement, setup: MatchSetup, onEnd: (e: MatchEnd) => void) {
  const st = arena.settings[setup.role][setup.difficulty];
  const rng = makeRng((Date.now() ^ (Math.random() * 2 ** 31)) >>> 0);
  const cpuAtt = setup.role === 'defender' ? makeAttackerCpu(setup.cpu, arena, st) : null;
  const cpuDef = setup.role === 'attacker' ? makeDefenderCpu(setup.cpu, arena, st) : null;
  let state = newGame(st);
  const history: RoundResult[] = [];
  const lines: string[] = [];
  let busy = false;

  root.innerHTML = `
    <div class="top-row">
      <h2>WEBSITE // YOU ARE THE ${setup.role.toUpperCase()}</h2>
      <span class="tag">${setup.label} CPU</span>
    </div>
    <div class="match">
      <div class="win topo"><div class="bar"><span>topology.pkt</span></div><div class="body">${topologySvg()}</div></div>
      <div class="win"><div class="bar"><span>${setup.role}.console</span></div><div class="body">
        <div class="hud" id="hud"></div>
        <div class="report" id="report"><h3>ROUND 1</h3>${setup.role === 'attacker'
          ? 'You start outside. Breach the server, then steal data until Compromise hits 100. Keep Risk under the trace line.'
          : 'The attacker starts outside. You cannot see where they are. Hold out 20 rounds or get them traced. Budget does not refill.'}</div>
        <div class="step-label">CHOOSE YOUR MOVE</div>
        <div class="actions" id="actions"></div>
        <div class="log" id="log"></div>
      </div></div>
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
    } else {
      const b = insideBelief(defenderView(state, history));
      $('hud').innerHTML = [
        meter('ROUND', `${t} / ${st.rounds}`),
        meter('BUDGET', `${state.budget}`, (100 * state.budget) / st.budget),
        meter('COMPROMISE', fmt(state.compromise), state.compromise, { hot: true }),
        meter('SUSPICION', `${Math.round(b * 100)}%`, b * 100),
      ].join('');
    }
  }

  function renderActions() {
    const ids = setup.role === 'attacker' ? attackerOptions(arena, state.phase) : arena.defenders.map((d) => d.id);
    const ok = setup.role === 'defender' ? affordable(arena, state.budget) : ids;
    $('actions').innerHTML = ids.map((id) => {
      const meta = setup.role === 'attacker'
        ? `risk ${arena.attackers.find((a) => a.id === id)!.baseRisk > 0 ? '+' : ''}${arena.attackers.find((a) => a.id === id)!.baseRisk}`
        : `cost ${arena.defenders.find((d) => d.id === id)!.cost}`;
      return `<button class="act" data-id="${id}" ${ok.includes(id) && !state.winner ? '' : 'disabled'}><img src="${art(id)}" alt=""><b>${name(id)}<i>${meta}</i></b><small>${ACTION_BLURB[id]}</small></button>`;
    }).join('');
    $('actions').querySelectorAll<HTMLButtonElement>('.act').forEach((b) => b.addEventListener('click', () => play(b.dataset.id!)));
  }

  function attackerReport(r: RoundResult) {
    const bits: string[] = [];
    let tone = '';
    if (r.hunt === 'evicted') { bits.push(`<b>Hunted.</b> They found you and threw you out. Back outside.`); tone = 'good'; }
    else if (r.hunt === 'backdoor-burned') bits.push(`<b>Hunted.</b> Your backdoor took the hit; you are still inside.`);
    else if (r.hunt === 'nothing-found') bits.push(`A hunt swept past. You stayed dormant and unseen.`);
    else if (r.blocked === null) bits.push(`You laid low.`);
    else if (r.blocked) { bits.push(`<b>${name(r.attack)} was blocked.</b> You do not know by what.`); tone = 'good'; }
    else { bits.push(`<b>${name(r.attack)} landed.</b>`); tone = 'hit'; }
    if (r.breached) bits.push(`<b>BREACH.</b> You are inside. They were not told.`);
    if (r.compromiseDelta) bits.push(`Compromise ${signed(r.compromiseDelta)}.`);
    bits.push(`Risk ${signed(+r.riskDelta.toFixed(2))}.`);
    if (r.knowledgeDelta) bits.push(`Knowledge ${signed(r.knowledgeDelta)}.`);
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
    const landed = r.blocked === false && !r.hunt;
    if (setup.role === 'attacker') {
      await animate(svg, { attack: a, landed, defense: null, hit, foothold: state.phase === 'inside' ? 'yes' : 'no', backdoor: state.backdoor });
      const rep = attackerReport(r);
      $('report').className = `report ${rep.tone}`;
      $('report').innerHTML = `<h3>ROUND ${r.round}</h3>${rep.html}`;
    } else {
      const belief = insideBelief(defenderView(state, history));
      await animate(svg, {
        attack: r.attackSeen ? a : r.compromiseDelta > 0 && r.phaseBefore === 'inside' ? 'A8' : null,
        landed: r.attackSeen ? landed : true, defense: r.defense, hit,
        foothold: belief >= 1 ? 'yes' : belief > 0.3 ? 'unknown' : 'no', backdoor: false,
      });
      const rep = defenderReport(r, belief);
      $('report').className = `report ${rep.tone}`;
      $('report').innerHTML = `<h3>ROUND ${r.round}</h3>${rep.html}`;
    }
    lines.unshift(`<div>R${r.round} ${setup.role === 'attacker' ? `${name(a)}${r.blocked ? ' (blocked)' : ''}${r.breached ? ' BREACH' : ''}${r.hunt ? ` [${r.hunt}]` : ''}` : `${name(r.defense)}${r.attackSeen ? ` / saw ${name(a)}` : ''}${r.hunt ? ` [${r.hunt}]` : ''}`} · C ${fmt(state.compromise)}</div>`);
    $('log').innerHTML = lines.join('');
    renderHud();
    busy = false;
    if (state.winner) {
      $('actions').innerHTML = `<button class="btn primary" id="finish">SEE RESULT</button>`;
      $('finish').addEventListener('click', () => onEnd({ setup, final: state, history }));
    } else renderActions();
  }

  renderHud();
  renderActions();
}
