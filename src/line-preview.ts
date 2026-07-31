import type { PracticePosition } from './courses';
import { planFenTransition, planMoveTransition, type MoveTransition } from './transition-plans';

export type LinePreviewAdvance = {
  authored: MoveTransition;
  reply: MoveTransition | null;
  nextIndex: number | null;
  completed: boolean;
};

/**
 * Plans one manual preview advance without changing progress or the authored
 * positions. The reply is the opponent move that connects the authored move
 * to the next stored prompt, when one exists.
 */
export function planLinePreviewAdvance(positions: PracticePosition[], index: number): LinePreviewAdvance | null {
  const position = positions[index];
  if (!position) return null;

  const authored = planMoveTransition(position.fen, position.expectedMove);
  if (!authored) return null;

  const next = positions[index + 1];
  const reply = next ? planFenTransition(authored.afterFen, next.fen) : null;
  return {
    authored,
    reply,
    nextIndex: next ? index + 1 : null,
    completed: !next,
  };
}
