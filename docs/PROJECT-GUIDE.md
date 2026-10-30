# ATTACKER // DEFENDER: the whole project, explained

A plain-language guide to everything in this project: the cybersecurity ideas the game is built on, the game
theory behind it, what was built and measured, and where it could go if it became a full game.

- **Course:** CSE3145 Game Theory, course project.
- **Play it:** https://cyber-gt-game.devanshchowdhary03.workers.dev
- **Source of truth for rules:** [GAME-SPEC.md](GAME-SPEC.md). Every number in section 6 comes from
  [report/NUMBERS.md](../report/NUMBERS.md), which is generated from the simulations and never typed by hand.

---

## 1. The game in one minute

Two players, one website server, 20 rounds.

- The **attacker** tries to break into the server and steal data. They win when **Compromise** reaches 100.
- The **defender** tries to stop them. They win if the attacker gets **traced** (caught), or if 20 rounds pass first.

Each round, both sides pick one move **at the same time, in secret**, like rock-paper-scissors. Then the moves are
revealed and the round resolves. You play one side and the computer (CPU) plays the other.

Each side is short of something different:

| Side | Scarce resource | How it bites |
|---|---|---|
| Defender | **Budget** | Every defence costs 1 or 2 points from a fixed pot (20 at Normal) that never refills. You cannot defend everything every round. |
| Attacker | **Time and stealth** | Every attack raises **Risk**. Past the trace line, each round has a growing chance of getting caught. Hiding lowers risk but wastes rounds. |

The attacker starts **Outside** the network. They have to **breach** to get **Inside**, and only from inside can
they steal data in bulk. The breach is silent, so the defender never knows for sure which phase the attacker is in.
That hidden state is the heart of the game.

---

## 2. Cybersecurity, term by term

### 2.1 The big ideas

| Term | What it means | Where it shows up in the game |
|---|---|---|
| **Attack surface** | Every way into a system: open ports, login pages, web forms, employees' inboxes. | The five Outside attacks each target a different part of it. |
| **Kill chain** | Real intrusions happen in stages: reconnaissance, initial access, foothold, then the objective (stealing, breaking). The term comes from Lockheed Martin's Cyber Kill Chain. | The Outside/Inside split. Outside is recon and initial access; Inside is the objective. |
| **Initial access** | The first successful entry into a network. | A landed Brute Force, SQL Injection or Phishing can **breach**. |
| **Foothold** | A position inside the network the attacker can work from. | Being Inside. |
| **Dwell time** | How long an attacker sits inside before being found. Our research digest found a real-world median of about two weeks (Mandiant, 2026). | The breach is never announced. The defender has to infer it. |
| **Exfiltration** | Copying data out of the network: the actual theft. | Exfiltrate, the main way Compromise rises. |
| **Persistence / backdoor** | A hidden way back in that survives a clean-up, so evicting the attacker once does not end the intrusion. | Persist plants a backdoor that absorbs one eviction. |
| **Threat hunting** | Defenders actively searching their own network for an intruder, instead of waiting for an alarm. | Threat Hunt evicts an active intruder. |
| **Eviction / incident response** | Kicking an intruder out and cleaning up. The investigation also leaves evidence about who did it. | An eviction sends the attacker Outside and adds +10 Risk. |
| **Attribution / tracing** | Working out who the attacker is, which ends in police action. | The Risk meter and the trace line. |
| **False negative** | A check that finds nothing when something is really there. | A hunt against an attacker who is laying low reports "nothing found", which looks exactly like an empty network. |
| **Dual-use tool** | The same technique used for attack and defence. Port scanning is the classic example: attackers scan for targets, defenders scan for their own exposure. | Port Scan (attacker) and Threat Hunt / Self-Audit (defender). |
| **Defence in depth** | Layering different controls, because each one stops only certain attacks. | Every defence hard-counters something different; nothing blocks everything. |
| **False positives / alert fatigue** | Real security teams drown in alerts; our digest found 50-80% are false alarms. Watching everything is expensive. | IDS reveals the attacker and raises their risk, but costs 2, and it stops only noisy moves (scans, brute force). |

