# Rubric review: is the backend rule set realistic and balanced?

> **Outcome:** Devansh picked Option C on 2026-10-30. It is now `GAME-SPEC.md` v2; changes logged in `SPEC-CHANGES.md`.

2026-10-30, run before committing the M1 engine, at Devansh's request. Every number below is **measured** with
`npx vite-node tools/probe.ts` (his rules) or `tools/probe2.ts` (kill-chain candidate). The seeds are 1..N, N = 2000
games per cell, Normal difficulty. Where I write **inference** or **proof**, that is reasoning, not a run.

**Limit on all tables:** the "CPU" rows use per-state LP opponents and hand-written heuristics, not a solved full
game. They can show that a rule set is broken, which is the job of a smell test. They cannot certify that it is fair.
That certification is M3/M4.

---

## 1. What is wrong with the current rubric

### 1.1 The defender has a winning pure strategy: always play IDS
| Attacker policy vs **always-IDS** | Attacker win % | Mean rounds |
|---|---|---|
| random | 0 | 5.0 |
| per-state Nash (s8) | 0 | 20.0 |
| always Phishing / always SQLi | 0 / 0 | 5.7 / 4.3 |
| phish or SQLi, lay low near the threshold | 0 / 0 | 20.0 |

**Proof it is not a tuning accident:** IDS costs 1, so 20 rounds cost 20 out of a budget of 24, and it never runs out.
Against IDS the attacker's best rows are SQLi and Phishing at +2, which means 6 C per round, so 17 hits to reach 100.
Each hit adds at least 7 x 1.75 = 12.25 risk, and a Lay Low takes off only 10. Staying under the threshold of 40
takes about one Lay Low per hit: around 34 rounds against a limit of 20. The attacker cannot win.

### 1.2 The spec's Hard CPU (s8) never attacks
Built as written, with risk weight lambda = 0.1 + R/200, the Nash attacker plays **Lay Low 100%** of the time. Lay Low
scores +lambda x 10 against every column. Every attack loses that much or more to its risk term, so hiding wins the maximin.
Even after a fix (count only the risk change that actually happens, since R cannot drop below 0), the per-state LP
still hides most of the time: **a one-round LP cannot see the clock**. Hiding in round 19 is worthless, but nothing
in its payoff says so.

### 1.3 Tuning the numbers only flips who dominates
I tried IDS cost 2, IDS x1.4 and compromise x5, the spec's own knobs in s10.4 order:

| v1 tuned | vs Nash defender | vs always-IDS | vs always-Training |
|---|---|---|---|
| per-state Nash attacker | **94%** | 100% | 100% |
| "phish until R is 15 below the threshold, then lay low" | **100%** | 100% | 100% |

A one-line policy beats everything. **The root cause is structural: Lay Low has no counter.** It costs nothing, cannot
be punished and resets the only resource that limits the attacker. Sirlin's first rule for double-blind games is
"everything has a counter". Lay Low is the one move here that doesn't.

### 1.4 Realism gaps (from the sources in s3)
- **Breaches are staged, not one bar.** Real intrusions go initial access, then foothold, then objective. Backdoors &
  Breaches deals one hidden card per phase: Initial Compromise, Pivot/Escalate, Persistence, C2/Exfil. Here every
  attack just fills a single Compromise bar.
- **Detection is slow and partial, not a police magnet.** Mandiant's 2026 median dwell time is **14 days**. In the
  sources, 50-80% of SOC alerts are false positives and 25-30% go uninvestigated. IDS should *reveal*, and it should
  cost real money (personnel is the largest security line item). One cheap button that also wins the game is the
  wrong shape.
- **The attack mix matches the real top vectors:** exploitation (DBIR 2026: 31%, up from 20%), credential abuse
  (13-22%) and phishing (about 16%). SQLi, Brute Force and Phishing stand for those three. Keep them.

---

## 2. Design principles taken from the research

