import { describe, expect, test } from 'vitest';
import { pieceAppearance } from '../src/piece-appearance';

describe('piece appearance', () => {
  test('maps every piece code to a solid glyph and owning side', () => {
    const solid = {
      K: '\u265A',
      Q: '\u265B',
      R: '\u265C',
      B: '\u265D',
      N: '\u265E',
      P: '\u265F',
    };

    for (const type of ['K', 'Q', 'R', 'B', 'N', 'P'] as const) {
      expect(pieceAppearance(`w${type}`)).toEqual({ glyph: solid[type], side: 'white' });
      expect(pieceAppearance(`b${type}`)).toEqual({ glyph: solid[type], side: 'black' });
    }
  });
});
