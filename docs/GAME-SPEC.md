# Cyber Game: Attacker vs Defender (Game Theory Project)

> Source of truth for the rules. **v2, "kill chain"**, adopted by Devansh on 2026-10-30 after the rubric review
> (`docs/RUBRIC-REVIEW.md`, Option C). His original brief is kept verbatim in `docs/GAME-SPEC-v1.md`.
> Do not edit rules here silently: a change goes in `docs/SPEC-CHANGES.md` with a reason, then here.

## 1. Overview
A repeated, simultaneous-move, two-player game over a fixed number of rounds.
The player picks a role (Attacker or Defender) and the CPU plays the other side.
Each round both sides pick one action secretly, then the round resolves.

**Asymmetric constraints (the core design idea)**
- Defender: scarce **budget** (resources).
- Attacker: scarce **time**, enforced by a rising **risk meter** (cyber police).

**Kill chain.** The attacker starts **Outside** and must breach the server to get **Inside**, where the damage is
done. The breach is silent: the defender does not know which phase the attacker is in unless it finds evidence.
This mirrors real intrusions (initial access, then foothold, then objective) and median dwell times of about two weeks.

**Game class:** finite repeated, simultaneous-move, stochastic (breach and detection rolls), imperfect information,
with state. Each phase has its own stage matrix. The base matrices are zero-sum; budget and risk act as constraints
and modifiers (see section 8).

## 2. State Variables
| Variable | Range | Start | Meaning |
|---|---|---|---|
| Phase | Outside / Inside | Outside | Where the attacker is. Hidden from the defender. |
| Compromise C | 0-100 | 0 | Damage done: data stolen plus service lost. Attacker's progress. |
| Risk R | 0-100 | 0 | How close the attacker is to being traced. |
| Knowledge K | 0-5 | 0 | Recon and credentials the attacker has gathered. |
| Backdoor | yes / no | no | A planted backdoor survives one eviction. |
| Budget B | 0-max | by difficulty | Defender's remaining resources. |
| Round t | 1-20 | 1 | Current round. |

## 3. Actions

### 3.1 Attacker actions, Outside (initial access)
| ID | Action | Description | Base risk |
|---|---|---|---|
| A1 | Port Scan | Recon. Raises K if it lands. | +6 |
| A3 | Brute Force | Credential abuse. Can breach. | +15 |
| A4 | SQL Injection | Exploit an unpatched web flaw. Can breach. | +10 |
| A5 | DoS Flood | Knock the service over. Deals C directly, cannot breach. | +18 |
| A6 | Phishing | Social engineering. Can breach. | +7 |
| A7 | Lay Low | No attack. Cools down risk. | -10 |

### 3.2 Attacker actions, Inside (after a breach)
| ID | Action | Description | Base risk |
|---|---|---|---|
| A2 | Packet Sniffing | Harvest credentials from inside the network. Raises K if it lands. | +4 |
| A8 | Exfiltrate | Steal data. The main source of C. | +8 |
| A9 | Persist | Plant a backdoor that survives one eviction. | +5 |
| A7 | Lay Low | Go dormant. Cools risk, and a hunt cannot find you. | -10 |

### 3.3 Defender actions (one menu; the defender does not know the phase)
| ID | Action | Cost | Effect |
|---|---|---|---|
| D1 | IDS / Monitoring | 2 | Risk x1.5 on any attack. Reveals the attacker's action and phase this round. |
| D2 | WAF / Patch | 2 | Blocks SQL injection and web attacks. |
| D3 | Rate Limiting / MFA | 1 | Throttles brute force and DoS. Risk x1.25 against those two. |
| D4 | Encryption (TLS) | 2 | Neutralizes sniffing, weakens exfiltration. |
| D5 | Firewall / Egress filter | 1 | Closes ports: lowers K by 1 while the attacker is Outside. Risk x1.25 vs Port Scan, DoS, Exfiltrate. |
| D6 | Security Training | 2 | Counters phishing. |
| D7 | Threat Hunt (Self-Audit) | 2 | Dual-use port scan. Outside: finds your own exposure, lowers K by 1. Inside: **evicts** an active attacker (section 5). |
| D8 | Idle | 0 | Save budget. Server is exposed. |