1. **Every option needs a counter**, including Lay Low and Idle (Sirlin, *Designing Yomi*).
2. **Unequal, hard-to-compare payoffs** make mixing interesting (Sirlin). The matrix already does this. Keep it.
3. **Hidden persistent state** is where real security games live. In FlipIt (van Dijk, Juels, Oprea, Rivest 2012)
   nobody knows who controls the resource until they move. Dwell time is the same idea.
4. **Inspection-game logic for the defender:** checking costs money, and the equilibrium rate of cheating depends on
   that cost (von Stengel, *Inspection Games*). This gives a 2x2 the report can solve in closed form.
5. **Model the defender's uncertainty explicitly.** That is the main critique in *Game-Theoretic Cybersecurity: the
   Good, the Bad and the Ugly* (Collins et al. 2024): most models hand the defender a certainty it never has.
6. **Keep each stage game zero-sum by putting the budget in the payoff.** Finding: when the LP ignores the defender's
   costs, it assumes hunting is free, and the attacker hides forever. That is the textbook inspection-game failure.
   Scoring a burned budget point as kappa damage for the attacker repairs it and keeps his "sequence of zero-sum stage games" framing.

---

## 3. Three options, measured

### Option A: keep the rules, tune the numbers
Fails (s1.3). A cautious one-liner wins 100%. **Not recommended.**

### Option B: "v1.5" = A plus one rule: Self-Audit counters Lay Low
Lay Low under D7 Audit gives **+5 risk instead of -10** (the audit finds your traces). One added line of rules.

| v1.5 | vs Nash def | vs always-IDS | vs always-Training |
|---|---|---|---|
| Nash attacker | **54%**, 18.2 rounds (on target) | 100% | 100% |
| cautious phish | 83% | 100% | 100% |
| cautious SQLi | 70% | 100% | 100% |

Nash vs Nash hits the 45-55% target. In that game Lay Low is still 61% of the attacker's moves, and the defender's
counter (Audit 31%) is real. But simple heuristics still beat the defender CPU 70-83%, and every fixed defender loses
outright. The defender side stays thin: it has no way to win except the clock or a lucky catch.

### Option C: "kill chain" (two phases, hidden from the defender)
Keeps: his 8 defender actions and costs (IDS raised to 2), his outside-phase matrix rows unchanged, risk meter,
budget, Knowledge, 20 rounds, simultaneous secret picks. Adds four rules:

1. **Two phases: OUTSIDE and INSIDE.** Outside, the attacker has Port Scan, Brute Force, SQLi, DoS, Phishing and Lay
   Low (his rows). A successful Brute Force, SQLi or Phishing **breaches** with probability P/10, capped at 90%
   (Knowledge adds to P as before). The breach is **silent**: the defender is not told.
2. **Inside, the attacker has Sniffing** (moved from outside: you sniff from a network position, and it raises K),
   **Exfiltrate** (Data += P x 5), **Persist** (plant a backdoor) and **Lay Low**. The attacker wins at **Data 100**.
   Stolen data cannot be un-stolen, so Patch no longer repairs anything.
3. **D7 becomes Threat Hunt / Self-Audit** (still the dual-use scan). Outside it lowers K, as now. Inside it
   **evicts** an active attacker back outside (+10 risk, K-1), unless a backdoor absorbs it. A Lay Low attacker is
   not found: *"hunt found nothing"* is a false negative. Inside, this makes a three-way loop: Exfil beats no-hunt,
   Hunt beats Exfil/Sniff/Persist, Lay Low beats Hunt.
4. **The defender sees the phase only through evidence:** IDS that round, a hunt that hits, or Data rising.
   Otherwise it has to guess. That is the "uncertainty" the critique paper asks for, made playable.

Measured (heuristics plus LP CPUs):

| C, Normal | vs LP def | vs always-IDS | vs always-Hunt | vs always-Training | vs Training-then-Hunt |
|---|---|---|---|---|---|
| phish then exfil | 49% | 0% | 0% | 0% | 0% |
| cautious phish | 38% | 91% | 37% | **0%** | **0%** |
| cautious SQLi | 34% | 73% | 33% | **100%** | 88% |
| backdoor first | 8% | 73% | **1%** | 0% | 0% |