### 2.2 Attacker moves

| Move | Phase | Real-world meaning | MITRE ATT&CK equivalent | In the game |
|---|---|---|---|---|
| **Port Scan** | Outside | Probing which network services are open, to find a way in. | T1046 Network Service Discovery | Gains Knowledge. Risk +6. |
| **Brute Force** | Outside | Guessing passwords over and over until one works. | T1110 Brute Force | Can breach. Loud: Risk +15. |
| **SQL Injection** | Outside | Typing database commands into a web form that forgets to check its input, so the site runs them. | T1190 Exploit Public-Facing Application | Can breach. Hits hardest (+8 against no defence). Risk +10. |
| **DoS Flood** | Outside | Flooding the site with junk traffic until it falls over (denial of service). | T1498/T1499 Network/Endpoint Denial of Service | Deals Compromise directly but **cannot breach**. Loudest: Risk +18. |
| **Phishing** | Outside | A fake email that tricks an employee into giving up a login or running malware. | T1566 Phishing | Can breach. Quiet: Risk +7. Only Security Training stops it. |
| **Packet Sniffing** | Inside | Reading traffic on the internal network to pick up passwords. | T1040 Network Sniffing | Gains Knowledge. Risk +4. |
| **Exfiltrate** | Inside | Copying data out. | TA0010 Exfiltration (tactic) | Compromise +P x 5. Risk +8. |
| **Persist** | Inside | Planting a backdoor. | TA0003 Persistence (tactic) | Backdoor survives one eviction. Risk +5. |
| **Lay Low** | Both | Going quiet and waiting. | (no technique: it is the absence of one) | Risk -10, always. A hunt cannot find you. |

The game's three breach moves stand for the three top real-world entry routes our research found in the Verizon
DBIR 2026: exploiting public-facing apps (about 31%), credential abuse (13-22%) and phishing (about 16%).

### 2.3 Defender moves

| Move | Cost | Real-world meaning | In the game |
|---|---|---|---|
| **IDS / Monitoring** | 2 | Intrusion Detection System: software (and staff) watching traffic and logs for attacks. Mostly it sees rather than blocks. | Reveals the attacker's move and phase this round. Attacker risk x1.5. Punishes Port Scan and Brute Force; most other attacks still land. |
| **WAF / Patch** | 2 | Web Application Firewall plus patching known flaws in the website's code. | Blocks SQL Injection hard (-5). |
| **Rate Limiting / MFA** | 1 | Capping how many login attempts or requests one source can make, and multi-factor authentication (a code on your phone as well as a password). | Counters Brute Force and DoS. Risk x1.25 against those two. |
| **Encryption (TLS)** | 2 | Transport Layer Security, the "s" in https. Traffic is scrambled, so sniffing gets nothing. | Neutralises Sniffing (-3), weakens Exfiltrate. |
| **Firewall / Egress filter** | 1 | A firewall decides which traffic may pass. Egress filtering checks traffic **leaving** the network, which catches data being smuggled out. | Lowers attacker Knowledge while they are Outside. Risk x1.25 vs Port Scan, DoS and Exfiltrate. |
| **Security Training** | 2 | Teaching staff to spot phishing. | The only counter to Phishing (-4). |
| **Threat Hunt (Self-Audit)** | 2 | Outside: scanning yourself to find and close exposure. Inside: actively hunting the intruder. | Outside: lowers attacker Knowledge. Inside: **evicts** an active attacker. |
| **Idle** | 0 | Doing nothing, saving money. | Free, and the server is wide open. |

---

## 3. How a round is scored

The full order of operations is in [GAME-SPEC.md s5](GAME-SPEC.md). The short version:

