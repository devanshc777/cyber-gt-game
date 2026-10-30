import './style.css';
import { menu, endScreen, title } from './ui/screens';
import { startMatch, type MatchSetup } from './ui/match';
import { analysis } from './ui/analysis';
import { briefing } from './ui/guide';

const root = document.querySelector<HTMLElement>('#app')!;
const theme = (name: 'dark' | 'light') => {
  document.body.className = name;
  document.body.style.removeProperty('--heat');
  scrollTo(0, 0);
};

// Browser history mirrors the screens, so Back always works: title -> menu -> match -> end, analysis off the menu.
// The briefing's entry is replaced by the match, so Back from a match lands on the menu, not the slides again.
type Screen = 'title' | 'menu' | 'brief' | 'match' | 'end' | 'analysis';
let here: Screen = 'title';
let restoring = false;
function mark(screen: Screen, replace = false) {
  here = screen;
  document.querySelectorAll('.tour, .callout').forEach((n) => n.remove());
  if (restoring) return;
  if (replace || history.state === null) history.replaceState({ screen }, '');
  else history.pushState({ screen }, '');
}
addEventListener('popstate', (e) => {
  if (here === 'match' && !confirm('Leave this match? It will not be saved.')) {
    history.pushState({ screen: 'match' }, '');
    return;
  }
  restoring = true;
  const to = (e.state?.screen ?? 'title') as Screen;
  if (to === 'title') toTitle();
  else if (to === 'analysis') toAnalysis();
  else toMenu();
  restoring = false;
});
const back = () => history.back();

function toTitle() {
  mark('title');
  theme('dark');
  title(root, toMenu);
}
function toMenu() {
  mark('menu');
  theme('dark');
  menu(root, brief, toAnalysis, back);
}
function brief(setup: MatchSetup) {
  mark('brief');
  theme('dark');
  briefing(root, setup.role, () => play(setup), back);
}
function play(setup: MatchSetup) {
  mark('match', here === 'brief' || here === 'end');
  scrollTo(0, 0);
  startMatch(root, setup, (end) => {
    mark('end');
    scrollTo(0, 0);
    endScreen(root, end, () => play(setup), back, toAnalysis);
  }, back);
}
function toAnalysis() {
  mark('analysis');
  theme('light');
  analysis(root, back);
}

toTitle();
