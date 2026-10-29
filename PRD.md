# PRD: Cyber Attack/Defense game (working title)

> Working title until Devansh names it. Course project for **CSE3145 Game Theory** (MUJ, Jul-Nov 2026),
> worth 10 marks of CWS. Rules live in `docs/GAME-SPEC.md` (v2 "kill chain", adopted 2026-10-30; his original brief verbatim in `docs/GAME-SPEC-v1.md`). This file is the product around them.

## 1. What it is
A browser game where you play Attacker or Defender against a CPU over 20 rounds of simultaneous, hidden moves,
plus an analysis page that shows the game theory underneath: the stage-game equilibrium, simulation results and how
each CPU can be exploited. The game is the hook; the analysis is what earns the marks.

## 2. Who it is for
1. **The evaluator** (course instructor): needs to see zero-sum minimax, mixed NE, dominance, repeated play and
   learning in games, applied and measured.
2. **A classmate playing it**: must understand a round in under a minute without reading the spec.
3. **Devansh later**: an arena system he can extend past the website scenario.

## 3. MVP scope

### In
- **Main menu**: "choose your battleground" (exact copy is his). One arena unlocked: **Website**.
  Other arena slots may show as locked silhouettes only if he wants the tease (`[DECIDE]`).
- **Role select**: Attacker or Defender.
- **Difficulty**: Easy / Normal / Hard, mapped to CPU models per spec s7-s8 (Random-ish / Greedy / Nash LP).
- **Match screen**: Packet-Tracer-style topology of the arena (attacker node, internet, firewall, web server, DB,
  staff PC for phishing). Pick an action, both reveal, resolution animates along the links. HUD shows only what
  your role may see (spec s9).
- **End screen**: win/loss, reason (compromised / caught / survived 20 rounds), round-by-round log.
- **Analysis page**: stage matrix heatmap, minimax mixes for both sides, dominance result, sim results
  (win rates per CPU pairing, game length, action frequencies), greedy exploitability.
- **Simulation runner** (Node, CLI): CPU-vs-CPU batches per spec s10, seeded, writes JSON the analysis page reads.

### Out (for MVP)
Multiplayer, accounts, a second arena, sound (open question), mobile-first layout (desktop first, must not break
on mobile), any server. Spec s12 extensions wait until the core sim hits its balance targets.

## 4. How it maps to the syllabus (why each piece exists)
| Course outcome | Where the game shows it |
|---|---|
| CO1 strategies, costs, payoffs | action table, defender costs, payoff matrix on the analysis page |
| CO2 zero-sum, minimax, NE, mixed, dominance | stage LP, no-PSNE proof, Idle dominated, Hard CPU |
| CO4 repeated games | 20-round state game, budget/risk as state, sim results |
| "Learning in games" (syllabus unit 1) | Greedy = fictitious-play-style best response; trained CPU tier (M6) |
| CO3 correlated equilibrium | not in MVP. Possible report section only. |

## 5. Success criteria
- Engine follows spec s5 exactly; a test pins each resolution step.
- TS LP solver matches the Python oracle (`tools/stage_check.py`) on the stage matrix to 1e-6.
- Sim at Normal hits spec s10 targets, or the report explains which knob moved and why.
- A first-time player finishes a match without help (watch one classmate).
- Hard CPU beats Random and Greedy by a clear margin in sims (spec s10.6).

## 6. Tech (proposed, `[DECIDE]` if he wants otherwise)
- **Vite + TypeScript**, no UI framework at first: the game is a handful of screens, not an app.
- **Engine is pure TS** in `src/engine/` with no DOM imports, so the same code runs the browser game and the
  Node sim (`tsx`). One engine, no Python/JS drift.
- **LP**: a small zero-sum solver (simplex) or `javascript-lp-solver`; cross-checked against the Python oracle.
- **Art**: 2D PNG sprites/backgrounds generated per `docs/ART-DIRECTION.md`, plus CSS/canvas for link animations.
- **Hosting**: static (GitHub Pages or Vercel), later.

## 7. Open decisions (his)
See the list at the end of `docs/ROADMAP.md`. Nothing art-side is locked until he picks.
