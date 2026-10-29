# Research digest: game design + game theory (first pass, 2026-10-30)

One search per angle, including a contrarian one. Sources read as search excerpts unless marked "read in full".
Dropped: listicles, forum threads with no practitioner voice, SEO "Hacknet vs Uplink" pages.

## 1. Designing simultaneous hidden-move games
- **David Sirlin, *Designing Yomi*** (sirlin.net, designer of the Yomi card game; practitioner). Rock-paper-scissors
  where "everything has a counter" is a sound core *if* payoffs are unequal and unclear, so perfect play is hard to
  compute and players fall into patterns that opponents can read. Too many move types that need a lookup chart
  stop adding strategy.
  - For us: 7x8 with a chart is on the heavy side. The UI must teach counters by showing them (icons, a "what beats
    this" hint), not by asking players to read the matrix.
  - Patterns are exactly what the Greedy CPU exploits and what a human exploits in Greedy. Good teaching contrast.
- **Celia Wagar, CritPoints, design principles** (critic/designer). Contrarian angle: **resources and linear state
  progression can kill mind games**, because situations stop repeating. Our budget and risk meters are exactly that.
  - Tension to watch in sims: if budget runs out mid-game, the defender's choice collapses to Idle and the
    double-blind guessing is gone. Track "rounds with real choice" as a sim metric.

## 2. Playing against a Nash computer
- **GSU experimental economics working paper 2008-07**, how humans play against a computer that plays its mixed NE.
  Relevant because our Hard CPU is that computer. (Excerpt only; read in full before citing in the report.)
- Contrarian point (common in GT teaching, no single source): a mixed-NE opponent cannot be exploited but also
  **never exploits you**. Against a human who plays badly, Nash only earns the game value, so Hard may feel no
  harder than Greedy to a weak player. Options: Hard = Nash with a best-response tilt once the player shows a
  pattern, or an extra "trained" tier (M6). Decide after playtests.

## 3. Attacker-defender games in the literature (for the report)
- **Sinha, Fang, An, Kiekintveld, Tambe, *Stackelberg Security Games: Looking Beyond a Decade of Success*,
  IJCAI 2018.** Survey of SSGs: defender commits to a randomized allocation first, attacker observes and best-responds.
  Deployed for airports, coast guard, wildlife patrols.
  - Contrast for the report: our game is **simultaneous**, not leader-follower. In zero-sum games the Stackelberg
    and Nash strategies coincide (minimax), so for the base matrix the distinction does not change the answer.
    `[CONFIRM]` cite the source for this result before using it (likely Korzhyk et al., JAIR 2011).
- **Hausken, *A Review of Attacker-Defender Games and Cyber Security*, Games 15(4):28, 2024** (MDPI). Recent review,
  good for framing and related work.
- **Clempner 2022** (Engineering Applications of AI), SSGs with incomplete information and deception. Relevant to
  our s9 imperfect information (defender sees attacks only with IDS/Audit).

## 4. Hacking-game presentation
- *Hacknet* (Fellow Traveller): terminal-first, based on real UNIX commands, network map partly clickable;
  players praise it for feeling like real hacking rather than Hollywood. Lesson: realism of *verbs* sells the
  fantasy more than visual effects.
- *Uplink* (Introversion): LAN screens as node graphs. Same family as Packet Tracer topology.
- Neither shows the opponent's move, ours must. That reveal moment is the game's signature beat and the place
  to spend animation budget.

## Not yet done
- No pass on onboarding/tutorial patterns for strategy games.
- No visual reference hunt (waits on his art pick and the "KM art" pins).
- GSU paper and Korzhyk result not read in full.
