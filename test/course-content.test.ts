import { describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { COURSES, LEVELS, type VariationKind } from '../src/courses';

const REQUIRED_KINDS: VariationKind[] = ['core', 'alternative', 'punish'];

describe('course content', () => {
  test('never teaches a quiet move when the opponent queen can be captured', () => {
    const issues: string[] = [];

    for (const course of COURSES) {
      for (const level of LEVELS) {
        for (const variation of course.lessons[level].variations) {
          for (const position of variation.positions) {
            const queenCaptures = new Chess(position.fen).moves({ verbose: true })
              .filter((move) => move.captured === 'q')
              .map((move) => `${move.from}${move.to}${move.promotion ?? ''}`);

            if (queenCaptures.length > 0 && !queenCaptures.includes(position.expectedMove)) {
              issues.push(`${course.id}/${level}/${variation.kind}/${position.id}: expected ${position.expectedSan}, queen captures ${queenCaptures.join(', ')}`);
            }
          }
        }
      }
    }

    expect(issues).toEqual([]);
  });

  test('connects consecutive learner positions with exactly one opponent reply', () => {
    const issues: string[] = [];

    for (const course of COURSES) {
      for (const level of LEVELS) {
        for (const variation of course.lessons[level].variations) {
          for (let index = 0; index < variation.positions.length - 1; index += 1) {
            const current = variation.positions[index];
            const next = variation.positions[index + 1];
            const afterLearner = new Chess(current.fen);
            afterLearner.move({
              from: current.expectedMove.slice(0, 2),
              to: current.expectedMove.slice(2, 4),
              ...(current.expectedMove[4] ? { promotion: current.expectedMove[4] as 'q' | 'r' | 'b' | 'n' } : {}),
            });
            const replyCount = afterLearner.moves({ verbose: true }).filter((reply) => {
              const afterReply = new Chess(afterLearner.fen());
              afterReply.move(reply);
              return afterReply.fen() === next.fen;
            }).length;

            if (replyCount !== 1) {
              issues.push(`${course.id}/${level}/${variation.kind}/${current.id} -> ${next.id}: ${replyCount} matching replies`);
            }
          }
        }
      }
    }

    expect(issues).toEqual([]);
  });

  test('contains the four agreed courses with practical variation coverage', () => {
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
        expect(lesson.variations.map(({ kind }) => kind)).toEqual(expect.arrayContaining(REQUIRED_KINDS));
        expect(lesson.positions).toEqual(lesson.variations.flatMap((variation) => variation.positions));

        for (const variation of lesson.variations) {
          expect(variation.id.startsWith(`${level}-`)).toBe(true);
          expect(variation.title.length).toBeGreaterThan(0);
          expect(variation.summary.length).toBeGreaterThan(0);
          expect(typeof variation.evalCp).toBe('number');

          const count = variation.positions.length;
          if (variation.kind === 'core') {
            expect(count).toBeGreaterThanOrEqual(8);
            expect(count).toBeLessThanOrEqual(10);
          } else {
            expect(count).toBeGreaterThanOrEqual(4);
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

    expect(COURSES[0].lessons.beginner.variations.map(({ id }) => id))
      .toContain('beginner-meet-g6');
  });

  test('covers practical Jobava replies at every level', () => {
    expect(Object.fromEntries(LEVELS.map((level) => [
      level,
      COURSES[0].lessons[level].variations.map(({ id }) => id),
    ]))).toMatchObject({
      beginner: expect.arrayContaining(['beginner-meet-g6', 'beginner-meet-c5']),
      intermediate: expect.arrayContaining(['intermediate-meet-a6', 'intermediate-meet-g6']),
      advanced: expect.arrayContaining(['advanced-meet-c5', 'advanced-meet-g6']),
    });
    expect(LEVELS.map((level) => COURSES[0].lessons[level].variations.length)).toEqual([5, 5, 5]);
  });

  test('covers practical London replies at every level', () => {
    const london = COURSES[1].lessons;
    expect(london.beginner.variations.map(({ id }) => id))
      .toEqual(expect.arrayContaining(['beginner-meet-g6', 'beginner-meet-c6']));
    expect(london.intermediate.variations.map(({ id }) => id))
      .toEqual(expect.arrayContaining(['intermediate-meet-bf5', 'intermediate-meet-nh5']));
    expect(london.advanced.variations.map(({ id }) => id))
      .toEqual(expect.arrayContaining(['advanced-poisoned-pawn', 'advanced-meet-g6', 'advanced-meet-c6']));
    expect(LEVELS.map((level) => london[level].variations.length)).toEqual([5, 5, 6]);
  });

  test('covers practical Sicilian sidelines at every level', () => {
    const sicilian = COURSES[2].lessons;
    expect(sicilian.beginner.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'beginner-alapin', 'beginner-closed', 'beginner-smith-morra',
    ]));
    expect(sicilian.intermediate.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'intermediate-grand-prix', 'intermediate-delayed-alapin',
      'intermediate-anti-sveshnikov', 'intermediate-smith-morra-accepted',
    ]));
    expect(sicilian.advanced.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'advanced-richter-rauzer', 'advanced-sozin',
      'advanced-classical-be2', 'advanced-closed-fianchetto',
    ]));
    expect(LEVELS.map((level) => sicilian[level].variations.length)).toEqual([6, 7, 7]);
  });

  test('covers practical Caro-Kann sidelines at every level', () => {
    const caro = COURSES[3].lessons;
    expect(caro.beginner.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'beginner-advance', 'beginner-two-knights', 'beginner-fantasy', 'beginner-hillbilly',
    ]));
    expect(caro.intermediate.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'intermediate-panov', 'intermediate-advance-short',
      'intermediate-advance-tal', 'intermediate-fantasy',
    ]));
    expect(caro.advanced.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'advanced-panov-main', 'advanced-advance-van-der-wiel',
      'advanced-classical-tartakower', 'advanced-two-knights-exchange',
    ]));
    expect(LEVELS.map((level) => caro[level].variations.length)).toEqual([7, 7, 7]);
  });

  test('explains practical move order at the point of choice', () => {
    const jobava = COURSES[0].lessons.advanced.variations.find(({ id }) => id === 'advanced-meet-c5');
    const london = COURSES[1].lessons.advanced.variations.find(({ id }) => id === 'advanced-poisoned-pawn');

    expect(jobava?.positions.map(({ explanation }) => explanation)).toContain(
      'Build a strong centre before Black can recapture on d4.',
    );
    expect(london?.positions.map(({ explanation }) => explanation)).toContain(
      'Jump to b5 and make Black spend a tempo with ...Na6 while the queen stays exposed.',
    );
  });
});
