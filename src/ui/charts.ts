// Small SVG chart kit for the analysis page. Colour has a job: warm = attacker side, blue-green = defender
// side (validated pair, CVD dE 12.2 on the paper surface), grey = neutral midpoint. Text stays in ink.

const WARM = [217, 81, 44];
const COOL = [19, 145, 125];
const MID = [207, 206, 199];

const mix = (a: number[], b: number[], t: number) => `rgb(${a.map((x, i) => Math.round(x + (b[i]! - x) * t)).join(',')})`;

/** Diverging: t in [-1, 1]; negative leans defender (blue-green), positive leans attacker (warm). */
export function diverging(t: number): string {
  const c = Math.max(-1, Math.min(1, t));
  return c >= 0 ? mix(MID, WARM, c) : mix(MID, COOL, -c);
}
export const ATTACKER = mix(WARM, WARM, 0);
export const DEFENDER = mix(COOL, COOL, 0);

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** Heatmap with per-cell values; data-tip drives the hover tooltip. */
export function heatmap(opts: {
  rows: string[]; cols: string[]; values: number[][]; color: (v: number) => string; fmt: (v: number) => string;
  tip: (r: number, c: number) => string; cell?: number; rowW?: number;
}): string {
  const cw = opts.cell ?? 54, ch = 30, rw = opts.rowW ?? 120, head = 34;
  const w = rw + cw * opts.cols.length, h = head + ch * opts.rows.length;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  opts.cols.forEach((c, j) => (s += `<text x="${rw + j * cw + cw / 2}" y="${head - 10}" text-anchor="middle" class="ax">${esc(c)}</text>`));
  opts.rows.forEach((r, i) => {
    s += `<text x="${rw - 8}" y="${head + i * ch + ch / 2 + 4}" text-anchor="end" class="ax">${esc(r)}</text>`;
    opts.cols.forEach((_, j) => {
      const v = opts.values[i]![j]!;
      s += `<g data-tip="${esc(opts.tip(i, j))}"><rect x="${rw + j * cw + 1}" y="${head + i * ch + 1}" width="${cw - 2}" height="${ch - 2}" rx="2" fill="${opts.color(v)}"/>`;
      s += `<text x="${rw + j * cw + cw / 2}" y="${head + i * ch + ch / 2 + 4}" text-anchor="middle" class="val">${opts.fmt(v)}</text></g>`;
    });
  });
  return s + '</svg>';
}

/** Horizontal bars, one series. */
export function hbars(items: { label: string; value: number; tip?: string }[], opts: { max: number; color: string; unit?: string; labelW?: number }): string {
  const lw = opts.labelW ?? 130, bw = 260, bh = 18, gap = 6;
  const h = items.length * (bh + gap) + 4;
  let s = `<svg viewBox="0 0 ${lw + bw + 56} ${h}" class="chart" role="img">`;
  items.forEach((it, i) => {
    const y = i * (bh + gap) + 2;
    const len = Math.max(it.value > 0 ? 2 : 0, (it.value / opts.max) * bw);
    s += `<g data-tip="${esc(it.tip ?? `${it.label}: ${it.value}${opts.unit ?? ''}`)}">`;
    s += `<rect x="${lw}" y="${y}" width="${bw}" height="${bh}" fill="transparent"/>`;
    s += `<text x="${lw - 8}" y="${y + bh - 5}" text-anchor="end" class="ax">${esc(it.label)}</text>`;
    s += `<rect x="${lw}" y="${y}" width="${len}" height="${bh}" rx="3" fill="${opts.color}"/>`;
    s += `<text x="${lw + len + 6}" y="${y + bh - 5}" class="val">${it.value}${opts.unit ?? ''}</text></g>`;
  });
  return s + `<line x1="${lw}" y1="0" x2="${lw}" y2="${h}" class="axis"/></svg>`;
}

