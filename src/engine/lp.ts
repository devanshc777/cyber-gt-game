// Zero-sum matrix game solver. Row player maximises M[i][j].
// Shift M positive, solve the column player's LP (max sum y, A y <= 1) by tableau simplex with
// Bland's rule, read the row strategy off the slack reduced costs. Exact up to float error;
// fine for matrices this size (tens of rows), O(n^3) per solve.

export interface Solution {
  value: number;
  row: number[];
  col: number[];
}

export function solveZeroSum(M: number[][]): Solution {
  const m = M.length;
  const n = M[0]!.length;
  let min = Infinity;
  for (const r of M) for (const v of r) min = Math.min(min, v);
  const k = 1 - min;

  // Tableau: m constraint rows, n decision vars + m slacks + rhs. Objective row last.
  const W = n + m + 1;
  const T: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array<number>(W).fill(0);
    for (let j = 0; j < n; j++) row[j] = M[i]![j]! + k;
    row[n + i] = 1;
    row[W - 1] = 1;
    T.push(row);
  }
  const obj = new Array<number>(W).fill(0);
  for (let j = 0; j < n; j++) obj[j] = -1;
  T.push(obj);
  const basis = Array.from({ length: m }, (_, i) => n + i);
  const eps = 1e-12;

  for (let iter = 0; iter < 10000; iter++) {
    let pc = -1;
    for (let j = 0; j < W - 1; j++) if (T[m]![j]! < -eps) { pc = j; break; }
    if (pc < 0) break;
    let pr = -1;
    let best = Infinity;
    for (let i = 0; i < m; i++) {
      const a = T[i]![pc]!;
      if (a > eps) {
        const ratio = T[i]![W - 1]! / a;
        if (ratio < best - eps || (Math.abs(ratio - best) <= eps && basis[i]! < basis[pr]!)) {
          best = ratio;
          pr = i;
        }
      }
    }
    if (pr < 0) throw new Error('unbounded LP');
    const p = T[pr]![pc]!;
    for (let j = 0; j < W; j++) T[pr]![j]! /= p;
    for (let i = 0; i <= m; i++) {
      if (i === pr) continue;
      const f = T[i]![pc]!;
      if (f !== 0) for (let j = 0; j < W; j++) T[i]![j] = T[i]![j]! - f * T[pr]![j]!;
    }
    basis[pr] = pc;
  }

  const total = T[m]![W - 1]!;
  const col = new Array<number>(n).fill(0);
  basis.forEach((b, i) => { if (b < n) col[b] = T[i]![W - 1]! / total; });
  const row = Array.from({ length: m }, (_, i) => T[m]![n + i]! / total);
  return { value: 1 / total - k, row, col };
}
