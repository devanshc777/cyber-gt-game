import type { Arena, GameState, RoundResult, Settings } from './types';
import { newGame, resolveRound } from './engine';
import { attackerView, defenderView, type AttackerCpu, type DefenderCpu } from './cpu';
import type { Rng } from './rng';

/** One full CPU-vs-CPU game. Each side only ever sees its own view. */
export function playMatch(arena: Arena, st: Settings, att: AttackerCpu, def: DefenderCpu, rng: Rng) {
  let state: GameState = newGame(st);
  const history: RoundResult[] = [];
  while (!state.winner) {
    const a = att(attackerView(state, history), rng);
    const d = def(defenderView(state, history), rng);
    const out = resolveRound(arena, st, state, a, d, rng);
    history.push(out.result);
    state = out.state;
  }
  return { final: state, history };
}
