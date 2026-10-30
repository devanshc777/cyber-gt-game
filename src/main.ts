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

function toTitle() {
  theme('dark');
  title(root, toMenu);
}
function toMenu() {
  theme('dark');
  menu(root, brief, toAnalysis);
}
function brief(setup: MatchSetup) {
  theme('dark');
  briefing(root, setup.role, () => play(setup));
}
function play(setup: MatchSetup) {
  scrollTo(0, 0);
  startMatch(root, setup, (end) => {
    scrollTo(0, 0);
    endScreen(root, end, () => play(setup), toMenu, toAnalysis);
  });
}
function toAnalysis() {
  theme('light');
  analysis(root, toMenu);
}

toTitle();
