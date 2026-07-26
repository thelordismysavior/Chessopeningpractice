import { describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { COURSES, LEVELS } from '../src/courses';

describe('white course content', () => {
  test('contains two white courses with three valid eight-position lessons', () => {
    expect(COURSES.map((course) => course.id)).toEqual(['jobava-london', 'london-system']);
    for (const course of COURSES) {
      expect(course.side).toBe('white');
      expect(Object.keys(course.lessons)).toEqual(LEVELS);
      for (const level of LEVELS) {
        const positions = course.lessons[level].positions;
        expect(positions).toHaveLength(8);
        for (const position of positions) {
          expect(position.explanation.length).toBeGreaterThan(0);
          expect(() => new Chess(position.fen)).not.toThrow();
          expect(position.expectedMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
        }
      }
    }
  });
});
