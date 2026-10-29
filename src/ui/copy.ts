// Player-facing text for actions and outcomes. Rules text lives in docs/GAME-SPEC.md; this is the short form.
// Working copy: the game name and menu wording are Devansh's call (ROADMAP open decision 5).

export const TITLE = 'ATTACKER // DEFENDER';
export const SUBTITLE = 'a game-theory security duel';

export const ACTION_BLURB: Record<string, string> = {
  A1: 'Map open ports. Raises your Knowledge.',
  A3: 'Hammer the login. Can breach. Loud.',
  A4: 'Exploit the web form. Can breach. Knowledge helps.',
  A5: 'Flood the service. Damage from outside, very loud.',
  A6: 'Email a staff member. Can breach. Only Training stops it.',
  A2: 'Listen on the inside network. Raises Knowledge.',
  A8: 'Steal data. Your main source of Compromise.',
  A9: 'Plant a backdoor. Survives one eviction.',
  A7: 'Do nothing. Risk cools by 10. A hunt cannot find you.',
  D1: 'Watch the network. Reveals the attack and phase. Raises their risk.',
  D2: 'Patch the web app. Stops SQL injection.',
  D3: 'Throttle logins and traffic. Stops brute force and DoS.',
  D4: 'Encrypt traffic. Stops sniffing, weakens exfiltration.',
  D5: 'Close ports, filter egress. Cuts recon.',
  D6: 'Train the staff. Stops phishing.',
  D7: 'Hunt for intruders. Evicts an active one inside.',
  D8: 'Spend nothing. The server is exposed.',
};

export const REASON_TEXT = {
  breach: 'Compromise reached 100. The server is lost.',
  caught: 'The attacker was traced and caught.',
  timeout: 'The defender held out for 20 rounds.',
} as const;