1. Both sides choose in secret. The defender pays the cost of its move.
2. Look up the **payoff P** in the matrix for the attacker's current phase (one matrix for Outside, one for Inside).
   Positive P means the attack landed; zero or negative means it was blocked.
3. **Knowledge bonus:** Brute Force, SQL Injection and Exfiltrate get +1 P per point of Knowledge, up to +3.
4. **Effects:**
   - A landed breach move gets in with chance **min(P / 10, 90%)**.
   - DoS adds **P x 2** Compromise.
   - Exfiltrate adds **P x 5** Compromise.
   - A hunt against an active intruder evicts them, unless a backdoor absorbs it.
5. **Risk:** base risk x defence multiplier. +5 if the attack was blocked (failed attempts are noisy in the logs).
   +10 on eviction. Then the difficulty scales it. Lay Low is always exactly -10.
6. **Caught check:** past the trace line (40 at Normal), caught chance = (Risk - line) / (100 - line).

**Worked examples (Normal):**

- Outside, Knowledge 2, the attacker plays SQL Injection and the defender idles. P = 8 + 2 = 10, so the breach chance
  is 90%. Risk rises by 10.
- Inside, Knowledge 0, Exfiltrate into Encryption. P = 2, so Compromise rises by 10. The same move into Idle with
  Knowledge 3 gives P = 9, so Compromise rises by 45.
- Risk at 70 with the line at 40: caught chance = 30 / 60 = 50% that round.

---

## 4. Game theory, term by term

### 4.1 What kind of game this is

| Term | Meaning | Here |
|---|---|---|
| **Two-player** | Exactly two decision makers. | Attacker and defender. |
| **Simultaneous-move** | Both choose without seeing the other's choice. | Moves are locked in secret every round. |
| **Repeated / multi-stage** | The same kind of choice is made many times, and earlier rounds affect later ones. | 20 rounds. |
| **Finite horizon** | The game has a known last round. | Round 20. This makes the CPU "clock-aware" (4.6). |
| **Stochastic game** | The game moves between states, partly by chance. | Breach and caught are dice rolls; the state is Outside/Inside plus the meters. |
| **Imperfect information** | A player does not know everything that has happened. | The defender cannot see the attacker's phase or most of their moves. |
| **Asymmetric** | The two sides have different moves, goals and limits. | Budget vs risk, different menus. |
| **Zero-sum** | One side's gain is exactly the other's loss. | Each payoff matrix is zero-sum: the defender gets -P. Budget and risk sit around it as constraints. |
| **Stage game** | The one-round game played inside a bigger repeated game. | Two of them: Outside (6x8) and Inside (4x8). |

### 4.2 Strategies and equilibrium

- **Payoff matrix.** A table with one row per attacker move and one column per defender move; each cell holds the
  attacker's payoff. Ours are in [GAME-SPEC.md s4](GAME-SPEC.md).
- **Pure strategy.** Always picking the same move.
- **Mixed strategy.** Picking moves at random with set probabilities, for example "IDS 75%, WAF 12.5%, Training 12.5%".
  Randomising is how you stay unpredictable.
- **Dominant strategy.** A move that is best no matter what the opponent does. A good game has none, because a
  dominant move makes every other move pointless.
- **Best response.** The best move against a known (or guessed) opponent strategy.
- **Nash equilibrium.** A pair of strategies where neither side can do better by changing only their own. In
  rock-paper-scissors it is 1/3 each.
- **Minimax / maximin.** In a zero-sum game: pick the strategy whose worst case is best. Von Neumann's minimax
  theorem says both sides' guarantees meet at one number, the **value of the game**, and the strategies that reach it
  are the Nash equilibrium.
- **Linear programming (LP).** A standard way to compute a minimax mixed strategy: find probabilities that maximise
  your guaranteed payoff, subject to each opponent move. The project has its own LP solver (`src/engine/lp.ts`),
  tested against scipy to 1e-6.

### 4.3 What the stage games give

