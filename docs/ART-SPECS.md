# M7 art: GPT spec sheets (direction A+B mix)

> Direction picked by him 2026-10-30: **"A+B mix"** (his words). Read of it, from `ART-DIRECTION.md`: a 1-bit
> paper-and-ink world where blue-green is the one living colour (the network) and the warm accent appears only when
> an attack lands. Everything below is a draft for his edits; nothing here is generated yet.

## Shared rules (every sheet inherits these)
```
PALETTE (exact, enforced after generation, not trusted to GPT):
  paper   #e8e7e1   ground / fills
  ink     #111312   all linework, 1-bit shading
  ink-2   #4a4d4b   dither mid-tone only
  net     #13917d   network / defender things ONLY
  net-soft #b6dcd3  lit state of a defender thing
  alert   #d9512c   attack landing / damage ONLY
LINE: 2px-equivalent at final size, uniform weight, square caps. No outline variation.
SHADING: ordered dither (Bayer) or hatch, never a gradient.
MUST NOT: text or letters in the image, gradients, glow, drop shadows, extra colours, 3D perspective.
BACKGROUND: solid #e8e7e1 unless the sheet says otherwise (keyed out after, transparency from GPT comes back black).
```

**Process (from his design universe's measured lessons):**
1. One fresh GPT chat per batch (one batch = one row of the table below). Long chats errored before.
2. Attach refs captioned **in-pixel** with their job: `STYLE ONLY`, `SHAPE ONLY`, `PALETTE ONLY`.
3. GPT does shape. Palette and dither are enforced after: quantize each PNG to the six hexes above, key `#e8e7e1`
   to alpha. Asking GPT for exact hex or grid-true pixels failed on his game-art board; it draws painterly fine.
4. Each asset is checked at its final size in the running game before the next batch.

## Batches
| # | Batch | Assets | Final size | Count |
|---|---|---|---|---|
| 1 | Topology nodes | attacker machine, internet cloud, firewall, web server, database, staff PC, SOC | 96x96 | 7 |
| 2 | Attacker actions | Port Scan, Brute Force, SQL Injection, DoS Flood, Phishing, Packet Sniffing, Exfiltrate, Persist, Lay Low | 64x64 | 9 |
| 3 | Defender actions | IDS, WAF/Patch, Rate Limit/MFA, Encryption, Firewall/Egress, Training, Threat Hunt, Idle | 64x64 | 8 |
| 4 | Effects | packet, packet blocked, hit burst, detected ping, backdoor mark | 32x32 (strip of frames) | 5 |
| 5 | Menu | background scene, Website battleground card | 1600x900, 480x300 | 2 |
| 6 | End states | caught, breached, timeout (defender holds) | 800x450 | 3 |

Total 34. Icons go one per generation, not as a sprite sheet: GPT drifts the grid on sheets.

## Sheets

### Batch 1: topology nodes
```
ASSET: node-<id>   SIZE: 96x96 (generate 1024x1024, centred, 15% margin)   BACKGROUND: #e8e7e1
DIRECTION: A+B   PALETTE: ink + paper + ink-2 dither (net/alert are applied in code as state tints)
LINE: uniform 2px at 96px
SUBJECT: <per node, below>, drawn as a flat front-on network-diagram icon
MUST: silhouette readable at 48px; all seven share one baseline, one line weight, one level of detail
MUST NOT: shared rules; no screens with readable text
REFS: Packet Tracer topology screenshot (SHAPE ONLY: the icon-on-a-diagram feel),
      early Macintosh 1-bit icons (STYLE ONLY)
```
| id | Subject |
|---|---|
| atk | a lone desktop terminal with a hooded chair silhouette in front of it, seen from behind |
| net | a cloud made of overlapping rounded lobes, three short link stubs underneath |
| fw | a brick wall segment with a flame-free shield notch in the centre |
| web | a tall rack server, three stacked units, small status squares |
| db | a stack of three discs (classic database cylinder) |
| staff | an office monitor and keyboard on a desk edge |
| soc | a wide monitor wall of three screens with a headset on the desk |

### Batch 2: attacker actions
```
ASSET: atk-<id>   SIZE: 64x64 (generate 1024, 12% margin)   BACKGROUND: #e8e7e1
DIRECTION: A+B   PALETTE: ink + paper + ink-2 dither; ONE alert (#d9512c) accent per icon, max 15% of area
SUBJECT: <per action, below>
MUST: readable at 32px; one idea per icon; the alert accent marks the "point of attack"
MUST NOT: shared rules; skulls, hoodies, binary rain (generic hacker clichés)
REFS: batch-1 node icons once approved (STYLE ONLY, so the set matches)
```
| id | Subject (alert accent in brackets) |
|---|---|
| A1 Port Scan | a row of five small doors, a beam sweeping across them [the beam] |
| A3 Brute Force | a padlock with a ring of many keys around it [one key in the lock] |
| A4 SQL Injection | a syringe feeding into a database cylinder [the syringe tip] |
| A5 DoS Flood | a server swamped by a wave of tiny packet squares [the wave crest] |
| A6 Phishing | a fishhook baited with an envelope [the hook] |
| A2 Packet Sniffing | a magnifying glass over a cable [the lens glint] |
| A8 Exfiltrate | a data cylinder with a sack carried out through a door [the sack] |
| A9 Persist | a small hidden hatch in a wall with a key left in it [the key] |
| A7 Lay Low | a terminal with its screen dark, a crescent moon [no accent: the only icon without one] |

### Batch 3: defender actions
```
ASSET: def-<id>   SIZE: 64x64 (generate 1024, 12% margin)   BACKGROUND: #e8e7e1
DIRECTION: A+B   PALETTE: ink + paper + ink-2 dither; ONE net (#13917d) accent per icon, max 15% of area
SUBJECT: <per action, below>
MUST: readable at 32px; same frame and weight as batch 2 so the two sets read as rivals
MUST NOT: shared rules; padlock-and-shield stock imagery on every icon
REFS: approved batch-2 icons (STYLE ONLY)
```
| id | Subject (net accent in brackets) |
|---|---|
| D1 IDS | an eye inside a monitor frame [the iris] |
| D2 WAF/Patch | a cloth patch stitched over a hole in a wall [the stitches] |
| D3 Rate Limit/MFA | a turnstile with a phone beside it [the phone screen] |
| D4 Encryption | an envelope wrapped in a chain [the clasp] |
| D5 Firewall/Egress | a gate across a road with an arrow turned back [the arrow] |
| D6 Training | a chalkboard with a fishhook crossed out [the cross] |
| D7 Threat Hunt | a torch beam sweeping a dark rack [the beam] |
| D8 Idle | an empty chair at a desk [no accent] |

### Batch 4: effects
```
ASSET: fx-<id>   SIZE: 32x32 per frame, 4 frames in a horizontal strip (generate 1024x256)
BACKGROUND: #e8e7e1   DIRECTION: A+B   PALETTE: per row below
SUBJECT: <per effect>   MUST: frames equal width, subject centred in each
```
| id | Palette | Subject |
|---|---|---|
| packet | ink + alert | a small square envelope, slight squash on frames 2-3 |
| blocked | ink | the envelope hitting a bar and cracking into four pieces |
| hit | alert + ink | a jagged starburst growing over 4 frames |
| ping | net | concentric ring expanding (detected) |
| backdoor | ink + ink-2 | a tiny hatch opening and closing |

Code may keep drawing these as SVG; generate only if the SVG versions look thin next to batch 1-3.

### Batch 5: menu
```
ASSET: menu-bg   SIZE: 1600x900   BACKGROUND: the scene itself
DIRECTION: A+B   PALETTE: paper + ink + ink-2 dither, net as the only colour
SUBJECT: an old beige-grey desktop computer on a desk at night, its screen showing a glowing blue-green
         network diagram; the room in 1-bit dither. Left 55% of the frame quiet (menu text sits there).
MUST: subject in the right 45%; reads as "an old machine waking up"
MUST NOT: shared rules except glow is allowed on the screen only; no text on the screen
REFS: dnd-pixel #1 CRT "LOADING..." (STYLE ONLY: the CRT as an object in a room),
      Computing Life refs are NOT attached (that game keeps its own identity)

ASSET: card-website   SIZE: 480x300   BACKGROUND: #e8e7e1
SUBJECT: a browser window frame containing the batch-1 web server and database icons joined by a link
MUST: same line weight as batch 1   MUST NOT: shared rules; no URL or text
```

### Batch 6: end states
```
ASSET: end-<id>   SIZE: 800x450   BACKGROUND: #e8e7e1   DIRECTION: A+B
```
| id | Palette | Subject |
|---|---|---|
| caught | ink + net | the attacker terminal from batch 1, a net-coloured spotlight cone on it from above |
| breached | ink + alert | the database cylinder open, alert-coloured packets streaming out of the top |
| timeout | ink + net | the website network diagram intact, a clock face at dawn behind it |

## Left for him
- Title lockup: type-only in Silkscreen (current) or drawn. The game name itself is still open.
- Menu boot copy and every other word on screen.
- Every subject line above is a first suggestion. Strike or rewrite any of them before batch 1.
- "KM art" pins: if they change line or shading, this sheet changes before batch 1, not after.

## What shipped (2026-10-30, first pass, his "gen assets plug n show")
- Generated in his ChatGPT, one fresh chat per sheet: nodes (4x2), attacker icons (3x3), defender icons (4x2), menu
  scene. Raw sheets in `art/raw/`. Sheets beat one-per-icon on time, and grid drift does not matter because
  `art/process.py` groups ink by grid cell, snaps to the palette and keys outside paper to alpha.
- The menu scene is used raw (`public/art/menu.jpg`): palette snapping broke its screen diagram, and GPT had held
  the palette on its own.
- Not generated: effects (SVG packets and pings kept), end-state scenes (end screen reuses icons: breach = Exfiltrate,
  caught = IDS eye, timeout = firewall), the Website card (shows the web server and database icons).
- Recut a sheet: `uv run --with pillow --with numpy --with scipy python -I art/process.py art/raw/<sheet>.png public/art <cols>x<rows> <ids...>`
