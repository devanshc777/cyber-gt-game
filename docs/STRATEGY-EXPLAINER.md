# Strategy and game theory: the short version and the deep version

Companion to [PROJECT-GUIDE.md](PROJECT-GUIDE.md), which has the full glossary and future scope.

- **Part A** is the project on one page.
- **Part B** explains the strategy and every piece of game theory in the project.

Numbers are **measured** unless marked *reading*. A reading is an interpretation of measured data, not a run.
Sources: [GAME-SPEC.md](GAME-SPEC.md), [report/NUMBERS.md](../report/NUMBERS.md) (10,000-game batches, seed 1) and
[RUBRIC-REVIEW.md](RUBRIC-REVIEW.md).

---

# Part A: the project on one page

| | |
|---|---|
| **What** | A browser game for CSE3145: attacker vs defender over one website server, 20 rounds, secret simultaneous moves. |
| **Live** | https://cyber-gt-game.devanshchowdhary03.workers.dev |
| **Attacker wins** | Compromise reaches 100 (stolen data plus downtime). |
| **Defender wins** | The attacker gets traced (Risk past the line, then a dice roll), or 20 rounds pass. |
| **Attacker's limit** | Risk. Every attack raises it; Lay Low lowers it by 10 but wastes a round. |
| **Defender's limit** | Budget: 20 points, never refilled. Defences cost 1-2. |
| **The twist** | The attacker must breach to get Inside. The breach is silent, so the defender never knows the phase for sure. |
| **Stack** | Vite + TypeScript, own LP solver, seeded RNG, 62 tests, Cloudflare Workers. |
| **Opponents** | Random, Easy, Greedy, Nash (Hard), Learned (regret matching). |
| **Proof it works** | 204,574 rounds re-derived independently from the spec text, all match. |

| Cybersecurity idea | In the game |
|---|---|
| Kill chain: initial access, then foothold, then objective | Outside to Inside, then Exfiltrate |
| Top real entry routes: app exploits, stolen credentials, phishing | SQL Injection, Brute Force, Phishing |
| Attackers stay hidden for weeks | The breach is never announced |
| Backdoor (persistence) | Persist survives one eviction |
| Threat hunting | Threat Hunt evicts an active intruder |
| A clean scan proves nothing | A hunt on a dormant intruder says "nothing found" |
| Defence in depth | Each defence stops different attacks; none stops all |
| Port scanning is dual-use | Port Scan (attack) and Self-Audit (defence) |

| Game-theory idea | In the game |
|---|---|
| Simultaneous, repeated, finite, stochastic game | Secret moves, 20 rounds, breach and caught rolls |
| Imperfect information | The defender cannot see the phase |
| Zero-sum stage games | Two payoff matrices, Outside 6x8 and Inside 4x8 |
| Mixed-strategy Nash equilibrium via LP | The Hard CPU and the analysis page |
| Inspection game | Exfiltrate/Lay Low vs Hunt/no hunt |
| Bayesian belief about a hidden state | The defender CPU's estimate that the attacker is Inside |
| Optimal stopping and resource rationing | When to strike vs hide; when to spend budget |
| Regret minimisation in self-play | The Learned CPU |
| Exploitability | No fixed plan beats the adaptive CPUs |

| Headline result | Value |
|---|---|
| Hard vs Hard, attacker wins | 45.2% (target 45-55%) |
| Mean game length | 18.1 rounds (target 10-18; just over the top) |
| Best fixed attacker plan vs Nash defender | 43% |
| Best fixed defender plan vs Nash attacker | holds it to 82% |
| Newcomer on Easy, following tips | attacker 73%, defender 93% |
| Target missed | The Nash attacker lays low 44% of rounds (target at most about 40%) |

---

# Part B: the deep version

## B1. The model in game-theory terms

Two players, attacker and defender, play a **finite-horizon stochastic game** with **one-sided imperfect
information**:

- **State:** phase (Outside/Inside), Compromise, Risk, Knowledge, backdoor, Budget, round.
- **Each round:** a **simultaneous-move stage game**, with a different payoff matrix per phase.
- **Chance:** two dice rolls per round, breach in step 5 and caught in step 8.
- **Information:** the attacker sees almost everything about itself. The defender sees only Budget, Compromise and
  the round, plus whatever IDS or a hunt reveals.
