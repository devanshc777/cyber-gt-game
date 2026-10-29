# Art direction: materials and options (nothing locked)

> Per his design universe (`C:\Personal\Aethion\design\CLAUDE.md`): take the *thinking*, not one board's look; list
> this task's forces; leave the picks and the words to him. Reads below are **my read (hypothesis)** unless marked
> **his words**. Log this task in `design/tasks/` once he starts picking.

## His brief (his words, 2026-10-30)
- 2D art, "2D PNG art style", animated.
- Menu: "white, black, and blue-green old computer aesthetic gone into your 2D animated style".
- In-game: 2D art "with a mix of Cisco Packet Tracer", "the attacks happening", and the animations in between.
- References: his design universe, and "some pins of KM art" (not found yet, see ROADMAP open decision 4).

## Forces in this task
1. **Readability first.** A round is a hidden-choice reveal. The player must see in one glance: what I did, what they
   did, did it land, what moved (C, R, K, B). Art serves that; it never hides state.
2. **Two moods, one world.** Menu = atmosphere (old machine waking up). Match = diagram (Packet Tracer topology,
   nodes and links). Same palette must hold both.
3. **Asymmetry is the theme.** Defender = budget, attacker = time/risk. Each role could own one end of the palette.
4. **It is a teaching tool.** The analysis page sits in the same skin and has to carry heatmaps and charts legibly.
5. **GPT is the generator.** Painterly 2D comes out well; grid-true pixel art comes out poorly (measured on his
   game-art board, see `design/boards/game-art.md`). Flat, limited-palette 2D is a good fit for GPT.

## What his universe already says that bears on this
- **Colour with a job** (taste-map): many hues work when each one means something; three with no job read as noise.
  Here: blue-green could mean *defender/network healthy*, one warm accent could mean *attack/alert*.
- **Human mark over polish**: CRT scanlines, print grain, texture that proves a machine was physically there.
- **Computing Life** (his shipped neon-arcade game): CRT panel, window title bars, two-tone. Same family as this
  brief, but his rule stands: "computing life has its identity". This game should not reuse its pink/lilac skin.
- **dnd-pixel #1**: a CRT "LOADING..." overgrown with plants, the bridge pin between his two directions.

## Three directions to react to (pick, mix, or reject)

| | A. Phosphor terminal | B. 1-bit desktop | C. Blueprint diagram |
|---|---|---|---|
| Lineage | green/teal phosphor CRTs, 1980s terminals, *Hacknet*, *Uplink* | early Macintosh 1-bit, dithered greys, window chrome | network diagrams, Packet Tracer icons, engineering blueprints |
| Palette | near-black + blue-green phosphor + one warm alert | off-white + off-black + blue-green as the only colour | deep blue-green ground + white linework + one warm alert |
| Menu | CRT boot sequence, glow, scanlines | windowed desktop, dithered illustration | big topology drawing assembling itself |
| Match | glowing nodes, packets as light pulses | crisp black icons on white, dither shading | diagram nodes, dashed packet paths |
| Risk | glow/neon slides toward generic "hacker" look | can feel static or retro-cute | can feel like a textbook |
| Fit to his words | "old computer", "blue-green" | "white, black" | "Packet Tracer" |

**My read (hypothesis):** his three words map to three different directions, and A + B mix naturally: a 1-bit
white/black world where blue-green is the one living colour (the network), and a warm accent appears only when an
attack lands. That hands colour a job, which is his throughline. His call.

## Asset list (MVP, website arena)
Menu: background scene, title lockup (if not type-only), battleground card for Website (+ locked silhouettes if wanted).
Match: topology nodes (attacker machine, internet cloud, firewall, web server, database, staff PC), link styles,
7 attacker action icons, 8 defender action icons, hit/block/detected effects, caught and breached end-state art.
Total: roughly 25-30 PNGs. Icons may be better as one sprite sheet per role.

## GPT spec sheet (one per asset, filled in once a direction is picked)
```
ASSET: <name>   SIZE: <px, aspect>   BACKGROUND: transparent | solid <hex>
DIRECTION: <A/B/C/mix>   PALETTE: <hex list, exact>   LINE: <weight, style>
SUBJECT: <one sentence, what it depicts>
MUST: <readable at Npx, centred, silhouette distinct from X>
MUST NOT: <text in image, gradients, glow (unless chosen), extra colours>
REFS: <which ref images attached, each captioned in-pixel with its job>
```
Process (from his universe's measured lessons): fresh chat per batch, refs captioned with their job, GPT does shape,
palette is enforced after (recolour/key in code or ffmpeg). Transparent backgrounds come back black via clipboard,
so key them out (see `~/.claude/patterns.md`, GPT image extraction).
