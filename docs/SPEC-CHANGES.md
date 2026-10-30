# Spec changes

Every rule change to `GAME-SPEC.md`, with date, his OK, reason and the measurement behind it. Newest first.

| Date | Section | Change | Why (measured) | His OK |
|---|---|---|---|---|
| 2026-10-30 | s5.5, s9 | A hunt while the attacker is Outside now reports "nothing found" to the defender (was: no result). The attacker view drops hunt results from rounds it was Outside. | Found in browser play: "no result" vs "nothing found" told the defender the phase for free, breaking s9. Pinned by a test in `cpu.test.ts` that fails without the fix. Nash vs Nash after: 45% (N=1000 eval), still in target. | engine fix to match s9 as written |
| 2026-10-30 | s8 | Learned tier added (regret matching, self-play), shown as a fourth menu level on Normal rules. | Built per s12. N=1000: as attacker it beats the Nash defender 58%; as defender it holds the Nash attacker to 18%. | yes ("build it all") |
| 2026-10-30 | s7 | **M4 balance:** starting budget lowered by 4 everywhere (Normal 24 to 20; defender role Easy/Normal/Hard 30/24/18 to 26/20/14). Knob #1 of s10.4 only; nothing else touched. | Nash vs Nash at Normal: 20% attacker wins, 18.7 rounds before; **50%, 18.0 rounds after** (`tools/eval-cpus.ts`, N=1000). Sweep in `tools/tune.ts`: budget 21 gave 41%, 18 gave 66%. Worst fixed attacker plan vs Nash defender 48%; Nash attacker beats every fixed defender plan at least 82%. **Not met:** Nash attacker plays Lay Low 43-45% of rounds under every knob tried (target ~40%); it comes from the CPU value model, not the rules. | **pending his review** (applied under "build it all", 2026-10-30) |
| 2026-10-30 | s8 | Nash CPU rebuilt in M2: one-step lookahead on an estimated win chance, a linear pull toward progress, clock-scaled risk weight, budget scarcity, a budget ceiling for the attacker, a Bayesian belief matrix for the defender, and safe exploitation. Greedy attacker infers defenses from what it observed. | Each piece fixed a measured failure (`tools/eval-cpus.ts`, N=1000). The plain LP hid forever; without the clock the attacker procrastinated; with a flat win curve it gave up against a broke defender (always-Hunt held it to 0% though a simple plan beats always-Hunt 97%). Now no fixed plan beats the Nash defender over 17%, and no fixed defender plan holds the Nash attacker under 65%. | yes (he approved M2, which was scoped as "fix clock-blindness") |
| 2026-10-30 | all | **v2 "kill chain" adopted** (rubric review Option C). Outside/Inside phases, silent breach, new attacker actions A8 Exfiltrate and A9 Persist, A2 Sniffing moved Inside, D7 becomes Threat Hunt (evicts inside), backdoor state. v1 kept verbatim as `GAME-SPEC-v1.md`. | v1 has a winning pure strategy for the defender (always-IDS: 0% attacker wins, proof in RUBRIC-REVIEW s1.1); number tuning flips dominance to a one-line cautious attacker (100%); cause is that Lay Low has no counter. In C no fixed plan wins everywhere. | yes, 2026-10-30 ("Go with C") |
| 2026-10-30 | s3.3, s6 | D1 IDS cost 1 to 2, multiplier x1.75 to x1.5. | Always-IDS cost 20 of 24 budget, so the budget never bound it. | yes (part of C) |
| 2026-10-30 | s5.5 | WAF/Patch no longer repairs C. | C is now mostly stolen data, which cannot be un-stolen. | yes (part of C) |
| 2026-10-30 | s6 | D7 x1.25 vs Port Scan removed; D5 also x1.25 vs Exfiltrate (egress filtering). | Matches the measured candidate (`tools/probe2.ts`). | yes (part of C) |
| 2026-10-30 | s4.2 | A9 Persist row set to +1 (Hunt -2) instead of 0. | With 0 every Persist would count as a blocked attack and add the +5 noisy-failure risk. Not yet re-measured; M3 checks it. | engine reading, flag if wrong |
| 2026-10-30 | s8 | Nash CPU payoff replaced: shared zero-sum value with kappa x defender cost and a risk weight that bites near the threshold. | The v1 formula made the Hard attacker lay low 100% (RUBRIC-REVIEW s1.2). | yes (part of C) |

