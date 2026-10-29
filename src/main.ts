import './style.css';
import { menu, endScreen } from './ui/screens';
import { startMatch, type MatchSetup } from './ui/match';
import { analysis } from './ui/analysis';

const root = document.querySelector<HTMLElement>('#app')!;

function toMenu() {
  menu(root, play, toAnalysis);
}
function play(setup: MatchSetup) {
  startMatch(root, setup, (end) => endScreen(root, end, () => play(setup), toMenu, toAnalysis));
}
function toAnalysis() {
  analysis(root, toMenu);
}

toMenu();