**Dual-use action:** Port Scan appears on both sides (A1 and D7). Same technique, opposite purpose: the attacker
finds targets, the defender finds exposure and, once breached, the intruder.

## 4. Payoff Matrices (attacker's payoff, defender gets the negative)
Rows = attacker action, columns = defender action. Values are "damage points".
Positive helps the attacker, negative means the defense punished the attack.

### 4.1 Outside
| | D1 IDS | D2 WAF | D3 RateLim | D4 Encrypt | D5 Firewall | D6 Training | D7 Hunt | D8 Idle |
|---|---|---|---|---|---|---|---|---|
| A1 Port Scan | -2 | 1 | 1 | 1 | -2 | 2 | -1 | 2 |
| A3 Brute Force | -3 | 3 | -4 | 3 | 0 | 4 | 1 | 5 |
| A4 SQL Injection | 2 | -5 | 6 | 6 | 3 | 6 | 2 | 8 |
| A5 DoS Flood | 1 | 3 | -2 | 4 | -2 | 4 | 2 | 5 |
| A6 Phishing | 2 | 5 | 5 | 5 | 5 | -4 | 4 | 6 |
| A7 Lay Low | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

### 4.2 Inside
| | D1 IDS | D2 WAF | D3 RateLim | D4 Encrypt | D5 Firewall | D6 Training | D7 Hunt | D8 Idle |
|---|---|---|---|---|---|---|---|---|
| A2 Sniffing | 1 | 3 | 3 | -3 | 1 | 3 | 0 | 4 |
| A8 Exfiltrate | 2 | 5 | 5 | 2 | 2 | 5 | -3 | 6 |
| A9 Persist | 1 | 1 | 1 | 1 | 1 | 1 | -2 | 1 |
| A7 Lay Low | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Design logic**
- Every defense hard-counters something outside: WAF vs SQLi, RateLim vs brute force and DoS, Training vs phishing,
  IDS/Firewall/Hunt vs noisy recon.
- **Every option has a counter, including hiding.** Inside it is a three-way loop: Exfiltrate beats anything but a
  hunt, Hunt beats an active intruder, Lay Low beats Hunt (the hunt finds nothing and the budget is spent).
- The defender has to guess the phase. Training and WAF only matter Outside; Hunt and Encryption matter Inside.
  IDS tells you where you are, at a price.
- No pure strategy wins: the rubric review found a counter-plan for every fixed plan on both sides.

## 5. Round Resolution (order of operations)
1. Both players choose an action (hidden from each other). The attacker chooses from its current phase's list.
2. Defender pays the cost. If B < cost, the action is unavailable (forced to D8 Idle).
3. Look up payoff P in the current phase's matrix.
4. **Knowledge bonus:** if the attacker played A3, A4 or A8 and P > 0, then P += min(K, 3). K here is the value
   from before this round.
5. **Action effects.**
   - Outside:
     - A3, A4 or A6 with P > 0 **breaches** with probability min(P / 10, 0.9). On success the phase becomes Inside.
       The defender is not told.
     - A5 with P > 0: C += P x 2.
   - Inside, if the defender played D7 and the attacker did anything but Lay Low, it is a **hunt hit**:
     - If a backdoor exists and the attacker did not play A9 this round, the backdoor is burned and the attacker stays Inside.
     - Otherwise the attacker is **evicted**: phase becomes Outside and any backdoor is lost.
     - A hunt hit cancels the attacker's action effect this round.
   - Inside, otherwise:
     - A8 with P > 0: C += P x 5.
     - A9: backdoor planted.
   - C is clamped to 0-100.
6. **Knowledge update:**
   - A1 (Outside) or A2 (Inside, not hunted) with P > 0: K += 1.
   - D5 or D7 while the attacker was Outside at the start of the round: K -= 1.
   - Eviction: K -= 1.
   - K is clamped to 0-5.
7. **Risk update:**
   - delta = base risk x defender multiplier (table in section 6).
   - If P <= 0 (attack was blocked), delta += 5 (noisy failure in the logs).
   - Eviction adds +10 (incident response traces you).
   - The difficulty risk multiplier (section 7.2) scales the whole delta.
   - Lay Low gives delta = -10, always: no multipliers, no noisy failure.
   - R = clamp(R + delta, 0, 100).
8. **Caught check:** if R >= threshold, caught probability
   p = (R - threshold) / (100 - threshold). Roll once per round. R = 100 means caught for sure.