## Rulings on ambiguous rules

Readings of rules the spec leaves open. Written against v1; under v2, A1-A3, A5-A6, A8-A10 carry over and are written into the v2 text. A4 now reads "C" as compromise from exfiltration and DoS. A7 is superseded by the v2 s8 formula. A11 holds.

| Date | Item | Ruling | His OK |
|---|---|---|---|
| 2026-10-30 | A1 (s5.7) | The +5 noisy-failure risk applies to attacks A1-A6 only. Lay Low is always exactly -10. | yes, 2026-10-30 ("defaults OK") |
| 2026-10-30 | A2 (s7) | Easy CPU = epsilon-greedy: 50% uniform random, 50% greedy best-response. | yes, 2026-10-30 |
| 2026-10-30 | A3 (s8, s9) | A CPU sees exactly what a human in its seat sees. Greedy defender counts only attacks it observed (rounds it played D1 or D7). | yes, 2026-10-30 |
| 2026-10-30 | A4 (s9) | Defender sees C, so the size of a C change leaks P. Kept; noted for the report as partial information leakage. | yes, 2026-10-30 |
| 2026-10-30 | A5 (s5.2) | UI greys out actions the defender cannot afford. The engine still forces D8 if handed one. | yes, 2026-10-30 |
| 2026-10-30 | A6 (s7.1) | Budget regen variant is off by default. | yes, 2026-10-30 |
| 2026-10-30 | A7 (s8) | The Nash attacker's risk term is per cell: each (attack, defense) cell carries its own risk delta. | yes, 2026-10-30 |
| 2026-10-30 | A8 (s5.8-9) | Breach and caught in the same round: attacker wins (the breach landed first, step 5 before step 8). | yes, 2026-10-30 |
| 2026-10-30 | A9 (s5.7, s7.2) | Order inside step 7: `delta = base x defender multiplier`, then `+5` if blocked, then the difficulty risk multiplier scales that whole delta. The defender multiplier does not touch the +5. | engine reading, flag if wrong |
| 2026-10-30 | A10 (s7) | Defender-role games (CPU attacker) use the Normal risk settings: x1.0, threshold 40. s7.1 lists no risk settings for that mode. | engine reading, flag if wrong |
| 2026-10-30 | A12 (s5.8) | At exactly R = threshold the caught chance is 0, so no roll is made. Keeps the RNG stream free of rolls that cannot matter. | engine reading |
| 2026-10-30 | A11 (s5.5) | C is capped at 100 as well as floored at 0 (s2 gives its range as 0-100). | engine reading |

## Proposed, not applied: Easy for a newcomer (2026-10-30)
His bar: a newcomer on Easy should be able to win. `npx vite-node tools/playtest.ts 2000` measures a player who
picks at random and one who follows every in-game tip. Defender Easy already works (67% random, 93% tips). Attacker
Easy does not: 3% random, 14% tips (83% of tip-followers run out the clock). Attacker win % on Easy, 2000 games each:

| Easy attacker variant | random player | follows tips |
|---|---|---|
| now: Easy CPU, risk x0.75, trace line 50 | 3% | 14% |
| defender CPU picks at random | 26% | 73% |
| risk x0.5, trace line 60 | 14% | 29% |
| 25 rounds | 8% | 84% |
| risk x0.5, line 60, CPU random | 41% | 87% |

Awaiting his pick. The same run re-derives every round from s5 independently: 207,969 rounds, all match.
