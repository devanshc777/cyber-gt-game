# Spec review: what GAME-SPEC.md says vs what it does

Read of `GAME-SPEC.md` before any engine code, 2026-10-30. Each item is marked
**measured** (a command produced it), **inference** (reasoned, not run) or **ambiguity** (the spec allows two readings).
Items needing Devansh's ruling are tagged `[DECIDE]`. Resolved ones move to `SPEC-CHANGES.md`.

## 1. Stage game, solved (measured)

`uv run --with numpy --with scipy python -I tools/stage_check.py` on the section 4 matrix:

| Check | Result |
|---|---|
| Pure-strategy NE | none (every cell has a profitable deviation), so the spec's claim holds |
| Strictly dominated attacker rows | none |
| Dominated defender columns | D8 Idle, weakly dominated by every other defense (as designed: it exists for budget) |
| Game value (attacker) | **+1.625** damage points per round |
| Attacker minimax mix | SQLi 26.2%, DoS 37.5%, Phishing 36.2%; everything else 0 |
| Defender minimax mix | **IDS 75%**, WAF 12.5%, Training 12.5%; everything else 0 |

What that means:
- **4 of 7 attacker actions and 5 of 8 defender actions never appear in the one-shot equilibrium.** Port Scan, Sniffing,
  Brute Force, Lay Low, RateLim, Encrypt, Firewall, Audit only earn a place through *state*: knowledge bonus, risk,
  budget. That is a good report story ("the stage game alone is degenerate; state is what makes the full game rich"),
  but only if the simulation shows them coming back.
- **IDS at 75% breaks the section 10 target** ("no single action over ~40% by the Nash CPU") in the stage game.
  The per-state LP (cost weight mu, risk weight lambda) may pull it down. Measure in M2 before touching numbers.
- Expected compromise under equilibrium is about 1.625 x 3 = 4.9 C per round, so ~20 rounds to reach C = 100,
  before WAF repairs. **Inference:** the attacker may struggle to win inside 20 rounds at all, which would push the
  attacker win rate below the 45-55% target. The sim settles it.

## 2. Ambiguities in the rules

| # | Where | Two readings | Proposed default |
|---|---|---|---|
| A1 | s5 step 7 | Lay Low has P = 0, and "P <= 0 adds +5 noisy failure". Does laying low add +5? | No. The +5 applies to attacks only (A1-A6); Lay Low is always exactly -10, matching s6's last line. |
| A2 | s7 tables | Easy CPU is "Random / greedy". Which one? | `[DECIDE]` Option: epsilon-greedy, 50% random, 50% greedy. Keeps the ladder Easy < Normal < Hard. |
| A3 | s8 + s9 | Does the CPU see more than a human in its seat? Greedy defender counts attacker frequencies, but s9 says the defender only sees the attack under D1/D7. | CPU gets the same information set as a human in that role. Greedy defender counts only observed actions. Fair, and IDS gains real value for the CPU too. `[DECIDE]` |
| A4 | s9 | Defender "sees current C". The size of the C jump reveals P, which narrows down the attack. | Keep it. Note it in the report as partial information leakage (a signal, CO on signalling). |
| A5 | s5 step 2 | Forced Idle when broke: does the UI grey out unaffordable actions or let the player pick and silently idle? | Grey them out. Hidden failures read as bugs. |
| A6 | s7.1 | Regen variant "+1 every 3 rounds": on or off by default? | Off (spec says "optional"). A settings toggle later. |
| A7 | s8 Nash attacker | lambda x (risk delta): the delta depends on the defender's column (multiplier), so A_eff is per cell. | Per cell. Each cell carries its own risk delta. |
| A8 | s5 step 8 | Is the caught roll made when R crosses threshold in the same round the attacker hits C >= 100? | Order as written: compromise (step 5) then caught (step 8) then win checks (step 9). If both happen, `[DECIDE]` who wins. Proposed: attacker, since the breach already landed. |

## 3. Things the spec does not cover yet (for the build, not the rules)

- **Seeded RNG.** Simulations must be reproducible: one seed per batch, logged with results.
- **Arena as data.** The website arena's actions, matrix, multipliers and costs live in one data file, so a second
  arena is a new file, not new engine code. (He wants more arenas later; this is the cheap way to leave room.)
- **"Train the agents again"** (from his brief, not the spec): after the sim, fit CPU opponents against the observed
  equilibrium. Candidate: regret matching / fictitious play (s12 last bullet). Ties to the syllabus topic "learning in games".
