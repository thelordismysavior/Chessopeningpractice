import { describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { COURSES, LEVELS, type VariationKind } from '../src/courses';

const KIND_ORDER: VariationKind[] = ['main', 'alternative', 'punish'];

describe('course content', () => {
  test('contains the four agreed courses with three variations per lesson', () => {
    expect(COURSES.map((course) => course.id)).toEqual(['jobava-london', 'london-system', 'classical-sicilian', 'classical-caro-kann']);
    expect(Object.fromEntries(COURSES.map((course) => [course.id, { side: course.side, coreLine: course.coreLine }]))).toEqual({
      'jobava-london': { side: 'white', coreLine: '1. d4 d5 2. Nc3 Nf6 3. Bf4' },
      'london-system': { side: 'white', coreLine: '1. d4 d5 2. Nf3 Nf6 3. Bf4' },
      'classical-sicilian': { side: 'black', coreLine: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3' },
      'classical-caro-kann': { side: 'black', coreLine: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5' },
    });

    for (const course of COURSES) {
      expect(Object.keys(course.lessons)).toEqual(LEVELS);
      const seenIds = new Set<string>();

      for (const level of LEVELS) {
        const lesson = course.lessons[level];
        expect(lesson.variations).toHaveLength(3);
        expect(lesson.variations.map((variation) => variation.kind)).toEqual(KIND_ORDER);
        expect(lesson.positions).toEqual(lesson.variations.flatMap((variation) => variation.positions));

        for (const variation of lesson.variations) {
          expect(variation.id).toBe(`${level}-${variation.kind}`);
          expect(variation.title.length).toBeGreaterThan(0);
          expect(variation.summary.length).toBeGreaterThan(0);
          expect(typeof variation.evalCp).toBe('number');

          const count = variation.positions.length;
          if (variation.kind === 'main') {
            expect(count).toBeGreaterThanOrEqual(8);
            expect(count).toBeLessThanOrEqual(10);
          } else {
            expect(count).toBeGreaterThanOrEqual(4);
            expect(count).toBeLessThanOrEqual(5);
          }

          for (const [index, position] of variation.positions.entries()) {
            expect(position.id).toBe(`${variation.id}-${index + 1}`);
            expect(seenIds.has(position.id)).toBe(false);
            seenIds.add(position.id);
            expect(position.explanation.length).toBeGreaterThan(0);
            expect(() => new Chess(position.fen)).not.toThrow();
            expect(position.expectedMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
            const chess = new Chess(position.fen);
            expect(chess.turn()).toBe(course.side === 'white' ? 'w' : 'b');
            expect(() => chess.move({
              from: position.expectedMove.slice(0, 2),
              to: position.expectedMove.slice(2, 4),
              ...(position.expectedMove[4] ? { promotion: position.expectedMove[4] as 'q' | 'r' | 'b' | 'n' } : {}),
            })).not.toThrow();
          }
        }
      }
    }
  });
});