- **Outside:** there is **no pure equilibrium**. The minimax mix is:
  - Attacker: SQL Injection 26.3%, DoS 37.5%, Phishing 36.3%.
  - Defender: IDS 75%, WAF 12.5%, Training 12.5%.
  - Value: 1.63 to the attacker per round.

  One round on its own favours watching heavily. Over 20 rounds IDS costs too much to play that often, which is the
  point of the budget.
- **Inside:** the value is 0. With no hunting cost in the matrix, Lay Low is the attacker's only safe move: any active
  move can be punished by a hunt. The defender has many optimal mixes; the LP returned IDS 45%, Encryption 15%,
  Threat Hunt 40%. On its own this one-shot answer is boring ("always hide"). It changes once the hunt's cost is
  counted, which is the inspection game.

### 4.4 The inspection game

A classic model (von Stengel, *Inspection Games*): an inspector chooses whether to pay for a check, an inspectee
chooses whether to cheat. Inside the network it is Exfiltrate vs Lay Low against Hunt vs No Hunt:

- **g** = what the attacker gains from an exfiltration nobody hunts.
- **L** = what the attacker loses if hunted (the foothold).
- **h** = what a hunt costs the defender.

Neither pure choice is stable: if the defender always hunts, the attacker hides; if it never hunts, the attacker
steals. Making each side indifferent gives the mixed equilibrium:

- Attacker exfiltrates with **q\* = h / (g + L)**.
- Defender hunts with **p\* = g / (g + L)**.

The result that surprises people: **how often the attacker acts depends on the cost of inspecting (h), not on the
size of the punishment for the attacker.** Cheaper hunts mean less stealing. With the analysis page's defaults
(g 30, L 25, h 6), the attacker exfiltrates 10.9% of the time and the defender hunts 54.5%.

### 4.5 Information and beliefs

- **Information set.** What a player can actually tell apart when choosing. The rules (s9) fix exactly what each side
  sees, and the CPUs see only that.
- **Hidden state and belief.** The defender keeps a **belief** b, the probability that the attacker is Inside. It
  creeps up each round nothing is seen, jumps on evidence (IDS, a hunt hit, a big Compromise jump), and resets after
  an eviction.
- **Bayesian game.** The defender CPU solves one matrix whose rows are pairs (Outside move, Inside move), each worth
  (1 - b) x Outside payoff + b x Inside payoff. That is the standard way to play against an opponent of unknown type.
- **Value of information.** IDS does not block anything; it buys information. Paying for it is worth it only when the
  answer would change what you do next.
- **Signals and leakage.** The defender always sees Compromise, so the size of a jump leaks how well the attack did.
  This was kept on purpose and noted for the report as partial information leakage.
- **False negatives.** "Nothing found" after a hunt proves nothing, because a dormant intruder looks the same as an
  empty network.

Two bugs found during the build were information-set bugs: the defender learned the phase from the wording of a hunt
result, and the attacker's screen reported hunts that happened while they were Outside. Both were fixed so the screen
shows exactly the rules' information sets.

### 4.6 Time, budget and risk as game theory

- **Knapsack-style rationing (defender).** 20 budget across 20 rounds with defences costing 1-2: deciding when to
  spend is a resource-allocation problem layered on top of each round's guess.
- **Optimal stopping (attacker).** When to strike and when to cool down. Hiding is cheap early and fatal late, because
  a timeout loses as surely as getting caught.
- **Clock-awareness.** A one-round LP cannot see round 20 coming, so a plain LP attacker hid forever. The Nash CPU
  adds a one-step look-ahead on an estimated chance of still winning in the rounds left.
- **Budget in the payoff.** If the LP ignores what a defence costs, it assumes hunting is free and the attacker never
  acts: the textbook inspection-game failure. Scoring spent budget as a small gain for the attacker fixes it and keeps
  every stage game zero-sum.

### 4.7 Opponents (the CPUs) as game-theory objects