9. **Win checks:** C >= 100 gives attacker win, even if caught the same round. Caught gives defender win.
   After round 20 with neither, defender wins.

Random rolls happen only in step 5 (breach) and step 8 (caught), in that order, from one seeded RNG.

## 6. Risk Multipliers (defender action x attacker action)
Default multiplier is 1.0 unless listed.

| Defender action | Condition | Multiplier |
|---|---|---|
| D1 IDS | any attack | x1.5 |
| D3 Rate Limit | vs A3, A5 | x1.25 |
| D5 Firewall | vs A1, A5, A8 | x1.25 |

Multipliers do not apply to Lay Low (its -10 always happens).

## 7. Resources and Difficulty

### 7.1 Defender role (player is the defender)
| Difficulty | Starting budget | Regen/round | CPU attacker |
|---|---|---|---|
| Easy | 26 | +0 | Random / greedy |
| Normal | 20 | +0 | Greedy best-response |
| Hard | 14 | +0 | Nash mixed strategy |

Budget is one-time by default: the defender must ration across 20 rounds. Risk uses the Normal settings
(x1.0, threshold 40). Optional variant: +1 regen every 3 rounds (off by default).

### 7.2 Attacker role (player is the attacker)
| Difficulty | Risk multiplier | Caught threshold | CPU defender |
|---|---|---|---|
| Easy | x0.75 | 50 | Random / greedy |
| Normal | x1.0 | 40 | Greedy best-response |
| Hard | x1.25 | 30 | Nash mixed strategy |

The defender CPU starts with the Normal budget (20) in attacker mode.

## 8. CPU Opponent Models
A CPU sees exactly what a human in its seat sees (section 9).
Code: `src/engine/cpu.ts`. Measured strength: `npx vite-node tools/eval-cpus.ts`.

1. **Random:** uniform over available actions.
2. **Greedy best-response:** plays the best response to what it has observed of the opponent so far.
   - The defender counts the attacks it saw (IDS rounds only).
   - The attacker never sees a defense. It counts every defense consistent with what it did see: blocked or landed,
     and any hunt result.
   - Exploitable if the player varies their play.
   - **Easy** = 50% Random, 50% Greedy.
3. **Nash mixed (hard):** each round, build the current phase's matrix and solve the zero-sum LP, then sample.
   - **Shared cell value, a one-step lookahead.** Both sides score each (attack, defense) cell by the same number,
     so each stage game stays zero-sum:
     `value = win chance of the next state + 0.5 x progress - w x (actual risk change) + kappa x scarcity x (defender's cost)`.
   - **Win chance** is a rough estimate of whether the attacker can still reach C 100 in the rounds left, assuming
     5 C per round once Inside and 3 rounds to breach. It makes the CPU clock-aware: hiding is cheap early and fatal late.
   - **Progress** (C gained, plus 15 for a foothold) keeps a pull toward damage when the game looks lost. Without it
     the CPU gives up even against a defender that has run out of budget.
   - **Risk weight:** w = (0.05 + 1.5 x (R / threshold)^2) x clock, where clock = min(1, rounds left / 5). Risk
     matters most near the threshold and least near the end, since a timeout loses as surely as being caught.
   - **Budget term:** kappa = 3, scaled by scarcity = clamp(2 x rounds left / (B + 1), 0.25, 1.5). Without it the LP
     assumes hunting is free, and the attacker hides forever.
   - **Columns:** the defender removes columns it cannot afford. The attacker removes columns costing more than the
     most the defender can have left (start budget minus 2 per hunt it has felt).
   - **The defender does not know the phase.** It keeps a belief b that the attacker is Inside: the belief creeps up
     each unobserved round, jumps on evidence (IDS, a hunt hit, exfiltration-sized C jumps) and resets after an eviction.
     It then solves the Bayesian stage game as one matrix: each row is a pair (Outside action, Inside action) worth
     (1 - b) x Outside + b x Inside.
   - **Safe exploitation:** with a probability that grows with evidence (to at most 90%), the CPU plays its best
     response to the opponent's observed play instead of sampling the mix, but only when that response beats the mix
     against the same observed play. Pure maximin is too cautious to punish a predictable opponent.
   - Estimates the CPU cannot observe: the defender assumes R = threshold / 2, K = 1 and no backdoor; the attacker
     assumes the defender spends about 1.2 per round.
