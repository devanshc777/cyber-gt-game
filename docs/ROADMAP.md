# Roadmap: chunks, each ending in a commit

Each milestone is small enough to finish and verify in one sitting. Each ends with a commit and a push.
Order matters: engine and numbers before art, so balance fixes never force redrawn assets.

| M | Chunk | Done means | Verify with |
|---|---|---|---|
| **M0** | Scaffold + docs (this commit) | PRD, spec, spec review, roadmap, art direction, CLAUDE.md, remote repo | `git log`, remote exists |
| **M1** | Engine core (spec v2) | Vite+TS project; `src/engine/` with arena data file (website), two-phase state, `resolveRound()` per spec s5; seeded RNG; LP solver | one test per resolution step (9 steps) + scripted 20-round game; LP equals scipy to 1e-6 |
| **M2** done | CPUs | Random, Easy, Greedy, Nash CPUs per s8 (shared zero-sum value, defender belief about the phase); fix clock-blindness | no fixed policy wins >80% vs Nash CPU (`tools/probe2.ts` policies) |
| **M3** done | Simulation runner | `npm run sim` runs s10 batches (10k games each), writes `public/data/sim.json` with seed | rerun same seed = identical JSON; numbers sane vs SPEC-REVIEW predictions |
| **M4** done, his review pending | Balance pass | tune knobs in s10.4 order until Normal hits targets, or document why not | before/after table in `SPEC-CHANGES.md`; **his sign-off on every rule change** |
| **M5** done (provisional skin) | Playable greybox | menu, battleground select, role, difficulty, match screen, end screen; flat shapes, no art | play 3 full matches per role; HUD hides what s9 hides |
| **M6** done | Analysis page + trained CPU | heatmap, mixes, sim charts, exploitability; regret-matching CPU tier trained on sim data | charts read from `data/*.json`, not hardcoded |
| **M7** | Art pass | his chosen direction; GPT-generated PNGs per `ART-SPECS.md` sheets (A+B mix picked 2026-10-30); link animations | each asset checked in-game at real size, both screens |
| **M8** | Polish + report support | copy pass, export figures for the report, deploy | a classmate plays it cold |

Report writing is his (or ARS skills if he asks); the game supplies figures and numbers from M3/M6.

## Open decisions for Devansh

Engine-blocking (needed before M1/M2):
1. ~~Spec ambiguities A2, A3, A8~~ ruled 2026-10-30 (`SPEC-CHANGES.md`).
2. ~~Stack~~ Vite + vanilla TS, approved 2026-10-30.
2b. ~~Rubric~~ v2 "kill chain" adopted 2026-10-30 (`RUBRIC-REVIEW.md`).

Art-blocking (needed before M7, can wait):
3. Art direction, see `ART-DIRECTION.md`: pick or mix the directions.
4. "KM art" pins he mentioned: which board or artist is that? Not found in the vault.
5. Name of the game, and the menu copy ("choose your battleground" or other).
6. Locked arena silhouettes on the menu: tease future arenas, or show only Website?
7. Sound: none, or a few UI blips?
