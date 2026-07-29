import { describe, expect, test } from 'vitest';
import type { Lesson, PracticePosition, Variation } from '../src/courses';
import { LessonRunner } from '../src/lesson-runner';
import { emptyProgress, type CourseProgress } from '../src/progress';

function pos(id: string, fen: string, expectedMove: string, expectedSan: string): PracticePosition {
  return { id, fen, expectedMove, expectedSan, explanation: `Play ${expectedSan}.` };
}

const OPENING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_D4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2';

function variation(kind: Variation['kind'], positions: PracticePosition[]): Variation {
  return { id: `beginner-${kind}`, kind, title: `${kind} line`, summary: `Summary for ${kind}.`, evalCp: 10, positions };
}

function fixtureLesson(): Lesson {
  const variations = [
    variation('main', [pos('main-1', OPENING, 'd2d4', 'd4'), pos('main-2', AFTER_D4_D5, 'b1c3', 'Nc3')]),
    variation('alternative', [pos('alt-1', OPENING, 'd2d4', 'd4')]),
  ];
  return { level: 'beginner', title: 'Fixture', summary: 'Fixture lesson.', variations, positions: variations.flatMap((entry) => entry.positions) };
}

/** Plays the current line correctly until the runner moves on or finishes. */
function playCurrentLine(runner: LessonRunner): void {
  for (let guard = 0; guard < 20; guard += 1) {
    const position = runner.snapshot.position;
    if (!position) return;
    const before = runner.snapshot.lineId;
    runner.submitMove(position.expectedMove);
    if (runner.snapshot.lessonComplete) return;
    if (runner.snapshot.lineId !== before) return;
  }
  throw new Error('line did not finish');
}

const lesson = fixtureLesson();
const base = (overrides: Partial<CourseProgress> = {}): CourseProgress => ({ ...emptyProgress(), ...overrides });

describe('sequencing', () => {
  test('starts on the first line in the teach phase', () => {
    const runner = new LessonRunner(lesson, base());
    expect(runner.snapshot.lineId).toBe('beginner-main');
    expect(runner.snapshot.lineIndex).toBe(0);
    expect(runner.snapshot.lineCount).toBe(2);
    expect(runner.snapshot.phase).toBe('teach');
  });

  test('advances to the next line once the first banks', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    expect(runner.snapshot.lineId).toBe('beginner-alternative');
    expect(runner.snapshot.phase).toBe('teach');
    expect(runner.snapshot.bankedVariationIds).toEqual(['beginner-main']);
  });

  test('skips lines already banked in earlier sessions', () => {
    const runner = new LessonRunner(lesson, base({ completedVariationIds: ['beginner-main'] }));
    expect(runner.snapshot.lineId).toBe('beginner-alternative');
  });

  test('opens only a selected line and recalls it when already banked', () => {
    const runner = new LessonRunner(lesson, base({ completedVariationIds: ['beginner-alternative'] }), { variationId: 'beginner-alternative' });
    expect(runner.snapshot.lineId).toBe('beginner-alternative');
    expect(runner.snapshot.lineCount).toBe(1);
    expect(runner.snapshot.phase).toBe('recall');
    playCurrentLine(runner);
    expect(runner.progressFor('beginner').completedLevels).toEqual([]);
  });

  test('completes the lesson when every line is banked', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    playCurrentLine(runner);
    expect(runner.snapshot.lessonComplete).toBe(true);
  });

  test('is immediately complete when every line was already banked', () => {
    const runner = new LessonRunner(lesson, base({ completedVariationIds: ['beginner-main', 'beginner-alternative'] }));
    expect(runner.snapshot.lessonComplete).toBe(true);
  });
});

describe('review mode', () => {
  test('drills only the requested positions with no teach pass and no banking', () => {
    const runner = new LessonRunner(lesson, base(), { reviewPositionIds: ['main-2'] });
    expect(runner.reviewMode).toBe(true);
    expect(runner.snapshot.phase).toBe('review');
    expect(runner.snapshot.position?.id).toBe('main-2');

    runner.submitMove('b1c3');
    expect(runner.snapshot.lessonComplete).toBe(false);
    expect(runner.snapshot.bankedVariationIds).toEqual([]);
  });

  test('clears a due position after one clean answer in a review session', () => {
    const due = base({ positions: { 'main-2': { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true } } });

    const runner = new LessonRunner(lesson, due, { reviewPositionIds: ['main-2'] });
    runner.submitMove('b1c3');
    const afterFirst = runner.progressFor('beginner');
    expect(afterFirst.positions['main-2']).toMatchObject({ reviewStreak: 0, due: false, intervalStage: 1 });
    expect(runner.snapshot.status).toBe('complete');
  });

  test('retries a miss once, then clears after one clean answer', () => {
    const due = base({ positions: { 'main-2': { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true } } });
    const runner = new LessonRunner(lesson, due, { reviewPositionIds: ['main-2'] });

    runner.submitMove('g1f3');
    runner.submitMove('b1c3');
    expect(runner.progressFor('beginner').positions['main-2']).toMatchObject({ reviewStreak: 0, due: true });
    expect(runner.snapshot.status).toBe('active');

    runner.submitMove('b1c3');
    expect(runner.progressFor('beginner').positions['main-2']).toMatchObject({ reviewStreak: 0, due: false });
    expect(runner.snapshot.status).toBe('complete');
  });
});

describe('progress output', () => {
  test('queues a recall miss but not a teach miss', () => {
    const runner = new LessonRunner(lesson, base());
    runner.submitMove('b1c3');
    runner.submitMove('d2d4');
    runner.submitMove('b1c3');
    expect(runner.snapshot.phase).toBe('recall');
    expect(runner.progressFor('beginner').positions['main-1']).toMatchObject({ due: false, misses: 0 });

    runner.submitMove('g1f3');
    runner.submitMove('d2d4');
    expect(runner.progressFor('beginner').positions['main-1']).toMatchObject({ due: true, misses: 1 });
  });

  test('completes and unlocks the level only when the lesson is finished', () => {
    const runner = new LessonRunner(lesson, base());
    expect(runner.progressFor('beginner').completedLevels).toEqual([]);

    playCurrentLine(runner);
    playCurrentLine(runner);

    const progress = runner.progressFor('beginner');
    expect(progress.completedLevels).toEqual(['beginner']);
    expect(progress.unlockedLevel).toBe(1);
  });

  test('does not complete a level whose prerequisite is unfinished', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    playCurrentLine(runner);
    expect(runner.progressFor('advanced').completedLevels).toEqual([]);
  });

  test('accumulates practice time', () => {
    let clock = 1000;
    const runner = new LessonRunner(lesson, base({ practiceMs: 500 }), { now: () => clock });
    clock = 3500;
    expect(runner.progressFor('beginner').practiceMs).toBe(3000);
  });
});

describe('summary', () => {
  test('reports banked lines, missed positions, hints, and elapsed time', () => {
    let clock = 0;
    const runner = new LessonRunner(lesson, base(), { now: () => clock });

    playCurrentLine(runner);
    clock = 8000;
    runner.submitMove('d2d4');
    runner.requestHint();
    runner.submitMove('d2d4');

    const summary = runner.summary();
    expect(summary.bankedLines.map((entry) => entry.id)).toEqual(['beginner-main', 'beginner-alternative']);
    expect(summary.missed).toEqual([{ positionId: 'alt-1', lineTitle: 'alternative line', expectedSan: 'd4' }]);
    expect(summary.hints).toBe(1);
    expect(summary.elapsedMs).toBe(8000);
  });
});
