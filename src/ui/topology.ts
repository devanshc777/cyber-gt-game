// Packet-Tracer-style network drawing for the website arena, plus the per-round animation.
// What gets animated is decided by the caller from the player's information set: the attacker never sees the
// defense, the defender sees the attack only under IDS.

const NS = 'http://www.w3.org/2000/svg';

const NODES = {
  atk: { x: 62, y: 180, label: 'ATTACKER' },
  net: { x: 182, y: 180, label: 'INTERNET' },
  fw: { x: 302, y: 180, label: 'FIREWALL' },
  web: { x: 432, y: 104, label: 'WEB SERVER' },
  db: { x: 568, y: 104, label: 'DATABASE' },
  staff: { x: 432, y: 262, label: 'STAFF PC' },
  soc: { x: 568, y: 262, label: 'SOC' },
} as const;
export type NodeId = keyof typeof NODES;

const WIRES: [NodeId, NodeId, boolean][] = [
  ['atk', 'net', false], ['net', 'fw', false], ['fw', 'web', true], ['web', 'db', true],
  ['fw', 'staff', true], ['staff', 'soc', true], ['db', 'soc', true],
];

/** Generated art lives in public/art, one PNG per node or action id. */
export const art = (id: string) => `${import.meta.env.BASE_URL}art/${id}.png`;

const ICON = 64;

function shape(id: NodeId): string {
  const { x, y } = NODES[id];
  const h = ICON / 2;
  return `<rect class="plate" x="${x - h - 6}" y="${y - h - 6}" width="${ICON + 12}" height="${ICON + 12}" rx="6"/><image href="${art(id)}" x="${x - h}" y="${y - h}" width="${ICON}" height="${ICON}"/>`;
}

export function topologySvg(): string {
  const wires = WIRES.map(([a, b, lan]) =>
    `<line class="wire${lan ? ' lan' : ''}" x1="${NODES[a].x}" y1="${NODES[a].y}" x2="${NODES[b].x}" y2="${NODES[b].y}"/>`).join('');
  const nodes = (Object.keys(NODES) as NodeId[]).map((id) =>
    `<g class="node" id="n-${id}">${shape(id)}<text x="${NODES[id].x}" y="${NODES[id].y + ICON / 2 + 20}">${NODES[id].label}</text></g>`).join('');
  return `<svg viewBox="0 0 640 340" role="img" aria-label="Network map: attacker, internet, firewall, and the website network with web server, database, staff PC and SOC">
    <rect class="zone" x="256" y="40" width="372" height="282" rx="4"/><text class="zone-label" x="268" y="58">WEBSITE NETWORK</text>
    ${wires}${nodes}<g id="fx"></g></svg>`;
}

const routes: Record<string, NodeId[]> = {
  A1: ['atk', 'net', 'fw'],
  A3: ['atk', 'net', 'fw', 'web'],
  A4: ['atk', 'net', 'fw', 'web', 'db'],
  A5: ['atk', 'net', 'fw', 'web'],
  A6: ['atk', 'net', 'fw', 'staff'],
  A2: ['web', 'db'],
  A8: ['db', 'web', 'fw', 'net', 'atk'],
  A9: ['fw', 'web'],
};

const defenseNodes: Record<string, NodeId[]> = {
  D1: ['soc', 'fw', 'web', 'db', 'staff'], D2: ['web'], D3: ['fw'], D4: ['web', 'db'],
  D5: ['fw'], D6: ['staff'], D7: ['web', 'db', 'staff'], D8: [],
};

function el(tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

export interface Scene {
  attack: string | null; // null: the viewer did not see the attack
  landed: boolean;
  defense: string | null; // null: the viewer did not see the defense
  hit: NodeId[]; // nodes to flash as damaged
  foothold: 'yes' | 'no' | 'unknown';
  backdoor: boolean;
}

/** Plays one round's animation; resolves when it ends. */
export function animate(svg: SVGSVGElement, scene: Scene): Promise<void> {
  const fx = svg.querySelector('#fx')!;
  fx.innerHTML = '';
  svg.querySelectorAll('.node').forEach((n) => n.classList.remove('lit', 'hit', 'dim'));
  const node = (id: NodeId) => svg.querySelector(`#n-${id}`)!;

  for (const id of scene.defense ? defenseNodes[scene.defense]! : []) node(id).classList.add('lit');
  if (scene.defense === 'D7' || scene.defense === 'D1') {
    for (const id of defenseNodes[scene.defense]!) fx.append(el('circle', { class: 'ping', cx: NODES[id].x, cy: NODES[id].y, r: 6 }));
  }
  // The foothold badge shows the state after the round, so it waits until the packets have arrived.
  const badge = () => {
    if (scene.foothold === 'no') return;
    const { x, y } = NODES.web;
    fx.append(el('rect', { class: 'badge-bg', x: x + 14, y: y - 62, width: scene.backdoor ? 62 : 22, height: 16, style: scene.foothold === 'unknown' ? 'opacity:.5' : '' }));
    const t = el('text', { class: 'badge', x: x + 18, y: y - 50 });
    t.textContent = scene.foothold === 'unknown' ? '??' : scene.backdoor ? 'IN + BD' : 'IN';
    fx.append(t);
  };

  const done = new Promise<void>((resolve) => setTimeout(resolve, 1300));
  if (!scene.attack || scene.attack === 'A7') badge();
  if (!scene.attack) return done;
  if (scene.attack === 'A7') {
    node('atk').classList.add('dim');
    return done;
  }
  const path = routes[scene.attack]!;
  const d = path.map((id, i) => `${i ? 'L' : 'M'}${NODES[id].x},${NODES[id].y}`).join(' ');
  const count = scene.attack === 'A5' ? 6 : scene.attack === 'A3' ? 3 : 1;
  const end = NODES[path[path.length - 1]!];
  for (let i = 0; i < count; i++) {
    const c = el('circle', { class: `packet${scene.landed ? '' : ' blocked'}`, r: 6, cx: 0, cy: 0 });
    const m = el('animateMotion', { dur: '0.9s', begin: `${i * 0.12}s`, fill: 'freeze', path: d });
    c.append(m);
    fx.append(c);
    (m as unknown as { beginElement?: () => void }).beginElement?.();
  }
  setTimeout(() => {
    badge();
    if (scene.landed) for (const id of scene.hit) node(id).classList.add('hit');
    else {
      fx.append(el('line', { class: 'xmark', x1: end.x - 10, y1: end.y - 10, x2: end.x + 10, y2: end.y + 10 }));
      fx.append(el('line', { class: 'xmark', x1: end.x + 10, y1: end.y - 10, x2: end.x - 10, y2: end.y + 10 }));
    }
  }, 950);
  return done;
}
