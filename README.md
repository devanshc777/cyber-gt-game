# cyber-gt-game

Attacker vs Defender: a simultaneous-move, repeated security game in the browser, with a game-theory analysis page.
Course project for CSE3145 Game Theory.

Status: **M1, engine core.** Rules v2 (kill chain). No playable build yet.

- Tests: `npm test`
- Rubric evidence: `npx vite-node tools/probe.ts` (v1) and `npx vite-node tools/probe2.ts` (v2)

- Rules: [docs/GAME-SPEC.md](docs/GAME-SPEC.md) (why v2: [docs/RUBRIC-REVIEW.md](docs/RUBRIC-REVIEW.md))
- Product: [PRD.md](PRD.md)
- Plan: [docs/ROADMAP.md](docs/ROADMAP.md)
- Stage-game check: `uv run --with numpy --with scipy python -I tools/stage_check.py`
