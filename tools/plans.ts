// Fixed (non-adaptive) plans used to probe CPUs for exploitability. Shared by eval-cpus.ts and sim.ts.
import { insideBelief, type AttackerCpu, type DefenderCpu } from '../src/engine/cpu';
import type { Settings } from '../src/engine/types';

export function fixedAttackers(st: Settings): Record<string, AttackerCpu> {
  return {
    'phish>exfil': (v) => (v.phase === 'inside' ? 'A8' : 'A6'),
    'sqli>exfil': (v) => (v.phase === 'inside' ? 'A8' : 'A4'),
    'cautious phish': (v) => (v.risk >= st.threshold - 15 ? 'A7' : v.phase === 'inside' ? 'A8' : 'A6'),
    'cautious sqli': (v) => (v.risk >= st.threshold - 15 ? 'A7' : v.phase === 'inside' ? 'A8' : 'A4'),
    'backdoor first': (v) => (v.risk >= st.threshold - 15 ? 'A7' : v.phase === 'outside' ? 'A6' : v.backdoor ? 'A8' : 'A9'),
    'scan x3 then sqli': (v) => (v.phase === 'inside' ? 'A8' : v.knowledge < 3 ? 'A1' : 'A4'),
    'dos only': () => 'A5',
    // Breach, hide on the first round inside and after any hunt; exfiltrate once the hunts stop.
    'hide from hunts': (v) => {
      const last = v.history.at(-1);
      if (v.phase === 'outside') return 'A6';
      return !last || last.phase === 'outside' || last.hunt ? 'A7' : 'A8';
    },
  };
}

export function fixedDefenders(): Record<string, DefenderCpu> {
  return {
    'always IDS': () => 'D1',
    'always Hunt': () => 'D7',
    'always Training': () => 'D6',
    'always WAF': () => 'D2',
    'always Idle': () => 'D8',
    'train, hunt if inside': (v) => (insideBelief(v) > 0.5 ? 'D7' : 'D6'),
    'cheap rotation': (v) => ['D3', 'D5', 'D8'][v.round % 3]!,
  };
}
