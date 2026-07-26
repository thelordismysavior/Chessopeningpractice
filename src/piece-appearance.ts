export type PieceSide = 'white' | 'black';

export type PieceAppearance = {
  glyph: string;
  side: PieceSide;
};

const solidGlyphs: Record<string, string> = {
  K: '\u265A',
  Q: '\u265B',
  R: '\u265C',
  B: '\u265D',
  N: '\u265E',
  P: '\u265F',
};

export function pieceCode(color: 'w' | 'b', type: string): string {
  return `${color}${type.toUpperCase()}`;
}

export function pieceAppearance(code: string): PieceAppearance {
  const side: PieceSide = code[0] === 'w' ? 'white' : 'black';
  const glyph = solidGlyphs[code[1]?.toUpperCase() ?? ''];
  if (!glyph) throw new Error(`Unknown piece code: ${code}`);
  return { glyph, side };
}