| CPU | Idea | Game-theory name |
|---|---|---|
| **Random** | Uniform over legal moves. | Baseline / uniform strategy. |
| **Easy** | 50% random, 50% greedy. | Epsilon-greedy. |
| **Greedy** | Best response to what it has seen you do so far. | Fictitious-play style best response. Strong against habits, weak against variety. |
| **Nash (Hard)** | Solves each round's zero-sum matrix by LP and samples from the mix. Adds belief, clock and budget terms, plus **safe exploitation**: when you show a pattern, it switches to the best response, but only when that beats the mix. | Minimax / Nash mixed strategy with safe exploitation. |
| **Learned** | Trained by **regret matching** in self-play, 20,000 games. | Regret minimisation. In two-player zero-sum games the average strategy of regret matching converges toward equilibrium; it is the core of the CFR algorithm used in poker bots. |

- **Regret** = how much better a move would have done in hindsight. Regret matching plays each move in proportion to
  its accumulated positive regret.
- **Exploitability** = how much a fixed or predictable strategy loses to an opponent that adapts to it. The analysis
  page measures this: no fixed plan does well against the adaptive CPUs on either side.

### 4.8 Related security-game models (for context in the report)

- **Stackelberg security games** (Sinha et al., IJCAI 2018): the defender commits to a randomised plan first and the
  attacker observes and responds. These have been deployed for airport and coast guard patrols. Ours is
  simultaneous; in zero-sum games the Stackelberg and Nash strategies coincide (minimax).
- **FlipIt** (van Dijk, Juels, Oprea, Rivest 2012): players fight over a resource without knowing who controls it.
  This is the same idea as our silent breach.
- **Collins et al. 2024**, *Game-Theoretic Cybersecurity: the Good, the Bad and the Ugly*: most models hand the
  defender certainty it never has. Our defender's belief about the hidden phase answers that critique.

### 4.9 Design rules taken from game design

- **"Everything has a counter"** (David Sirlin, *Designing Yomi*). The first rule set broke it: Lay Low had no
  counter. In the current rules Inside is a three-way loop: Exfiltrate beats anything but a hunt, Hunt beats an
  active intruder, and Lay Low beats a hunt (the hunt finds nothing and the budget is spent).
- **Unequal payoffs** make the mixing interesting, because the right odds are not obvious, so players fall into
  patterns that an opponent can read.

---

## 5. What was built, in order

### 5.1 The story of the rules

1. **v1, his original brief** (kept as [GAME-SPEC-v1.md](GAME-SPEC-v1.md)): one Compromise bar and every attack fills
   it.
2. **Rubric review** ([RUBRIC-REVIEW.md](RUBRIC-REVIEW.md)) measured it before any UI was built:
   - The defender had a **winning pure strategy**: always IDS held every attacker to 0%. There was a proof as well as
     the runs: IDS was cheap enough to play every round and the attacker could not hit enough times before the trace
     line.
   - The spec's Hard CPU laid low 100% of the time.
   - Tuning the numbers only flipped which side had the dominant strategy, because Lay Low had no counter.
3. **v2 "kill chain"** (his pick, Option C) added:
   - the Outside/Inside phases and the silent breach;
   - the Exfiltrate and Persist moves;
   - Threat Hunt as the counter to an active intruder.

   With these changes, no fixed plan wins everywhere.
4. **Balance:** starting budget lowered by 4 (Normal 24 to 20) to bring Nash vs Nash toward 50/50.
5. **Easy for newcomers:** attacker Easy now faces a random defender CPU, so a new player can win.

Every change is logged with its reason and measurement in [SPEC-CHANGES.md](SPEC-CHANGES.md).

### 5.2 Milestones

