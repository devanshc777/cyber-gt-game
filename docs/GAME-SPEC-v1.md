# Cyber Game: Attacker vs Defender (Game Theory Project)

> Source of truth for the rules. Saved verbatim from Devansh's brief, 2026-10-30.
> Do not edit rules here silently: a change goes in `docs/SPEC-CHANGES.md` with a reason, then here.

## 1. Overview
A repeated, simultaneous-move, two-player game over a fixed number of rounds.
The player picks a role (Attacker or Defender) and the CPU plays the other side.
Each round both sides pick one action secretly, then the round resolves.

**Asymmetric constraints (the core design idea)**
- Defender: scarce **budget** (resources).
- Attacker: scarce **time**, enforced by a rising **risk meter** (cyber police).

**Game class:** finite repeated, simultaneous-move, stochastic (detection),
imperfect information, with state. The base matrix is zero-sum. Budget and
risk act as constraints and modifiers, not as extra payoff terms (see section 8).

## 2. State Variables
| Variable | Range | Start | Meaning |
|---|---|---|---|
| Compromise C | 0-100 | 0 | How broken the server is. Attacker's progress. |
| Risk R | 0-100 | 0 | How close the attacker is to being traced. |
| Knowledge K | 0-5 | 0 | Recon the attacker has gathered (open ports, services). |
| Budget B | 0-max | by difficulty | Defender's remaining resources. |
| Round t | 1-20 | 1 | Current round. |

## 3. Actions

### 3.1 Attacker actions
| ID | Action | Description | Base risk |
|---|---|---|---|
| A1 | Port Scan | Recon, discover open ports/services. Raises K. | +6 |
| A2 | Packet Sniffing | Intercept traffic for credentials/data. | +4 |
| A3 | Brute Force | Guess credentials. Very noisy. | +15 |
| A4 | SQL Injection | Exploit unsanitized queries. High reward. | +10 |
| A5 | DoS Flood | Overwhelm the service. Loudest. | +18 |
| A6 | Phishing | Social engineering, bypasses technical defenses. | +7 |
| A7 | Lay Low | No attack. Cools down risk. | -10 |

### 3.2 Defender actions
| ID | Action | Cost | Effect |
|---|---|---|---|
| D1 | IDS / Monitoring | 1 | Detection: multiplies attacker risk gain x1.75. |
| D2 | WAF / Patch | 2 | Blocks injection and web attacks. Also repairs 4 Compromise. |
| D3 | Rate Limiting | 1 | Throttles brute force and DoS. Risk x1.25 against those two. |
| D4 | Encryption (TLS) | 2 | Neutralizes sniffing and weakens data theft. |
| D5 | Firewall | 1 | Closes ports. Risk x1.25 vs Port Scan and DoS. Lowers K by 1. |
| D6 | Security Training | 2 | Counters phishing. |
| D7 | Self-Audit (Port Scan) | 1 | Dual-use. Finds your own exposure. Lowers K by 1. Risk x1.25 vs Port Scan. |
| D8 | Idle | 0 | Save budget. Server is exposed. |

**Dual-use action:** Port Scan appears on both sides (A1 and D7). Same
technique, opposite purpose: attacker finds targets, defender finds exposure.

## 4. Payoff Matrix (attacker's payoff, defender gets the negative)
Rows = attacker action, columns = defender action. Values are "damage points".
Positive helps the attacker, negative means the defense punished the attack.

| | D1 IDS | D2 WAF | D3 RateLim | D4 Encrypt | D5 Firewall | D6 Training | D7 Audit | D8 Idle |
|---|---|---|---|---|---|---|---|---|
| A1 Port Scan | -2 | 1 | 1 | 1 | -2 | 2 | -1 | 2 |
| A2 Sniffing | 1 | 3 | 3 | -3 | 1 | 3 | 0 | 4 |
| A3 Brute Force | -3 | 3 | -4 | 3 | 0 | 4 | 1 | 5 |
| A4 SQL Injection | 2 | -5 | 6 | 6 | 3 | 6 | 2 | 8 |
| A5 DoS Flood | 1 | 3 | -2 | 4 | -2 | 4 | 2 | 5 |
| A6 Phishing | 2 | 5 | 5 | 5 | 5 | -4 | 4 | 6 |
| A7 Lay Low | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**Design logic**
- Every defense hard-counters something: WAF vs SQLi, Encrypt vs sniffing,
  RateLim vs brute force and DoS, Training vs phishing, IDS/Firewall/Audit vs noisy recon.
- Phishing is the only attack that ignores almost every technical defense, so
  Training is the defender's only real answer to it.
- Idle column is the best for the attacker in every row, which is why the
  defender is tempted to idle only when budget runs low.
- No defense is dominant and no attack is dominant, so a pure strategy
  can't win. This is what forces mixed strategies.
- Lay Low is a real choice: it is the only action that cannot hurt you, but it makes no progress.

## 5. Round Resolution (order of operations)
1. Both players choose an action (hidden from each other).
2. Defender pays the cost. If B < cost, the action is unavailable (forced to D8 Idle).
3. Look up payoff P from the matrix.
4. **Knowledge bonus:** if attacker played A3 or A4 and P > 0, then P += min(K, 3).
5. **Compromise:** C += max(P, 0) x 3. If defender played D2, C -= 4 (floor 0).
6. **Knowledge update:** A1 with P > 0 gives K += 1. D5 or D7 gives K -= 1 (floor 0).
7. **Risk update:**
   - delta = base risk x defender multiplier (table in section 6).
   - If P <= 0 (attack was blocked), delta += 5 (noisy failure in the logs).
   - R = clamp(R + delta, 0, 100). Lay Low gives delta = -10.
