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

// --- Teaching copy (draft wording; edit freely). One idea per line, plain words, numbers where they matter. ---

/** What each meter means, shown when the player taps its "?". */
export const HELP: Record<string, string> = {
  ROUND: 'There are 20 rounds. If the attacker has not won by the end, the defender wins.',
  POSITION: 'OUTSIDE: you are at the door. INSIDE: you broke in, and now you can steal data. Phishing, SQL Injection or Brute Force can get you in. Port Scan cannot.',
  COMPROMISE: 'How much data has been stolen. At 100 the attacker wins.',
  RISK: 'How much noise you have made. Past the trace line, every round you might get caught. Lay Low cools it by 10.',
  KNOWLEDGE: 'What you know about the target. Each point makes SQL Injection, Brute Force and Exfiltrate stronger (up to +3). Port Scan and Packet Sniffing raise it.',
  BUDGET: 'Your money for the whole match. Defences cost 1 or 2. It never refills. Idle is free.',
  SUSPICION: 'Your best guess that the attacker is already inside, from the clues so far.',
};

export interface Slide { icons: string[]; title: string; lines: string[] }

export const BRIEFING: Record<'attacker' | 'defender', Slide[]> = {
  attacker: [
    { icons: ['atk'], title: 'You are the attacker', lines: ['Your target: a website and its database.', 'Steal its data before the defender stops you.'] },
    { icons: ['A6', 'D6'], title: 'Every round, both sides pick in secret', lines: ['You pick an attack. The defender picks a defence.', 'Then both are revealed. A good defence blocks a matching attack.'] },
    { icons: ['net', 'web'], title: 'Step 1: get inside', lines: ['You start OUTSIDE the network.', 'Phishing, SQL Injection and Brute Force can break you in. Each is a chance, not a sure thing.', 'The defender is not told when you get in.'] },
    { icons: ['A1'], title: 'Knowledge makes you stronger', lines: ['Port Scan teaches you about the target. It never gets you in by itself.', 'Each point of Knowledge makes SQL Injection and Brute Force more likely to land.'] },
    { icons: ['A8', 'db'], title: 'Step 2: steal the data', lines: ['Once INSIDE, Exfiltrate raises Compromise.', 'Each steal is +10 to +30, bigger when their defence is weak. Every point of Knowledge adds +5 more, up to +15.', 'Compromise 100 = you win.'] },
    { icons: ['D1'], title: 'Watch your Risk', lines: ['Every move makes noise and raises Risk. Blocked moves are extra loud.', 'Past the trace line, each round you might get caught.', 'Lay Low skips a turn and cools Risk by 10.'] },
    { icons: ['D7', 'A9'], title: 'The defender can fight back', lines: ['Threat Hunt can find you inside and throw you back out.', 'Persist plants a backdoor, so one hunt cannot remove you.'] },
    { icons: ['end-caught'], title: 'How you lose', lines: ['You get caught (Risk too high).', 'Or 20 rounds pass before Compromise hits 100.'] },
    { icons: ['A7', 'A4'], title: 'Tips', lines: ['Mix your moves. A predictable attacker gets countered.', 'Scan once or twice, then try SQL Injection.', 'Lay Low before Risk reaches the line, not after.', 'Plant a backdoor before you start stealing.'] },
  ],
  defender: [
    { icons: ['soc'], title: 'You are the defender', lines: ['You protect a website and its database.', 'Hold out for 20 rounds, or get the attacker caught.'] },
    { icons: ['A6', 'D6'], title: 'Every round, both sides pick in secret', lines: ['You pick a defence. The attacker picks an attack.', 'Then both are revealed. The right defence blocks the matching attack.'] },
    { icons: ['fw'], title: 'You are short on money', lines: ['Your budget covers the whole match. It never refills.', 'Defences cost 1 or 2. Idle is free.', 'You cannot afford to guard everything every round.'] },
    { icons: ['staff'], title: 'You cannot see them', lines: ['The attacker starts outside. When they break in, you are not told.', 'Clues: IDS shows their move. A hunt that finds them. Compromise going up means data is leaving.', 'Suspicion is your best guess that they are inside.'] },
    { icons: ['D6', 'D2', 'D3'], title: 'Block the ways in', lines: ['Training stops Phishing.', 'WAF / Patch stops SQL Injection.', 'Rate Limiting stops Brute Force and DoS.'] },
    { icons: ['D7', 'D1'], title: 'Find them inside', lines: ['Threat Hunt throws out an attacker who is inside and active.', 'IDS reveals their move and makes them louder, so they get traced sooner.'] },
    { icons: ['end-breach'], title: 'How you lose', lines: ['Compromise reaches 100: the data is gone.'] },
    { icons: ['D1', 'D8'], title: 'Tips', lines: ['Do not spend everything early. Idle when nothing points at a threat.', 'Mix your defences. A predictable defender gets walked around.', 'When Compromise moves, they are inside: hunt.'] },
  ],
};

/** Plain-language result: why it ended, and one thing to try next. */
export const END_TEXT = {
  attacker: {
    breach: { why: 'You stole enough data. Compromise hit 100.', next: 'Try a harder level, or play the defender to see the other side.' },
    caught: { why: 'Your Risk got too high and the defender traced you.', next: 'Lay Low when Risk nears the trace line, and stop repeating moves that get blocked: blocked moves are extra loud.' },
    timeout: { why: 'Time ran out before Compromise reached 100.', next: 'Break in earlier, then spend more rounds on Exfiltrate.' },
  },
  defender: {
    breach: { why: 'The attacker stole enough data.', next: 'When Compromise starts rising, they are inside: Threat Hunt throws them out. Training, WAF and Rate Limiting block the three ways in.' },
    caught: { why: 'You got the attacker traced and caught.', next: 'Every IDS round made their moves louder. Try a harder level.' },
    timeout: { why: 'You held out for all 20 rounds.', next: 'Try a harder level: less budget, a smarter attacker.' },
  },
} as const;
