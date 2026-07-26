import type { Square } from 'chess.js';

export type ParsedMove = { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' };

export function parseUciMove(move: string): ParsedMove | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return null;
  return { from: move.slice(0, 2) as Square, to: move.slice(2, 4) as Square, ...(move[4] ? { promotion: move[4] as ParsedMove['promotion'] } : {}) };
}
