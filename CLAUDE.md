# cyber-gt-game: conventions for Claude

Course project (CSE3145 Game Theory) and an extensible attack/defense game. Owner: Devansh.

## Sources of truth, in this order. Re-read before acting.
1. `docs/GAME-SPEC.md`: the rules. **Before any engine change, re-read the section you are touching.**
   Never change a rule silently: propose it, get his OK, log it in `docs/SPEC-CHANGES.md`, then edit the spec.
2. `docs/SPEC-REVIEW.md`: known ambiguities and measured stage-game results. Resolved items move to SPEC-CHANGES.
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
2. `uv run --with numpy --with scipy python -I tools/stage_check.py` vs the TS solver on the same matrix: must agree
   to 1e-6. Disagreement means the TS LP is wrong (the oracle is scipy).
3. `npm run sim -- --seed N` twice: identical JSON. If not, something bypasses the seeded RNG.
4. Before trusting a new sim metric, feed it a batch whose answer you know (Random vs Random action frequencies
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
