import type { Arena } from '../types';

// Spec v2 sections 3, 4, 6 and 7, transcribed. Change numbers here only through SPEC-CHANGES.md.
// Defender columns, in order: D1 IDS, D2 WAF, D3 RateLim, D4 Encrypt, D5 Firewall, D6 Training, D7 Hunt, D8 Idle.
export const website: Arena = {
  id: 'website',
  name: 'Website',
  attackers: [
    { id: 'A1', name: 'Port Scan', phase: 'outside', baseRisk: 6 },
    { id: 'A3', name: 'Brute Force', phase: 'outside', baseRisk: 15 },
    { id: 'A4', name: 'SQL Injection', phase: 'outside', baseRisk: 10 },
    { id: 'A5', name: 'DoS Flood', phase: 'outside', baseRisk: 18 },
    { id: 'A6', name: 'Phishing', phase: 'outside', baseRisk: 7 },
    { id: 'A2', name: 'Packet Sniffing', phase: 'inside', baseRisk: 4 },
    { id: 'A8', name: 'Exfiltrate', phase: 'inside', baseRisk: 8 },
    { id: 'A9', name: 'Persist', phase: 'inside', baseRisk: 5 },
    { id: 'A7', name: 'Lay Low', phase: 'both', baseRisk: -10 },
  ],
  defenders: [
    { id: 'D1', name: 'IDS / Monitoring', cost: 2 },
    { id: 'D2', name: 'WAF / Patch', cost: 2 },
    { id: 'D3', name: 'Rate Limiting / MFA', cost: 1 },
    { id: 'D4', name: 'Encryption (TLS)', cost: 2 },
    { id: 'D5', name: 'Firewall / Egress filter', cost: 1 },
    { id: 'D6', name: 'Security Training', cost: 2 },
    { id: 'D7', name: 'Threat Hunt (Self-Audit)', cost: 2 },
    { id: 'D8', name: 'Idle', cost: 0 },
  ],
  payoff: {
    outside: {
      A1: [-2, 1, 1, 1, -2, 2, -1, 2],
      A3: [-3, 3, -4, 3, 0, 4, 1, 5],
      A4: [2, -5, 6, 6, 3, 6, 2, 8],
      A5: [1, 3, -2, 4, -2, 4, 2, 5],
      A6: [2, 5, 5, 5, 5, -4, 4, 6],
      A7: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    inside: {
      A2: [1, 3, 3, -3, 1, 3, 0, 4],
      A8: [2, 5, 5, 2, 2, 5, -3, 6],
      A9: [1, 1, 1, 1, 1, 1, -2, 1],
      A7: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  riskMultipliers: [
    { defender: 'D1', attackers: 'any', multiplier: 1.5 },
    { defender: 'D3', attackers: ['A3', 'A5'], multiplier: 1.25 },
    { defender: 'D5', attackers: ['A1', 'A5', 'A8'], multiplier: 1.25 },
  ],
  layLow: { id: 'A7', risk: -10 },
  idle: 'D8',
  breach: { attacks: ['A3', 'A4', 'A6'], divisor: 10, cap: 0.9 },
  damage: { A5: 2, A8: 5 },
  knowledge: {
    max: 5,
    bonusAttacks: ['A3', 'A4', 'A8'],
    bonusCap: 3,
    gainAttacks: ['A1', 'A2'],
    reduceDefenders: ['D5', 'D7'],
  },
  hunt: { defender: 'D7', evictRisk: 10 },
  persist: 'A9',
  noisyFailureRisk: 5,
  detectors: ['D1'],
  settings: {
    // Player defends against a CPU attacker: budget varies, risk stays Normal.
    defender: {
      easy: { rounds: 20, budget: 26, riskScale: 1, threshold: 40 },
      normal: { rounds: 20, budget: 20, riskScale: 1, threshold: 40 },
      hard: { rounds: 20, budget: 14, riskScale: 1, threshold: 40 },
    },
    // Player attacks a CPU defender: risk varies, CPU budget stays Normal (s7.2).
    attacker: {
      easy: { rounds: 20, budget: 20, riskScale: 0.75, threshold: 50 },
      normal: { rounds: 20, budget: 20, riskScale: 1, threshold: 40 },
      hard: { rounds: 20, budget: 20, riskScale: 1.25, threshold: 30 },
    },
  },
};