- **Payoffs:** each matrix is zero-sum (the defender gets minus the attacker's payoff). Budget and risk are
  **constraints around** the zero-sum core rather than inside it. That choice is what lets every round be solved as
  a standard linear program, and it lets the report call the game "a sequence of zero-sum stage games under resource
  constraints".

## B2. Reading the matrices: counters and dominance

*Measured by checking every pair of rows and columns (scratch script, matrices from GAME-SPEC s4).*

**Outside, what stops each attack (payoff of 0 or less):**

| Attack | Stopped by |
|---|---|
| Port Scan | IDS, Firewall, Hunt |
| Brute Force | IDS, Rate Limiting, Firewall |
| SQL Injection | **only WAF** |
| DoS Flood | Rate Limiting, Firewall |
| Phishing | **only Training** |

- No attacker move dominates another, and no defence dominates all the others. Every option has a job, which is the
  condition for a game with real guessing (Sirlin's "everything has a counter").
- SQL Injection and Phishing each have **exactly one** counter. That makes them the strongest breach moves, and they
  are the ones the equilibrium uses.

**Inside, two facts drive the whole late game:**

1. **Ignoring cost, Threat Hunt weakly dominates every other defence.** Its column (Sniff 0, Exfiltrate -3,
   Persist -2, Lay Low 0) is at or below every other column. The only things stopping the defender from hunting
   every round are its **cost** (2 of a 20 budget) and **Lay Low**, which makes a hunt find nothing. That is exactly
   the structure of an inspection game (B4).
2. **Firewall and IDS have identical payoffs Inside, but Firewall costs 1 and IDS costs 2.** IDS earns its extra
   point only through what it reveals and its x1.5 risk. *Reading:* this is why the Nash defender plays Firewall
   about twice as often as IDS (19.6% vs 9.9%).

## B3. The two stage games, solved

Each round, the Hard CPU solves the zero-sum matrix by linear programming: find the mix that maximises your
guaranteed payoff against every enemy column.

**Outside** (no pure equilibrium, so the solution is mixed):

| | Equilibrium mix |
|---|---|
| Attacker | SQL Injection 26.3%, DoS 37.5%, Phishing 36.3% |
| Defender | IDS 75%, WAF 12.5%, Training 12.5% |
| Value | +1.63 per round to the attacker |

- *Check:* against the attacker's mix, IDS, WAF and Training each give 1.63, so the defender is indifferent between
  them. Every other defence gives more (Idle 6.2). Indifference among the moves you mix over is the signature of a
  correct equilibrium.
- Port Scan and Brute Force get 0% in the one-shot game. Port Scan still matters over many rounds, because Knowledge
  adds +1 per point (up to +3) to later breaches and thefts. A one-round matrix cannot see that future value.
- IDS 75% is the one-round answer. Over 20 rounds at cost 2 it is unaffordable, so the budget pushes real play away
  from it.

**Inside** (value 0):

- The attacker's only safe move is Lay Low. Every active move can be punished by a free hunt.
- The defender has many optimal mixes; the LP returned IDS 45%, Encryption 15%, Hunt 40%.
- The one-shot answer is "always hide", which is useless as a game. It becomes interesting only when the hunt's
  price is counted: the inspection game.

## B4. The inspection game (the heart of the late game)

Inside, strip the choice to its bones: **Exfiltrate or Lay Low** against **Hunt or Don't**.

| | Hunt | Don't hunt |
|---|---|---|
| **Exfiltrate** | attacker loses L (evicted) | attacker gains g |
| **Lay Low** | 0, and the defender wasted h | 0 |

- If the defender always hunts, the attacker hides. If it never hunts, the attacker steals. No pure pair is stable.
- **Mixed equilibrium:** each side randomises so the other is indifferent.
  - Attacker indifferent: p x (-L) + (1 - p) x g = 0, so the defender hunts with **p\* = g / (g + L)**.
  - Defender indifferent: q x L - h = -q x g, so the attacker exfiltrates with **q\* = h / (g + L)**.
- **The counter-intuitive result:** each side's mix is pinned by the **other** side's numbers.
  - The attacker's stealing rate is set by the defender's cost of hunting, h: cheaper hunting means less stealing.
  - The defender's hunting rate is set by the attacker's gain g and loss L.
  - Making a hunt cheaper therefore does not make the defender hunt more often. It makes the attacker steal less.
  - A bigger L (a costlier eviction) lowers both rates.
- Analysis-page defaults (g 30, L 25, h 6): the attacker exfiltrates 10.9% of the time and the defender hunts 54.5%.
  The sliders show this live.
- **The same lesson showed up in the build.** When the CPU's maths ignored the cost of a hunt, the attacker hid
  forever (h = 0 gives q\* = 0). Adding the defender's spending back into the payoff (the kappa term, B6) fixed it.

## B5. Hidden state and beliefs

The defender plays without knowing the phase, so it keeps a **belief** b = P(attacker is Inside):

- b creeps up every round nothing is seen, because the attacker has had another chance to breach;
- it jumps on evidence: IDS, a hunt hit, a Compromise jump the size of an exfiltration;
- it resets after an eviction.

It then plays the **Bayesian stage game**. Each attacker "row" is a plan, an Outside move paired with an Inside move,
worth (1 - b) x Outside payoff + b x Inside payoff. This is the standard way to play against an opponent of unknown
type (Harsanyi). One matrix captures "I don't know which game I'm in".

Three information effects the report can name:

| Effect | Where |
|---|---|
| **Value of information** | IDS blocks only noisy moves but tells you the phase. Paying for it is worth it only when the answer changes your next move. |
| **False negative** | "Nothing found" after a hunt fits both an empty network and a dormant intruder, so a clean result barely moves b. |
| **Leakage** | The defender always sees Compromise, so the size of each jump hints at what happened. Kept on purpose (SPEC-CHANGES ruling A4). |

Two bugs found in testing were **information-set violations**: the defender learned the phase from a hunt result's
wording, and the attacker saw hunts that happened while it was Outside. Both were fixed so each screen shows exactly
what the rules allow, and a test pins the first one.

## B6. The dynamic layer: clock, budget, risk

A per-round matrix is myopic. Three measured failures of the plain LP CPU, and the fix for each:

| Failure (measured) | Cause | Fix in the Hard CPU |
|---|---|---|
| The attacker hid forever | The LP thought hunting was free (h = 0 in B4). | **Budget term:** score the defender's spending as kappa x scarcity x cost for the attacker. Scarcity grows as budget runs low relative to rounds left. |
| The attacker procrastinated | A one-round LP cannot see round 20. Hiding in round 19 looks as good as in round 2. | **Clock:** a one-step look-ahead on the estimated chance of still winning in the rounds left, and a risk weight that shrinks as the end nears. |
| The attacker gave up against a broke defender | A flat win curve said "lost" too early. | **Progress pull:** +0.5 x (Compromise gained, plus 15 for a foothold) keeps it pushing. |

The cell value both sides use (so each round stays zero-sum):

`value = win chance of next state + 0.5 x progress - w x risk change + kappa x scarcity x defender cost`

with `w = (0.05 + 1.5 x (R / line)^2) x min(1, rounds left / 5)`. Risk matters most near the trace line and least at
the end, since a timeout loses as surely as getting caught.

In classic terms:

- The **attacker** solves an **optimal stopping** problem: when to strike and when to cool down.
- The **defender** solves a **rationing (knapsack-like)** problem: about ten 2-point actions across 20 rounds.
  *Measured:* the Nash defender runs out of budget in 83.8% of games.

**Safe exploitation.** Pure minimax never punishes a predictable opponent; it earns the game value and no more. So
when your play shows a pattern, the Hard CPU switches to the best response against it, with a probability that rises
with evidence (at most 90%). It does so only when that response beats the equilibrium mix against the same observed
play, so it cannot be baited into doing worse.

## B7. The opponent ladder

| CPU | Theory | What it teaches |
|---|---|---|
| Random | Uniform mix | Baseline. Loses to anything with a plan. |
| Easy | Epsilon-greedy (50% random, 50% greedy) | A forgiving, readable opponent. |
| Greedy | Best response to your observed history (fictitious-play style) | Punishes habits; beaten by variety. |
| Nash | Per-state minimax LP + belief + clock + budget + safe exploitation | Unexploitable in each round; punishes patterns. |
| Learned | Regret matching in self-play, 20,000 games, average strategy | In two-player zero-sum games the average strategy of regret matching moves toward equilibrium. It is the idea behind CFR poker bots. |

**Regret matching in one line:** after each game, for every move, ask "how much better would that have done?" Keep a
running total, and play each move in proportion to its positive total.

Attacker win % at Normal, 10,000 games per cell:

| Attacker vs defender | Random | Greedy | Nash | Learned |
|---|---|---|---|---|
| Greedy attacker | 79.9 | 65.4 | 48.4 | 17.7 |
| Nash attacker | 85.7 | 66.8 | 45.2 | 16.3 |
| Learned attacker | 96.1 | 87.3 | 55.3 | 30.6 |

The Learned CPU is the strongest on both sides. As a defender it holds even the Nash attacker to 16%.

## B8. What equilibrium play looks like, and the strategy it implies

**Hard vs Hard move shares (measured):**

| Attacker | Share | Defender | Share |
|---|---|---|---|
| Lay Low | 43.8% | Idle | 37.3% |
| Exfiltrate | 25.4% | Threat Hunt | 32.1% |
| Phishing | 22.8% | Firewall | 19.6% |
| SQL Injection | 7.8% | IDS | 9.9% |
| DoS | 0.2% | Training | 0.9% |
| | | WAF | 0.3% |

First breach at round 4.0 on average. A breach happens in 99.95% of games, and there are 1.52 evictions per game.

***Reading*: the strategy this implies.**

**Attacker:**

1. **Break in with Phishing.** Only Training stops it, and a rational defender almost never buys Training (0.9%),
   because Training is worthless once you are Inside and the budget is tight. SQL Injection is the backup: only WAF
   stops it, and WAF is just as rarely bought.
2. **Get in early.** Breaching around round 4 leaves enough rounds to steal 100.
3. **Inside, it is the inspection game.** Mix Exfiltrate and Lay Low; never be predictable. Hiding about as often as
   stealing is roughly what equilibrium play does.
4. **Read the defender's budget.** It drains about one point per round. Late in the game a broke defender cannot
   hunt, so steal hard then.
5. **Lay Low near the trace line,** and plant a Persist when hunts start landing, so the next one burns the backdoor
   instead of evicting you.
6. Port Scan early pays only if the game will run long enough for Knowledge to matter. DoS is almost never worth its
   +18 risk.

**Defender:**

1. **Idle is a real move, not a mistake.** Saving budget is how you afford hunts later; equilibrium play idles over a
   third of rounds.
2. **Don't chase every attack Outside.** Per-attack counters (WAF, Training) are rarely worth 2 points, since they
   are useless once the attacker is in.
3. **Firewall is the efficient default.** At cost 1 it cuts attacker Knowledge Outside and matches IDS's payoff
   Inside.
4. **Hunt when your belief says Inside:** after Compromise starts rising, or after IDS shows them in. Expect "nothing
   found" sometimes. It does not prove you are clean.
5. **Use IDS to find out, not to defend.** Buy it when not knowing the phase is costing you decisions.
6. **Be unpredictable about hunting.** A hunt every other round on a fixed beat is exactly what a hiding attacker
   reads.

## B9. Exploitability: no fixed plan wins

Attacker win % (10,000 games each):

| Fixed attacker plan | vs Greedy | vs Nash | vs Learned |
|---|---|---|---|
| cautious SQLi (lay low near the line) | 31.4 | **43.2** | 8.8 |
| cautious phishing | 32.4 | 41.8 | 11.8 |
| backdoor first | 10.2 | 26.5 | 16.3 |
| hide from hunts | 1.8 | 6.8 | 0 |
| phish then exfil, never hide | 0 | 1.3 | 0 |
| DoS only | 0 | 0 | 0 |

| Fixed defender plan | vs Greedy | vs Nash | vs Learned |
|---|---|---|---|
| always Hunt | 87.0 | **82.1** | 96.0 |
| always IDS | 78.4 | 83.7 | 98.7 |
| train, hunt if inside | 92.7 | 86.9 | 96.2 |
| always Idle | 100 | 99.96 | 100 |

Any fixed plan, on either side, loses to an opponent who adapts. That is the practical meaning of "no dominant
strategy", and the reason to mix.

## B10. How game theory redesigned the game

1. **v1 had a dominant strategy.** Always-IDS held every attacker to 0%. Proof: IDS cost 1, so 20 rounds fit the
   budget. The attacker's best hit against IDS gave 6 Compromise for at least 12.25 risk, and Lay Low removes only
   10. Reaching 100 needed about 34 rounds out of 20.
2. **Tuning the numbers only moved the dominance.** After tuning, a one-line attacker plan ("phish, lay low near the
   line") won 100%.
3. **Root cause:** Lay Low had no counter. A move that costs nothing, cannot be punished and resets the attacker's
   only limit breaks the guessing game.
4. **v2 fix:** a hidden Inside phase where hiding has a counter-loop. Exfiltrate beats anything but Hunt, Hunt beats
   an active intruder, and Lay Low beats Hunt. IDS cost rose to 2.
5. **Balance by the spec's knob order:** starting budget first. Budget -4 moved Nash vs Nash from 20% to about 45-50%
   attacker wins.

Analysis came before art, so no balance fix ever forced redrawn assets.

## B11. Claims the report can make, and how strong each is

| Claim | Strength |
|---|---|
| The Outside stage game has no pure equilibrium; the mix is as in B3 | Measured (LP, checked by indifference) |
| Inside, ignoring cost, Hunt weakly dominates; with cost it is an inspection game | Measured (matrix check) plus standard theory |
| q\* = h / (g + L), p\* = g / (g + L) | Derived in closed form (B4) |
| v1 always-IDS wins | Measured plus proof |
| No fixed plan beats the Nash/Learned CPUs | Measured (B9) |
| Nash vs Nash about 45% attacker, 18.1 rounds | Measured |
| The engine matches the written rules | Measured: 204,574 rounds re-derived independently |
| The strategy advice in B8 | Reading of measured move shares |
| CPUs are per-state solvers, not a full-game solution | Stated limit |
| Payoff numbers are designed, not taken from incident data | Stated limit |