**No row and no column wins everywhere.** Every attacker plan has a defender plan that crushes it, and the reverse.
That cycle at the level of whole plans is what was missing; it is the RPS-of-strategies Sirlin describes in StarCraft
builds. Games last 15-19 rounds. The LP defender spreads across five actions with none above 44% (Idle 44, IDS 30,
Hunt 23), so the 40% target is nearly met with no tuning. **Open:** the LP attacker is still timid (1-7% wins). That
is the clock-blindness from s1.2, a CPU problem for M2 rather than a rules problem.

---

## 4. Recommendation (his call)

**Option C.** It fixes the dominance problem structurally rather than numerically. It matches how breaches actually
run (the three real top vectors, a silent foothold, dwell time, hunting). It hands the report three extra pieces of
game theory for free: an inspection game solved by hand (below), defender belief about a hidden phase, and a
two-state stochastic game. Cost: about four extra rules, two new attacker actions and a more involved engine (M1
grows by roughly a day). **Option B** is the cheap fallback: one rule, lands on target in Nash vs Nash, but the
defender stays thin.

### The inside phase as an inspection game (report-ready)
Simplify inside to Exfil vs Lay Low (attacker) and Hunt vs No-hunt (defender). Let g = gain from an unhunted exfil,
L = value of the lost foothold, h = cost of a hunt in damage units (kappa x 2). The zero-sum payoffs to the attacker:

| | Hunt | No hunt |
|---|---|---|
| Exfil | h - L | g |
| Lay Low | h | 0 |

Indifference gives: **attacker exfiltrates with q\* = h / (g + L); defender hunts with p\* = g / (g + L).** Cheaper
hunts mean less exfiltration. Bigger data prizes mean more hunting. The cost of inspection, not the size of the
penalty, sets how often the attacker cheats: the classic inspection-game result, now inside his game.

---

## 5. Decisions for Devansh

1. **A, B or C?** Or a mix, e.g. C without the backdoor rule (cut Persist if four rules feel like too many).
2. If C: is the attacker's goal **Data 100** OK, or should it stay "Compromise 100" in the wording?
3. The s8 CPU formulas need replacing either way (s1.2). Proposal: per-state LP on one shared zero-sum payoff
   (damage + kappa x defender cost - risk weight), plus a time-aware fix in M2. The "trained" tier (regret matching on
   sim data, M6) is the real answer to clock-blindness.
4. Rulings A1-A11 in `SPEC-CHANGES.md` still hold for B. For C, A1 (Lay Low has no +5), A8 and A9 carry over; the rest
   I'll re-check against the new text.

## Sources (read for this review)
- Verizon DBIR 2025 (PDF summary) and 2026 coverage (watchTowr, Descope): initial access vectors.
- Mandiant M-Trends 2026 (Google Cloud blog, Help Net Security): median dwell time 14 days.
- Black Hills InfoSec, *Backdoors & Breaches* visual guide; Datadog gameplay guide: four attack phases.
- Sirlin, *Designing Yomi* (sirlin.net): counters, unequal and unclear payoffs.
- van Dijk, Juels, Oprea, Rivest, *FlipIt: The Game of "Stealthy Takeover"*, J. Cryptology / IACR ePrint 2012/103 (abstract).
- von Stengel, *Inspection Games* (LSE notes), abstract and section headings only: the cost-of-inspection result. `[CONFIRM]` against the full text before citing.
- Collins et al., *Game-Theoretic Cybersecurity: the Good, the Bad and the Ugly*, arXiv 2401.13815 (via a review summary; `[CONFIRM]` against the paper).
- Alert-fatigue figures (Praetorian, Cymulate citing Proofpoint): vendor blogs, treat as rough.

Dropped: Colonel Blotto. It models splitting a budget across many fronts at once; this game has one action per round,
so it doesn't fit without a redesign. The cyber-investment and budgeting blogs were vendor marketing with no data.