/** Vertical bars grouped by category, two series with a legend and direct value labels. */
export function groupedBars(groups: string[], series: { name: string; color: string; values: number[] }[], opts: { max: number; unit?: string }): string {
  const gw = 110, bw = 30, base = 170, top = 28, h = base + 30;
  const w = 40 + groups.length * gw;
  let s = `<svg viewBox="0 0 ${w} ${h}" class="chart" role="img">`;
  for (const g of [0, 50, 100]) {
    const y = base - (g / opts.max) * (base - top);
    s += `<line x1="36" x2="${w}" y1="${y}" y2="${y}" class="grid"/><text x="30" y="${y + 4}" text-anchor="end" class="ax">${g}</text>`;
  }
  groups.forEach((g, i) => {
    const x0 = 40 + i * gw + (gw - series.length * (bw + 2)) / 2;
    series.forEach((se, k) => {
      const v = se.values[i]!;
      const bh = (v / opts.max) * (base - top);
      const x = x0 + k * (bw + 2);
      s += `<g data-tip="${esc(`${g}, ${se.name}: ${v}${opts.unit ?? ''}`)}"><rect x="${x}" y="${base - bh}" width="${bw}" height="${bh}" rx="3" fill="${se.color}"/>`;
      s += `<text x="${x + bw / 2}" y="${base - bh - 5}" text-anchor="middle" class="val">${Math.round(v)}</text></g>`;
    });
    s += `<text x="${40 + i * gw + gw / 2}" y="${base + 18}" text-anchor="middle" class="ax">${esc(g)}</text>`;
  });
  s += `<line x1="36" x2="${w}" y1="${base}" y2="${base}" class="axis"/>`;
  return s + '</svg>' + legend(series);
}

export function legend(series: { name: string; color: string }[]): string {
  return `<div class="legend">${series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
}

/** Histogram of game lengths. */
export function histogram(counts: number[], color: string, from = 1): string {
  const data = counts.slice(from);
  const max = Math.max(...data, 1);
  const bw = 16, base = 120, top = 10, w = 30 + data.length * bw;
  let s = `<svg viewBox="0 0 ${w} ${base + 24}" class="chart" role="img">`;
  data.forEach((c, i) => {
    const bh = (c / max) * (base - top);
    s += `<g data-tip="${from + i} rounds: ${c} games"><rect x="${26 + i * bw}" y="${top}" width="${bw - 2}" height="${base - top}" fill="transparent"/><rect x="${26 + i * bw}" y="${base - bh}" width="${bw - 2}" height="${bh}" rx="2" fill="${color}"/></g>`;
    if ((from + i) % 5 === 0 || i === 0) s += `<text x="${26 + i * bw + bw / 2}" y="${base + 16}" text-anchor="middle" class="ax">${from + i}</text>`;
  });
  return s + `<line x1="24" x2="${w}" y1="${base}" y2="${base}" class="axis"/></svg>`;
}

/** One stacked 100% bar with labelled segments and a 2px surface gap between fills. */
export function stack(parts: { label: string; value: number; color: string }[]): string {
  const w = 460, h = 26;
  let x = 0, s = `<svg viewBox="0 0 ${w} ${h + 22}" class="chart stackbar" role="img">`;
  for (const p of parts) {
    const pw = (p.value / 100) * w;
    s += `<g data-tip="${esc(`${p.label}: ${p.value}%`)}"><rect x="${x + 1}" y="0" width="${Math.max(0, pw - 2)}" height="${h}" rx="3" fill="${p.color}"/>`;
    if (pw > 60) s += `<text x="${x + 6}" y="${h + 16}" class="val">${esc(p.label)} ${Math.round(p.value)}%</text>`;
    s += '</g>';
    x += pw;
  }
  return s + '</svg>';
}

/** One tooltip for the whole page: any element with data-tip under the pointer. */
export function attachTooltips(root: HTMLElement) {
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.hidden = true;
  root.append(tip);
  root.addEventListener('mousemove', (e) => {
    const t = (e.target as Element).closest('[data-tip]');
    if (!t) return void (tip.hidden = true);
    tip.textContent = t.getAttribute('data-tip');
    tip.hidden = false;
    tip.style.left = `${e.clientX + 14}px`;
    tip.style.top = `${e.clientY + 14}px`;
  });
  root.addEventListener('mouseleave', () => (tip.hidden = true));
}
