import { describe, expect, test } from 'vitest';
import type { Lesson, PracticePosition, Variation } from '../src/courses';
import { firstBranchPoint, LessonRunner } from '../src/lesson-runner';
import { emptyProgress, type CourseProgress } from '../src/progress';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_D4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2';

function position(id: string, fen: string, move: string, san: string): PracticePosition {
  return { id, fen, expectedMove: move, expectedSan: san, explanation: `Play ${san} to keep the plan.` };
}

function variation(kind: Variation['kind'], id: string, positions: PracticePosition[]): Variation {
  return { id, kind, title: `${kind} line`, summary: `${kind} summary`, evalCp: 0, positions };
}

const core = variation('core', 'core', [
  position('core-1', START, 'd2d4', 'd4'),
  position('core-2', AFTER_D4_D5, 'b1c3', 'Nc3'),
]);
const alternative = variation('alternative', 'alternative', [
  position('alternative-1', START, 'd2d4', 'd4'),
  position('alternative-2', AFTER_D4_D5, 'g1f3', 'Nf3'),
]);
const lesson: Lesson = {
  level: 'beginner',
  title: 'Branch fixture',
  summary: 'Fixture.',
  variations: [core, alternative],
  positions: [...core.positions, ...alternative.positions],
  lessonIdea: {
    anchorFen: START,
    anchorSan: 'd4',
    plan: 'Build the centre.',
    opponentTrigger: 'Black chooses a quieter setup.',
    resultingPlan: 'Develop the knight to f3.',
  },
};

const base = (overrides: Partial<CourseProgress> = {}): CourseProgress => ({ ...emptyProgress(), ...overrides });

function playLine(runner: LessonRunner, variation: Variation): void {
  for (let pass = 0; pass < 2; pass += 1) {
    for (const entry of variation.positions) runner.submitMove(entry.expectedMove);
  }
}

describe('first-bank branch review', () => {
  test('selects the first trainable alternative divergence position', () => {
    expect(firstBranchPoint(lesson, core)).toMatchObject({
      variationId: 'alternative',
      position: { id: 'alternative-2', expectedMove: 'g1f3' },
    });
  });

  test('starts once after a first core bank and persists its outcome', () => {
    const runner = new LessonRunner(lesson, base(), { variationId: 'core' });
    playLine(runner, core);

    expect(runner.snapshot).toMatchObject({
      phase: 'review',
      lessonComplete: false,
      branchReview: { variationId: 'alternative', position: { id: 'alternative-2' } },
    });

    runner.submitMove('g1h3');
    runner.submitMove('g1f3');
    expect(runner.snapshot.lessonComplete).toBe(true);
    expect(runner.progressFor('beginner').positions['alternative-2']).toMatchObject({ attempts: 2, misses: 1, due: true });
  });

  test('does not repeat for a banked core or for a non-core line', () => {
    const banked = new LessonRunner(lesson, base({ completedVariationIds: ['core'] }), { variationId: 'core' });
    expect(banked.snapshot.branchReview).toBeNull();

    const alternativeRun = new LessonRunner(lesson, base(), { variationId: 'alternative' });
    expect(alternativeRun.snapshot.branchReview).toBeNull();
  });
});
