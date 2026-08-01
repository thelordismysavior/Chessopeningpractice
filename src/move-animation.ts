import { Chess, type Square } from 'chess.js';
import { parseUciMove } from './move-notation';

export type PieceAnimation = {
  from: Square;
  to: Square;
  piece: string;
  captured?: string;
  captureSquare?: Square;
};

export type MoveAnimation = {
  fromFen: string;
  afterFen: string;
  pieces: PieceAnimation[];
  isCastle: boolean;
};

function pieceName(color: 'w' | 'b', type: string): string {
  return `${color}${type.toUpperCase()}`;
}

function castleRook(move: { from: Square; to: Square }): { from: Square; to: Square } | null {
  const rooks: Record<string, { from: Square; to: Square }> = {
    e1g1: { from: 'h1', to: 'f1' },
    e1c1: { from: 'a1', to: 'd1' },
    e8g8: { from: 'h8', to: 'f8' },
    e8c8: { from: 'a8', to: 'd8' },
  };
  return rooks[`${move.from}${move.to}`] ?? null;
}

/**
 * Internal Move Animation support shared by practice and Line Preview.
 * Authored walkthrough decisions remain private to Line Preview.
 */
export function planMoveAnimation(fromFen: string, move: string): MoveAnimation | null {
  const parsed = parseUciMove(move);
  if (!parsed) return null;
  const chess = new Chess(fromFen);
  const movingPiece = chess.get(parsed.from);
  if (!movingPiece) return null;
  const isEnPassant = movingPiece.type === 'p' && parsed.from[0] !== parsed.to[0] && !chess.get(parsed.to);
  const capturedSquare = isEnPassant ? `${parsed.to[0]}${Number(parsed.to[1]) + (movingPiece.color === 'w' ? -1 : 1)}` as Square : parsed.to;
  const capturedPiece = chess.get(capturedSquare);
  let result;
  try {
    result = chess.move(parsed);
  } catch {
    return null;
  }

  const rook = result.isKingsideCastle() || result.isQueensideCastle() ? castleRook(parsed) : null;
  const pieces: PieceAnimation[] = [{
    from: parsed.from,
    to: parsed.to,
    piece: pieceName(movingPiece.color, movingPiece.type),
    ...(capturedPiece ? { captured: pieceName(capturedPiece.color, capturedPiece.type), captureSquare: capturedSquare } : {}),
  }];
  if (rook) {
    const rookPiece = new Chess(fromFen).get(rook.from);
    if (rookPiece) pieces.push({ from: rook.from, to: rook.to, piece: pieceName(rookPiece.color, rookPiece.type) });
  }
  return { fromFen, afterFen: chess.fen(), pieces, isCastle: Boolean(rook) };
}

export function planFenAnimation(fromFen: string, afterFen: string): MoveAnimation | null {
  const chess = new Chess(fromFen);
  const candidate = chess.moves({ verbose: true }).find((move) => {
    const next = new Chess(fromFen);
    next.move(move);
    return next.fen() === afterFen;
  });
  return candidate ? planMoveAnimation(fromFen, `${candidate.from}${candidate.to}${candidate.promotion ?? ''}`) : null;
}

export function settleDisplayFen(learnerAfterFen: string, replyAfterFen: string | null, nextPositionFen: string | null): string {
  return replyAfterFen ?? nextPositionFen ?? learnerAfterFen;
}
