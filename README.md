# cyber-gt-game

Attacker vs Defender: a simultaneous-move, repeated security game in the browser, with a game-theory analysis page.
Course project for CSE3145 Game Theory.

Status: **M8, live.** Rules v2 (kill chain), five CPU tiers, analysis page, full art and motion.

- Live: https://cyber-gt-game.devanshchowdhary03.workers.dev
- Deploy: `npm run deploy` (Cloudflare Workers static assets, `wrangler.jsonc`)
- Report support: figures in [report/FIGURES.md](report/FIGURES.md), numbers in [report/NUMBERS.md](report/NUMBERS.md) (`npm run numbers`)

- Play: `npm run dev`, then open the printed URL
- Re-run simulations: `npm run sim -- --seed 1 --games 10000`
- Retrain the Learned tier: `npx vite-node tools/train.ts 20000 1`

- Tests: `npm test`
- CPU strength: `npx vite-node tools/eval-cpus.ts [N]`
- Rubric evidence: `npx vite-node tools/probe.ts` (v1) and `npx vite-node tools/probe2.ts` (v2)

- Rules: [docs/GAME-SPEC.md](docs/GAME-SPEC.md) (why v2: [docs/RUBRIC-REVIEW.md](docs/RUBRIC-REVIEW.md))
- Product: [PRD.md](PRD.md)
- Plan: [docs/ROADMAP.md](docs/ROADMAP.md)
- Stage-game check: `uv run --with numpy --with scipy python -I tools/stage_check.py`
