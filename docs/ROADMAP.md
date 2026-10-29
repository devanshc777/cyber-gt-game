# Roadmap: chunks, each ending in a commit

Each milestone is small enough to finish and verify in one sitting. Each ends with a commit and a push.
Order matters: engine and numbers before art, so balance fixes never force redrawn assets.

| M | Chunk | Done means | Verify with |
|---|---|---|---|
| **M0** | Scaffold + docs (this commit) | PRD, spec, spec review, roadmap, art direction, CLAUDE.md, remote repo | `git log`, remote exists |
| **M1** | Engine core | Vite+TS project; `src/engine/` with arena data file (website), state, `resolveRound()` per spec s5; seeded RNG | one test per resolution step (9 steps) + a full scripted 20-round game |
| **M2** | Solvers + CPUs | zero-sum LP; Random, Greedy, Nash CPUs per s8 with per-state matrices | TS LP equals `tools/stage_check.py` to 1e-6 on the base matrix |
| **M3** | Simulation runner | `npm run sim` runs s10 batches (10k games each), writes `data/sim-*.json` with seed | rerun same seed = identical JSON; numbers sane vs SPEC-REVIEW predictions |
| **M4** | Balance pass | tune knobs in s10.4 order until Normal hits targets, or document why not | before/after table in `SPEC-CHANGES.md`; **his sign-off on every rule change** |
| **M5** | Playable greybox | menu, battleground select, role, difficulty, match screen, end screen; flat shapes, no art | play 3 full matches per role; HUD hides what s9 hides |
| **M6** | Analysis page + trained CPU | heatmap, mixes, sim charts, exploitability; regret-matching CPU tier trained on sim data | charts read from `data/*.json`, not hardcoded |
| **M7** | Art pass | his chosen direction; GPT-generated PNGs per `ART-DIRECTION.md` spec sheets; link animations | each asset checked in-game at real size, both screens |
| **M8** | Polish + report support | copy pass, export figures for the report, deploy | a classmate plays it cold |

Report writing is his (or ARS skills if he asks); the game supplies figures and numbers from M3/M6.

## Open decisions for Devansh

Engine-blocking (needed before M1/M2):
1. Spec ambiguities A2, A3, A8 in `SPEC-REVIEW.md` (Easy CPU, CPU information set, simultaneous win+caught).
2. Stack: Vite + vanilla TS as proposed, or does he want React/Svelte for the screens?

Art-blocking (needed before M7, can wait):
3. Art direction, see `ART-DIRECTION.md`: pick or mix the directions.
4. "KM art" pins he mentioned: which board or artist is that? Not found in the vault.
5. Name of the game, and the menu copy ("choose your battleground" or other).
6. Locked arena silhouettes on the menu: tease future arenas, or show only Website?
7. Sound: none, or a few UI blips?
