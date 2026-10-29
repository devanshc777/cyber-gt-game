import { describe, expect, it } from 'vitest';
import { solveZeroSum } from './lp';
import { website } from './arenas/website';

describe('solveZeroSum', () => {
  it('solves rock-paper-scissors', () => {
    const s = solveZeroSum([[0, -1, 1], [1, 0, -1], [-1, 1, 0]]);
    expect(s.value).toBeCloseTo(0, 9);
    s.row.forEach((x) => expect(x).toBeCloseTo(1 / 3, 9));
    s.col.forEach((x) => expect(x).toBeCloseTo(1 / 3, 9));
  });

  it('matches the scipy oracle on the website Outside stage game (tools/stage_check.py)', () => {
    const s = solveZeroSum(Object.values(website.payoff.outside));
    expect(s.value).toBeCloseTo(1.625, 6);
    // Rows: Scan, Brute, SQLi, DoS, Phish, LayLow.
    const row = [0, 0, 0.2625, 0.375, 0.3625, 0];
    const col = [0.75, 0.125, 0, 0, 0, 0.125, 0, 0];
    row.forEach((x, i) => expect(s.row[i]).toBeCloseTo(x, 6));
    col.forEach((x, j) => expect(s.col[j]).toBeCloseTo(x, 6));
  });
});