| Milestone | What | Commit |
|---|---|---|
| M0 | Spec, spec review, roadmap, research digest | ce59f0c |
| — | Rules v2 adopted after the rubric review | 17500ca |
| M1 | Engine: two-phase rules, seeded random numbers, LP solver | 25f3e69 |
| M2 | CPUs: Random, Easy, Greedy, Nash | 471afa7 |
| M3 | Simulation runner (10,000 games per batch, reproducible from a seed) | 758b447 |
| M4 | Balance pass (budget -4) | 22fb45e |
| M5-M6 | Playable game, analysis page, Learned CPU | 6e10550, 8ea6177 |
| M7 | Generated art, effects, motion | 890adf3, 299c0ab |
| M8 | Deployed to Cloudflare, report figure export, numbers sheet | 7d790ef |
| After playtest | Title screen, briefings, tour, tips, plain-language results, back navigation, coming-soon arenas, meter fix, arithmetic audit, Easy rebalance | df09440 to a01bb51 |

### 5.3 Engineering pieces

| Piece | File(s) | What it does |
|---|---|---|
| Arena data | `src/engine/arenas/website.ts` | Every number in the rules in one file: moves, costs, both matrices, multipliers, difficulty settings. A new arena is a new file like this. |
| Engine | `src/engine/engine.ts` | `resolveRound()`: the nine-step resolution, exactly as the spec orders it. |
| Seeded RNG | `src/engine/rng.ts` | Repeatable dice: the same seed replays the same game, which makes sims and tests reproducible. |
| LP solver | `src/engine/lp.ts` | Solves the zero-sum matrices for minimax mixes. |
| CPUs | `src/engine/cpu.ts` | The five opponents, each fed only its own side's view. |
| Simulation | `tools/sim.ts` | CPU-vs-CPU batches, written to `public/data/sim.json`. |
| Audit + newbie test | `tools/playtest.ts` | Re-derives every round from the spec text in an independent re-implementation and checks the engine matches; also measures how a random player and a tip-follower do. |
| Report numbers | `tools/report-numbers.ts` | Writes `report/NUMBERS.md` from the sim data. |
| Analysis page | `src/ui/analysis.ts`, `charts.ts` | Payoff heatmaps, equilibrium mixes, the inspection-game sliders, sim charts, and EXPORT FIGURES (16 PNGs). |
| Match UI | `src/ui/match.ts`, `topology.ts` | Network map with animated attacks, meters with help, report, move cards, log. |
| Onboarding | `src/ui/guide.ts`, `copy.ts`, `screens.ts` | Title screen, role briefings, first-match spotlight tour, tips, end-screen explanation. |
| Tests | `*.test.ts` | 62 tests: one per resolution step, scripted games, LP accuracy, information-set leaks. |

---

## 6. Results (from the simulations)

All numbers are from 10,000-game batches, seed 1, at Normal unless stated.

**Hard vs Hard (Nash vs Nash):**

| Measure | Value |
|---|---|
| Attacker wins by breach | 45.2% |
| Attacker caught | 10.7% |
| Defender survives 20 rounds | 44.1% |
| Mean game length | 18.1 rounds |
| Mean first breach | round 4.0 |
| Evictions per game | 1.52 |
| Defender ran out of budget | 83.8% |

- **CPU strength ladder:** stronger CPUs generally beat weaker ones. For example, the Nash attacker wins 85.7% against
  a random defender and 45.2% against the Nash defender.
- **No fixed plan wins:**
  - The best fixed attacker plan ("cautious phishing/SQLi") reaches about 43% against the Nash defender.
  - Every fixed defender plan loses to the Nash attacker at least 82% of the time.
- **Newcomer playtest** (2,000 games per row):

  | Side, level | Random clicks | Follows the tips |
  |---|---|---|
  | Attacker Easy | 26% | 73% |
  | Attacker Normal | 0% | 0% |
  | Defender Easy | 67% | 93% |
  | Defender Normal | 20% | 43% |

  The tips deliberately do not always give the best move, and they appear only some rounds.
- **Arithmetic audit:** 204,574 rounds were re-derived from the spec independently; all match. The audit catches
  errors planted on purpose.

**Balance targets missed, stated plainly:** the Nash attacker lays low about 44% of rounds, against a target of at
most about 40%. This comes from the CPU's value model, not the rules.

