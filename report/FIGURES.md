# Report figures

PNG, 3x scale, game palette (warm = attacker side, blue-green = defender side). Regenerate: `npm run dev`, open
*Game theory analysis*, press **EXPORT FIGURES**. On the dev server the files land here; on the deployed site they
download. Figures 02 and 03 use the page's current toggles and sliders (exported here with kappa off and g 30, L 25,
h 6). Every number quoted below is in [NUMBERS.md](NUMBERS.md).

| File | What it shows |
|---|---|
| `fig-02_stage_games-a.png` | Outside stage game payoff matrix (attacker gain per cell), rows attacker moves, columns defences. |
| `fig-02_stage_games-b.png` | Outside stage game: attacker's equilibrium mix (SQL Injection, DoS, Phishing; no pure strategy). |
| `fig-02_stage_games-c.png` | Outside stage game: defender's equilibrium mix (IDS 75%). |
| `fig-02_stage_games-d.png` | Inside stage game payoff matrix. |
| `fig-02_stage_games-e.png` | Inside stage game: attacker's equilibrium mix in the one-shot game (Lay Low). |
| `fig-02_stage_games-f.png` | Inside stage game: defender's equilibrium mix (IDS, Encryption, Threat Hunt). |
| `fig-03_inspection_game-a.png` | Inspection game (Exfiltrate/Lay Low vs Hunt/no hunt): attacker's mixed equilibrium. |
| `fig-03_inspection_game-b.png` | Inspection game: defender's hunt rate. |
| `fig-04_cpu_vs_cpu.png` | Attacker win % for every CPU pairing at Normal, 10,000 games per cell. |
| `fig-05_difficulty_ladder.png` | Win % for a strong player (Nash CPU) at each difficulty, as attacker and as defender. |
| `fig-06_nash_vs_nash-a.png` | Hard vs Hard outcomes: breach, caught, defender survives 20 rounds. |
| `fig-06_nash_vs_nash-b.png` | Hard vs Hard game length histogram (rounds). |
| `fig-07a_attacker_actions.png` | Share of the Hard attacker's moves in Nash vs Nash. |
| `fig-07b_defender_actions.png` | Share of the Hard defender's moves in Nash vs Nash. |
| `fig-08_exploitability-a.png` | Fixed attacker plans vs each adaptive defender CPU (attacker win %): no fixed plan wins. |
| `fig-08_exploitability-b.png` | Fixed defender plans vs each adaptive attacker CPU (attacker win %): every fixed defence loses. |

In the data the Learned tier is called `trained`.
