import { describe, expect, test } from 'vitest';
import type { Lesson, PracticePosition, Variation } from '../src/courses';
import { createPracticeSession } from '../src/practice-session';

function pos(id: string, fen: string, expectedMove: string, expectedSan: string): PracticePosition {
  return { id, fen, expectedMove, expectedSan, explanation: `Play ${expectedSan}.` };
}

function variation(idPrefix: string, kind: Variation['kind'], positions: PracticePosition[]): Variation {
  return {
    id: `${idPrefix}-${kind}`,
    kind,
    title: `${kind} line`,
    summary: `Summary for ${kind}.`,
    evalCp: kind === 'punish' ? 120 : 10,
    positions,
  };
}

/** Tiny three-variation lesson built from real Jobava London FENs. */
function fixtureLesson(): Lesson {
  const main = variation('beginner', 'main', [
    pos('beginner-main-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4', 'd4'),
    pos('beginner-main-2', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'b1c3', 'Nc3'),
    pos('beginner-main-3', 'rnbqkb1r/ppp1pppp/5n2/3p4/3P4/2N5/PPP1PPPP/R1BQKBNR w KQkq - 2 3', 'c1f4', 'Bf4'),
  ]);
  const alternative = variation('beginner', 'alternative', [
    pos('beginner-alternative-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4', 'd4'),
    pos('beginner-alternative-2', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'b1c3', 'Nc3'),
  ]);
  const punish = variation('beginner', 'punish', [
    pos('beginner-punish-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4', 'd4'),
    pos('beginner-punish-2', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'b1c3', 'Nc3'),
  ]);
  const variations = [main, alternative, punish];
  return {
    level: 'beginner',
    title: 'Fixture lesson',
    summary: 'Three short variations for session tests.',
    variations,
    positions: variations.flatMap((entry) => entry.positions),
  };
}

function blackFixtureLesson(): Lesson {
  const main = variation('beginner', 'main', [
    pos('beginner-main-1', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'c7c5', 'c5'),
    pos('beginner-main-2', 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', 'b8c6', 'Nc6'),
  ]);
  const alternative = variation('beginner', 'alternative', [
    pos('beginner-alternative-1', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'c7c5', 'c5'),
  ]);
  const punish = variation('beginner', 'punish', [
    pos('beginner-punish-1', 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', 'c7c5', 'c5'),
  ]);
  const variations = [main, alternative, punish];
  return {
    level: 'beginner',
    title: 'Black fixture',
    summary: 'Black-side fixture.',
    variations,
    positions: variations.flatMap((entry) => entry.positions),
  };
}

const lesson = fixtureLesson();
const blackLesson = blackFixtureLesson();

describe('practice session variation banking', () => {
  test('banks a clean variation and advances to the next line', () => {
    const session = createPracticeSession(lesson);
    expect(session.snapshot.variation?.id).toBe('beginner-main');
    expect(session.snapshot.variationIndex).toBe(0);

    for (const position of lesson.variations[0].positions) {
      expect(session.submitMove(position.expectedMove).kind).toBe('correct');
    }

    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main']);
    expect(session.snapshot.variation?.id).toBe('beginner-alternative');
    expect(session.snapshot.variationIndex).toBe(0);
    expect(session.snapshot.position?.id).toBe('beginner-alternative-1');
    expect(session.snapshot.lessonComplete).toBe(false);
  });

  test('a mistake replays only that variation and leaves earlier banks intact', () => {
    const session = createPracticeSession(lesson);
    for (const position of lesson.variations[0].positions) session.submitMove(position.expectedMove);
    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main']);

    session.submitMove('b1c3');
    expect(session.snapshot.status).toBe('retrying');
    session.submitMove(lesson.variations[1].positions[0].expectedMove);
    session.submitMove(lesson.variations[1].positions[1].expectedMove);

    expect(session.snapshot.status).toBe('needs-clean-run');
    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main']);

    session.restartCleanRun();
    expect(session.snapshot.status).toBe('active');
    expect(session.snapshot.variation?.id).toBe('beginner-alternative');
    expect(session.snapshot.position?.id).toBe('beginner-alternative-1');
    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main']);
    expect(session.snapshot.cleanRun).toBe(true);
  });

  test('completes the lesson only when all three variations are banked', () => {
    const session = createPracticeSession(lesson);
    for (const variationEntry of lesson.variations) {
      for (const position of variationEntry.positions) session.submitMove(position.expectedMove);
    }
    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main', 'beginner-alternative', 'beginner-punish']);
    expect(session.snapshot.status).toBe('complete');
    expect(session.snapshot.lessonComplete).toBe(true);
  });

  test('seeds banked variations from prior progress and skips them', () => {
    const session = createPracticeSession(lesson, { bankedVariationIds: ['beginner-main'] });
    expect(session.snapshot.variation?.id).toBe('beginner-alternative');
    expect(session.snapshot.bankedVariationIds).toEqual(['beginner-main']);
  });

  test('review mode is unaffected by variation banking', () => {
    const session = createPracticeSession(lesson, { reviewPositionIds: ['beginner-main-3', 'beginner-main-1'] });
    expect(session.reviewMode).toBe(true);
    expect(session.snapshot.position?.id).toBe('beginner-main-3');
    session.submitMove(lesson.positions[2].expectedMove);
    expect(session.snapshot.position?.id).toBe('beginner-main-1');
    session.submitMove(lesson.positions[0].expectedMove);
    expect(session.snapshot.lessonComplete).toBe(false);
    expect(session.snapshot.bankedVariationIds).toEqual([]);
  });
});

describe('practice session move checking', () => {
  test('accepts the exact repertoire move and advances in course order', () => {
    const session = createPracticeSession(lesson);
    expect(session.snapshot.position?.id).toBe('beginner-main-1');
    const feedback = session.submitMove(lesson.positions[0].expectedMove);
    expect(feedback.kind).toBe('correct');
    expect(session.snapshot.position?.id).toBe('beginner-main-2');
  });

  test('rejects legal alternatives and requires the expected move on retry', () => {
    const session = createPracticeSession(lesson);
    expect(session.submitMove('b1c3').kind).toBe('incorrect');
    expect(session.snapshot.status).toBe('retrying');
    expect(session.submitMove(lesson.positions[0].expectedMove).kind).toBe('correct');
    expect(session.snapshot.position?.id).toBe('beginner-main-2');
    expect(session.snapshot.missedPositionIds).toEqual(['beginner-main-1']);
  });

  test('rejects illegal moves without advancing', () => {
    const session = createPracticeSession(lesson);
    const feedback = session.submitMove('a1a8');
    expect(feedback.kind).toBe('illegal');
    expect(session.snapshot.positionIndex).toBe(0);
  });

  test('accepts the exact Black repertoire move', () => {
    const session = createPracticeSession(blackLesson);
    const feedback = session.submitMove(blackLesson.positions[0].expectedMove);
    expect(feedback.kind).toBe('correct');
    expect(session.snapshot.position?.id).toMatch(/^beginner-/);
  });
});
