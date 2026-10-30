# cyber-gt-game: conventions for Claude

Course project (CSE3145 Game Theory) and an extensible attack/defense game. Owner: Devansh.

## Sources of truth, in this order. Re-read before acting.
1. `docs/GAME-SPEC.md`: the rules. **Before any engine change, re-read the section you are touching.**
   Never change a rule silently: propose it, get his OK, log it in `docs/SPEC-CHANGES.md`, then edit the spec.
2. `docs/SPEC-REVIEW.md` and `docs/RUBRIC-REVIEW.md`: measured stage games, ambiguities, and why v2 replaced v1.
   Resolved items move to SPEC-CHANGES. `docs/GAME-SPEC-v1.md` is history: never build from it.
3. `PRD.md`: product scope. MVP = website arena only.
4. `docs/ROADMAP.md`: milestones M0-M8 and the open decisions list.
5. `docs/ART-DIRECTION.md`: art options. Nothing locked until he picks.
6. `docs/RESEARCH.md`: sources. Anything cited in the report is read in full first, `[CONFIRM]` until then.

## Work routine
- One milestone at a time. Finish, verify, commit, push. Do not start the next one unasked if it needs his decision.
- Engine (`src/engine/`) is pure TS: no DOM, no randomness without the seeded RNG. Arena rules are data, not code.
- Lazy by default: stdlib and platform first, no dependency for what a few lines can do, no abstraction with one user.
- Creative calls (name, copy, art direction, menu wording) are his. Bring options and reasons, not finished picks.
- After each milestone, update the Session Log below and his vault (`C:\Personal\Aethion\work\` project note).

## Verification recipe
1. `npm test`: one test per resolution step in spec s5, plus a scripted full game. A failing step test means the
   engine drifted from the spec: fix the engine, not the test, unless the spec changed.
2. `uv run --with numpy --with scipy python -I tools/stage_check.py` vs the TS solver on the same matrices: must agree
   to 1e-6 (pinned in `src/engine/lp.test.ts`). Disagreement means the TS LP is wrong (the oracle is scipy).
3. `npm run sim -- --seed N` twice: identical JSON. If not, something bypasses the seeded RNG.
4. A rules or CPU change re-runs `npx vite-node tools/eval-cpus.ts 1000`: any fixed plan winning over 80% against
   a Nash CPU (either role) means a dominant plan came back, or the CPU lost the ability to punish one.
5. Before trusting a new sim metric, feed it a batch whose answer you know (Random vs Random action frequencies
   should be uniform over available actions).

## Git
- Personal identity, remote `git@github-personal:devanshc777/cyber-gt-game.git`. Branch `main`.
- Conventional Commits (`feat(engine): ...`, `docs: ...`). No co-author trailer. Commit and push at each milestone
  only. Never force-push.
- No skill or tool names in code comments.

## Session Log
- 2026-10-30: M0. Repo scaffolded, his spec saved verbatim, stage game solved (no PSNE; IDS 75% in defender
  minimax, 4 attacker actions unused in the one-shot game), roadmap + art options written. Waiting on his decisions
  (ROADMAP open list) before M1.
- 2026-10-30: M1 paused for a rubric review at his request. Measured v1 broken (always-IDS wins; s8 Hard CPU lays
  low 100%; tuning flips dominance to a one-line cautious attacker). He picked Option C: spec v2 "kill chain"
  (outside/inside, silent breach, Threat Hunt evicts). M1 built on v2: two-phase engine, LP solver (= scipy to 1e-6),
  35 tests incl. a hand-traced 20-round game. Next: M2 CPUs (clock-blind LP attacker is the known gap).
- 2026-10-30: M2 done. `src/engine/cpu.ts`: Random, Easy, Greedy, Nash, each fed only its s9 view. Nash = per-state
  LP on a shared one-step-lookahead value (win chance + progress pull, clock-scaled risk, budget scarcity), Bayesian
  belief matrix for the defender, safe exploitation for both. Failures found and fixed on the way: hide-forever
  (free hunts), procrastination (optimistic win estimate), despair (flat win curve). N=1000: no fixed plan beats Nash
  defender over 17%; none holds Nash attacker under 65%. Nash vs Nash = 22% attacker, 18.6 rounds: off the 45-55%
  target, which is M4's job (sim runner M3 first). 61 tests.
- 2026-10-30: M3-M6 done ("build it all n keep testing"). M3 sim runner (seeded, byte-identical reruns). M4: budget
  -4 (knob #1 only) puts Nash vs Nash at 45-53% in 18 rounds; his review pending in SPEC-CHANGES; Lay Low ~43% is a
  CPU trait, not a rules one. M5: menu, role, 4 levels, match with topology animation filtered by info set, end
  screen with full reveal; provisional A+B skin until he picks art. Browser play found a real s9 leak (outside hunt
  returned no result vs "nothing found") — fixed and pinned by a test. M6: analysis page (live stage LPs with kappa
  toggle, inspection-game sliders, CPU grid, ladder, Nash-vs-Nash, exploitability, learned policy) and the Learned
  tier (regret matching, self-play). 62 tests. Open: art direction (M7), name/copy, his review of the M4 budget change.
- 2026-10-30: M7 done (A+B mix, all 34 GPT assets, motion). M8: deployed to
  https://cyber-gt-game.devanshchowdhary03.workers.dev (`npm run deploy`); EXPORT FIGURES on the analysis page writes
  16 PNGs to `report/figures/` via a dev-only Vite middleware (`vite.config.ts`), captions in `report/FIGURES.md`;
  `npm run numbers` writes `report/NUMBERS.md` from sim.json. Still open: a classmate's cold playtest (roadmap "done
  means"), game name/copy, his OK on the M4 budget change.
- 2026-10-30: Onboarding redesign from his playtest notes (df09440). Full-screen title (any key), one-column setup,
  role briefing slides (goal, meters, how in, how you lose, tips), first-match spotlight tour (? HOW TO PLAY re-runs
  it), tap-? help on every meter, "Blocked by / Blocks" on move cards read from the payoff matrix, a TIP after each
  round, end screen names the deciding round and one thing to try. Attacker plays on a dark board that reddens with
  the attack (--heat), defender on paper. UI s9 leak fixed: outside attackers were told about hunts, and an outside
  hunt drew a landed attack as blocked. Copy drafted in `src/ui/copy.ts` (his to edit). Rules untouched (his call).
