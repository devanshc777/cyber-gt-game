"""Stage-game oracle: pure NE, dominance and the minimax LP for each phase matrix (spec s4).

Run: uv run --with numpy --with scipy python -I tools/stage_check.py
The TS solver (src/engine/lp.ts) must agree with these numbers to 1e-6.
"""
import numpy as np
from scipy.optimize import linprog

D = ["IDS", "WAF", "RateLim", "Encrypt", "Firewall", "Training", "Hunt", "Idle"]
COST = np.array([2, 2, 1, 2, 1, 2, 2, 0], float)
KAPPA = 3  # spec s8: one budget point burned is worth 3 damage to the attacker

GAMES = {
    "v1 (original brief, 7x8)": (
        ["Scan", "Sniff", "Brute", "SQLi", "DoS", "Phish", "LayLow"],
        [[-2, 1, 1, 1, -2, 2, -1, 2], [1, 3, 3, -3, 1, 3, 0, 4], [-3, 3, -4, 3, 0, 4, 1, 5],
         [2, -5, 6, 6, 3, 6, 2, 8], [1, 3, -2, 4, -2, 4, 2, 5], [2, 5, 5, 5, 5, -4, 4, 6], [0] * 8],
    ),
    "v2 Outside (6x8)": (
        ["Scan", "Brute", "SQLi", "DoS", "Phish", "LayLow"],
        [[-2, 1, 1, 1, -2, 2, -1, 2], [-3, 3, -4, 3, 0, 4, 1, 5], [2, -5, 6, 6, 3, 6, 2, 8],
         [1, 3, -2, 4, -2, 4, 2, 5], [2, 5, 5, 5, 5, -4, 4, 6], [0] * 8],
    ),
    "v2 Inside (4x8)": (
        ["Sniff", "Exfil", "Persist", "LayLow"],
        [[1, 3, 3, -3, 1, 3, 0, 4], [2, 5, 5, 2, 2, 5, -3, 6], [1, 1, 1, 1, 1, 1, -2, 1], [0] * 8],
    ),
}


def solve_row(M):  # maximize v s.t. x^T M >= v, sum x = 1
    m, n = M.shape
    c = np.r_[np.zeros(m), -1]
    r = linprog(c, A_ub=np.c_[-M.T, np.ones(n)], b_ub=np.zeros(n),
                A_eq=[np.r_[np.ones(m), 0]], b_eq=[1], bounds=[(0, None)] * m + [(None, None)])
    return r.x[:m], r.x[m]


def report(name, A, M):
    m, n = M.shape
    pure = [(A[i], D[j]) for i in range(m) for j in range(n)
            if M[i, j] == M[:, j].max() and M[i, j] == M[i, :].min()]
    rows = [(A[i], "by", A[k]) for i in range(m) for k in range(m)
            if k != i and np.all(M[k] >= M[i]) and np.any(M[k] > M[i])]
    cols = [(D[j], "by", D[k]) for j in range(n) for k in range(n)
            if k != j and np.all(M[:, k] <= M[:, j]) and np.any(M[:, k] < M[:, j])]
    x, v = solve_row(M)
    y, _ = solve_row(-M.T)
    print(f"\n== {name}")
    print("pure NE:", pure)
    print("dominated attacker rows:", rows)
    print("dominated defender cols:", cols)
    print("value (attacker) =", round(v, 4))
    print("attacker mix:", {A[i]: round(x[i], 4) for i in range(m) if x[i] > 1e-6})
    print("defender mix:", {D[j]: round(y[j], 4) for j in range(n) if y[j] > 1e-6})


for name, (A, P) in GAMES.items():
    P = np.array(P, float)
    report(name, A, P)
    if name.startswith("v2"):
        report(name + f" + kappa x cost (kappa={KAPPA})", A, P + KAPPA * COST)
