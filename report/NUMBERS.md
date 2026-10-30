# Report numbers

Generated from `public/data/sim.json` (seed 1, 10,000 games per batch) by `tools/report-numbers.ts`. Do not edit by hand: rerun the sim, then this script.

## Stage games (one round, zero-sum, no costs)

**outside**: value 1.63 to the attacker.

|  | equilibrium mix |
| --- | --- |
| attacker | SQL Injection 26.3%, DoS Flood 37.5%, Phishing 36.3% |
| defender | IDS / Monitoring 75%, WAF / Patch 12.5%, Security Training 12.5% |

**inside**: value 0 to the attacker.

|  | equilibrium mix |
| --- | --- |
| attacker | Lay Low 100% |
| defender | IDS / Monitoring 45%, Encryption (TLS) 15%, Threat Hunt (Self-Audit) 40% |

## CPU vs CPU, attacker win % at Normal

| attacker (row) / defender (col) | random | easy | greedy | nash | trained |
| --- | --- | --- | --- | --- | --- |
| random | 10.63 | 0.92 | 0.19 | 0.24 | 0.09 |
| easy | 40.91 | 16.51 | 9.57 | 9.43 | 3.29 |
| greedy | 79.9 | 64.36 | 65.35 | 48.39 | 17.73 |
| nash | 85.73 | 70.42 | 66.8 | 45.24 | 16.33 |
| trained | 96.05 | 86.76 | 87.26 | 55.34 | 30.64 |

## Hard vs Hard (Nash vs Nash)

| measure | value |
| --- | --- |
| attacker breach | 45.24% |
| caught | 10.67% |
| defender survives 20 | 44.09% |
| mean rounds | 18.12 |
| games with a breach | 99.95% |
| mean first breach round | 4.02 |
| evictions per game | 1.52 |
| defender ran out of budget | 83.78% |

| attacker move | share |
| --- | --- |
| Lay Low | 43.79% |
| Exfiltrate | 25.41% |
| Phishing | 22.78% |
| SQL Injection | 7.82% |
| DoS Flood | 0.2% |

| defender move | share |
| --- | --- |
| Idle | 37.32% |
| Threat Hunt (Self-Audit) | 32.07% |
| Firewall / Egress filter | 19.55% |
| IDS / Monitoring | 9.88% |
| Security Training | 0.89% |
| WAF / Patch | 0.28% |
| Rate Limiting / MFA | 0.01% |

## Difficulty ladder (Nash CPU as the player)

| player side | level | player win % | settings |
| --- | --- | --- | --- |
| attacker | easy | 80.36 | rounds 20, budget 20, riskScale 0.75, threshold 50 |
| defender | easy | 99.34 | rounds 20, budget 26, riskScale 1, threshold 40 |
| attacker | normal | 67.08 | rounds 20, budget 20, riskScale 1, threshold 40 |
| defender | normal | 51.57 | rounds 20, budget 20, riskScale 1, threshold 40 |
| attacker | hard | 31.98 | rounds 20, budget 20, riskScale 1.25, threshold 30 |
| defender | hard | 11.95 | rounds 20, budget 14, riskScale 1, threshold 40 |
| attacker | learned | 16.21 | rounds 20, budget 20, riskScale 1, threshold 40 |
| defender | learned | 44.54 | rounds 20, budget 20, riskScale 1, threshold 40 |

## Exploitability: fixed plans vs adaptive CPUs (attacker win %)

| fixed attacker plan | greedy | nash | trained |
| --- | --- | --- | --- |
| phish>exfil | 0 | 1.28 | 0 |
| sqli>exfil | 0 | 0.56 | 0 |
| cautious phish | 32.44 | 41.76 | 11.84 |
| cautious sqli | 31.4 | 43.24 | 8.76 |
| backdoor first | 10.24 | 26.48 | 16.32 |
| scan x3 then sqli | 0 | 0.08 | 0 |
| dos only | 0 | 0 | 0 |
| hide from hunts | 1.76 | 6.84 | 0 |

| fixed defender plan | greedy | nash | trained |
| --- | --- | --- | --- |
| always IDS | 78.4 | 83.72 | 98.68 |
| always Hunt | 87 | 82.12 | 95.96 |
| always Training | 99.36 | 98.04 | 97.68 |
| always WAF | 96.88 | 98.56 | 99.88 |
| always Idle | 100 | 99.96 | 100 |
| train, hunt if inside | 92.72 | 86.92 | 96.16 |
| cheap rotation | 97.52 | 98.76 | 99.96 |