4. **Learned (menu level after Hard, Normal rules):** trained by regret matching in self-play
   (`tools/train.ts`, 20,000 games, output `src/engine/trained-policy.json`). Each side keeps one regret table
   per coarse state bucket (attacker: phase x risk band x stage of game; defender: phase belief x budget band x
   stage of game), scores every move it could have made against what the opponent actually did (the shared cell
   value above), and plays the average strategy. Falls back to the Nash CPU in any bucket it never visited.

**Why keep the base zero-sum:** budget and risk only change which actions are available or their weights. That
keeps each per-state solve a standard LP, defensible as "a sequence of zero-sum stage games under resource
constraints" in the report.

## 9. Information Structure
- Attacker sees: R, K, phase, backdoor, round, own history, and the result of the last round (blocked, succeeded,
  breached, hunted).
- Defender sees: B, round, and the current C.
- Defender sees the attacker's actual action and phase only if it played D1 that round.
- A hunt (D7) reports one of three results to the defender: "evicted", "backdoor burned" or "nothing found".
  "Nothing found" is what both an empty network and a dormant (Lay Low) intruder produce, so a clean result proves
  nothing: a false negative. The attacker feels a hunt only while Inside.
- A breach is never announced. The defender learns of it from IDS, a hunt hit, or C starting to rise.

## 10. Simulation Plan (for tuning the numbers)
1. Implement the state machine and resolution order exactly as in section 5.
2. Run CPU-vs-CPU batches, 10,000 games each: Random vs Random, Greedy vs Greedy, Nash vs Nash, Nash vs Greedy
   (both directions).
3. **Balance targets (Normal difficulty):**
   - Attacker win rate roughly 45-55%.
   - Average game length between 10 and 18 rounds.
   - No single action used over about 40% of the time by the Nash CPU.
   - No fixed policy (always X, or a simple rule) wins over 80% against the Nash CPU.
4. **Tuning knobs, in order of preference:**
   1. Starting budget (biggest effect on defender strength)
   2. Caught threshold and risk multipliers
   3. Breach divisor (10), Exfiltrate scale (x5), eviction risk (+10)
   4. Individual matrix entries (last resort)
5. **Metrics to record per batch:** win rates by role, mean rounds, mean final C and R, action frequencies, round of
   first breach, evictions per game, how often the defender runs out of budget, how often the attacker is caught vs
   wins by compromise.
6. **Sanity checks:**
   - Nash CPU should beat Random and Greedy CPU by a clear margin.
   - Nash vs Nash should be near the balance target.
   - Check for dominant strategies in both phase matrices and in whole-game plans.

## 11. Game-Theory Content for the Report
- **Classification:** finite, repeated, simultaneous-move, stochastic, imperfect information; a two-state
  stochastic game where one player cannot see the state.
- **Stage games:** two matrices (6x8 Outside, 4x8 Inside). Check each for pure-strategy equilibria and dominance.
- **Solution concept:** minimax / Nash mixed strategy via linear programming on each zero-sum stage game.
- **Inspection game inside:** Exfiltrate vs Lay Low against Hunt vs no-hunt, solved in closed form. The attacker
  exfiltrates with probability h / (g + L) and the defender hunts with probability g / (g + L). The cost of inspection
  sets how often the attacker acts.
- **Belief about a hidden state:** the defender's choice depends on how likely it thinks a breach is; IDS buys information.
- **Resource asymmetry:** defender is budget-constrained (knapsack-like rationing), attacker is hazard-constrained
  (optimal stopping: when to strike vs lay low).
- **Dual-use action:** Port Scan as an information-gathering action on both sides.
- **Empirical results:** equilibrium strategy frequencies, win rates vs CPU types, exploitability of greedy CPU,
  from the simulations in section 10.
- **Limitations:** simplified payoffs, symmetric action timing, myopic per-state CPUs, no adaptive attacker learning
  across games.

## 12. Optional Extensions
- Security Training with lasting effect (phishing penalty for the next 3 rounds).
- Attacker "exploit kit" resource that must be bought.
- Multiple servers or assets with different values (lateral movement between them).
- ~~Learning CPU as an extra difficulty tier~~: built as the Learned level (s8.4), 2026-10-30.