8. **Caught check:** if R >= threshold, caught probability
   p = (R - threshold) / (100 - threshold). Roll once per round. R = 100 means caught for sure.
9. **Win checks:** C >= 100 gives attacker win. Caught gives defender win.
   After round 20 with neither, defender wins.

## 6. Risk Multipliers (defender action x attacker action)
Default multiplier is 1.0 unless listed.

| Defender action | Condition | Multiplier |
|---|---|---|
| D1 IDS | any attack | x1.75 |
| D3 Rate Limit | vs A3, A5 | x1.25 |
| D5 Firewall | vs A1, A5 | x1.25 |
| D7 Audit | vs A1 | x1.25 |

Multipliers do not apply to Lay Low (its -10 always happens).

## 7. Resources and Difficulty

### 7.1 Defender role (player is the defender)
| Difficulty | Starting budget | Regen/round | CPU attacker |
|---|---|---|---|
| Easy | 30 | +0 | Random / greedy |
| Normal | 24 | +0 | Greedy best-response |
| Hard | 18 | +0 | Nash mixed strategy |

Budget is one-time by default: the defender must ration across 20 rounds.
Optional variant: +1 regen every 3 rounds.

### 7.2 Attacker role (player is the attacker)
| Difficulty | Risk multiplier | Caught threshold | CPU defender |
|---|---|---|---|
| Easy | x0.75 | 50 | Random / greedy |
| Normal | x1.0 | 40 | Greedy best-response |
| Hard | x1.25 | 30 | Nash mixed strategy |

Risk multiplier scales every delta in step 7 of resolution (except Lay Low).
The defender CPU starts with the Normal budget (24) in attacker mode.

## 8. CPU Opponent Models
1. **Random:** uniform over available actions.
2. **Greedy best-response:** tracks the opponent's action frequency so far,
   picks the action with best expected payoff against that empirical mix.
   Exploitable if the player varies their play.
3. **Nash mixed (hard):** each round, build the payoff matrix for the current
   state and solve the zero-sum LP for the optimal mixed strategy, then sample.
   - Remove defender columns the budget cannot afford.
   - Attacker CPU uses risk-adjusted payoffs:
     A_eff = P + knowledge bonus - lambda x (risk delta), with lambda
     growing as R rises (suggest lambda = 0.1 + R/200).
   - Defender CPU uses payoff = -P - cost x mu, with mu (cost weight) rising
     as budget falls (suggest mu = 1 + (start budget - B) / start budget).

**Why keep the base zero-sum:** budget and risk only change which actions are
available or their weights. That keeps each per-state solve a standard LP,
and it is defensible as "a sequence of zero-sum stage games under resource
constraints" in the report.

## 9. Information Structure
- Attacker sees: R, K, round, own history, and the result of the last round (blocked or succeeded).
- Defender sees: B, round, and the current C.
- Defender sees the attacker's actual action only if D1 or D7 was played
  that round (detection). Otherwise it sees only that Compromise changed.
- This makes it a game of imperfect information and is why IDS is valuable beyond its risk multiplier.

## 10. Simulation Plan (for tuning the numbers)
1. Implement the state machine and resolution order exactly as in section 5.
2. Run CPU-vs-CPU batches, 10,000 games each: Random vs Random, Greedy vs
   Greedy, Nash vs Nash, Nash vs Greedy (both directions).
3. **Balance targets (Normal difficulty):**
   - Attacker win rate roughly 45-55%.
   - Average game length between 10 and 18 rounds.
   - No single action used over about 40% of the time by the Nash CPU.
4. **Tuning knobs, in order of preference:**
   1. Starting budget (biggest effect on defender strength)
   2. Caught threshold and risk multipliers
   3. The Compromise scale factor (x3) and Patch repair (4)
   4. Individual matrix entries (last resort)
5. **Metrics to record per batch:** win rates by role, mean rounds, mean final
   C and R, action frequencies, how often the defender runs out of budget,
   how often the attacker is caught vs wins by compromise.
6. **Sanity checks:**
   - Nash CPU should beat Random and Greedy CPU by a clear margin.
   - Nash vs Nash should be near the balance target.
   - Check for dominant strategies: if one action beats all others, the matrix needs rebalancing.

## 11. Game-Theory Content for the Report
- **Classification:** finite, repeated, simultaneous-move, stochastic, imperfect information.
- **Stage game:** 7x8 payoff matrix. Show it has no pure-strategy Nash equilibrium
  (check every cell for profitable deviations) and therefore needs a mixed equilibrium.
- **Solution concept:** minimax / Nash mixed strategy via linear programming on the zero-sum stage game.
- **Dominance analysis:** show which actions are strictly dominated (if any) and remove them.
- **Resource asymmetry:** defender is budget-constrained (knapsack-like rationing),
  attacker is hazard-constrained (optimal stopping: when to strike vs lay low).
- **Dual-use action:** Port Scan as a signaling and information-gathering action.
- **Empirical results:** equilibrium strategy frequencies, win rates vs CPU types,
  and exploitability of greedy CPU from the simulations in section 10.
- **Limitations:** simplified payoffs, symmetric action timing, no adaptive
  attacker learning across games.

## 12. Optional Extensions
- Security Training with lasting effect (phishing penalty for the next 3 rounds).
- Attacker "exploit kit" resource that must be bought, if risk alone feels too weak.
- Multiple servers or assets with different values.
- Learning CPU (e.g. fictitious play or regret matching) as an extra difficulty tier.