---

## 7. Limits

- Payoffs are designed numbers, not measured from real incidents.
- Both sides move at the same pace; real attackers and defenders work on different clocks.
- The CPUs are per-round solvers with heuristics, not a solution of the full 20-round game.
- No opponent learns across games.
- One arena, one server.
- No real human cold playtest yet; the newcomer numbers come from simulated players.

---

## 8. Future scope: turning this into a real game

These are options to choose from, grouped by size. None is decided.

### 8.1 Content

- **More arenas.** The menu already shows four locked ones: Bank Server, Hospital Network, Power Grid and Cloud
  Startup. Each would be a new arena data file with its own moves and matrix.
  - Bank: fraud and transaction tampering; money as the Compromise.
  - Hospital: ransomware with a ticking clock, where downtime costs lives.
  - Power grid: industrial control systems, slow and physical.
  - Cloud: misconfigured storage buckets and stolen API keys.
- **Multi-node maps and lateral movement.** Several servers of different value. The attacker pivots from a weak
  machine to a valuable one, and the defender chooses what to protect: a network security game, closer to real
  intrusions. Already listed in the spec's s12.
- **Lasting effects.** Training that protects for three rounds, patches that stay, a malware strain that spreads.
  Lasting effects make each round's choice depend more on what came before.
- **Attacker economy.** Exploit kits bought with stolen data, zero-days as rare one-shot cards. This gives the
  attacker a budget problem of their own.
- **Events.** "A new vulnerability is announced", "the security team is on holiday", "the auditors are coming":
  random shocks that change the matrix for a few rounds.

### 8.2 Modes

- **Player vs player online.** Simultaneous secret moves suit online play well, because nobody waits on a slow
  opponent's turn. The server resolves rounds so neither client can peek at the other's move.
- **Campaign.** A story through the arenas, each teaching one idea: hidden state, the inspection game, budgets.
- **Roguelite runs.** Pick upgrades between matches, with a harder opponent each time.
- **Daily seeded challenge.** Everyone plays the same seed, which the seeded RNG already supports, with a leaderboard.
- **Hot-seat or pass-and-play** for classrooms.

### 8.3 Smarter opponents

- **CFR (counterfactual regret minimisation)** over the full 20-round game instead of per-round solves. This is the
  method behind superhuman poker bots, and it would give a much stronger Hard tier.
- **Opponent modelling across games:** a CPU that remembers your habits from last time.
- **Personalities:** a script-kiddie attacker who spams loud moves, an APT that waits weeks, a paranoid defender who
  hunts constantly. Each is a fixed bias on top of the Nash mix.
- **Adaptive difficulty** that keeps a player near 50% wins.

### 8.4 Teaching layer

- **Post-match coach:** replay the match beside what the equilibrium would have played each round, and show where
  your choices were predictable.
- **Live equilibrium overlay** (optional): show the current round's Nash mix, to learn by watching.
- **Classroom kit:** a teacher dashboard, a worksheet per arena, and the analysis page as a lecture tool.
- **Security-awareness version:** the Phishing and Training loop as a short game for company onboarding.
- **Real-world mapping:** every move linked to its MITRE ATT&CK technique and a real incident write-up.

### 8.5 Polish and reach

- Sound design: UI blips, alarm tension as risk climbs.
- A mobile layout and touch controls.
- Accessibility: colour-blind safe palettes (attacker red vs defender teal currently carries meaning), screen-reader
  labels, reduced-motion mode (partly done).
- Localisation.
- Accounts, profiles and match history.
- A proper name and identity. The current title and all menu copy are drafts.

### 8.6 What has to happen first

1. A **cold playtest** with classmates who have never seen it.
2. Sign-off on the open rule change: the M4 budget cut.
3. Naming and final copy.
4. Then pick one direction from 8.1-8.5. A second arena is the smallest step that tests whether the engine
   generalises, because the engine already reads every rule from the arena file.
