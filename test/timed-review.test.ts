import { describe, expect, test } from 'vitest';
import { COURSES, type Course } from '../src/courses';
import { emptyProgress, mergeProgress, migrateProgress, type CourseProgress } from '../src/progress';
import { reviewQueue } from '../src/review-queue';
import {
  applyOutcome,
  duePositionIds,
  emptyRecord,
  REVIEW_INTERVALS,
  type PositionRecord,
} from '../src/review-schedule';

const now = Date.UTC(2026, 0, 1);
const clean = { attempts: 1, solvedFirstTry: true, hinted: false };
const miss = { attempts: 2, solvedFirstTry: false, hinted: false };

describe('timed review', () => {
  test('advances stages and clamps at the final interval', () => {
    const first = applyOutcome(emptyRecord(), clean, 'recall', now);
    expect(first.intervalStage).toBe(1);
    expect(first.nextReviewAt).toBe(now + REVIEW_INTERVALS[1]);

    const final = applyOutcome({ ...emptyRecord(), intervalStage: REVIEW_INTERVALS.length - 1 }, clean, 'recall', now);
    expect(final.intervalStage).toBe(REVIEW_INTERVALS.length - 1);
    expect(final.nextReviewAt).toBe(now + REVIEW_INTERVALS.at(-1)!);
  });

  test('misses and hints reset to the four-hour stage', () => {
    const learned: PositionRecord = { ...emptyRecord(), intervalStage: 5, nextReviewAt: now - 1 };
    const missed = applyOutcome(learned, miss, 'review', now);
    expect(missed.intervalStage).toBe(0);
    expect(missed.nextReviewAt).toBe(now + REVIEW_INTERVALS[0]);

    const hinted = applyOutcome(learned, { ...clean, hinted: true }, 'recall', now);
    expect(hinted.intervalStage).toBe(0);
    expect(hinted.nextReviewAt).toBe(now + REVIEW_INTERVALS[0]);
  });

  test('uses timestamps for due membership and keeps legacy booleans as fallback', () => {
    const positions = {
      future: { ...emptyRecord(), intervalStage: 0, nextReviewAt: now + REVIEW_INTERVALS[0] },
      due: { ...emptyRecord(), intervalStage: 0, nextReviewAt: now },
      legacy: { ...emptyRecord(), due: true },
    };
    expect(duePositionIds(positions, ['future', 'due', 'legacy'], now)).toEqual(['due', 'legacy']);
    expect(duePositionIds(positions, ['future'], now + REVIEW_INTERVALS[0])).toEqual(['future']);
  });

  test('migrates legacy learned positions without scheduling untouched positions', () => {
    const migrated = migrateProgress({
      positions: {
        due: { ...emptyRecord(), attempts: 2, misses: 1, due: true },
        completed: { ...emptyRecord(), attempts: 3, corrects: 3 },
        untouched: emptyRecord(),
      },
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      completedVariationIds: ['beginner-main'],
      practiceMs: 900,
    }, now);

    expect(migrated.positions.due.nextReviewAt).toBe(now);
    expect(migrated.positions.completed.nextReviewAt).toBe(now + REVIEW_INTERVALS[0]);
    expect(migrated.positions.untouched.nextReviewAt).toBeUndefined();
    expect(migrated.practiceMs).toBe(900);
    expect(migrated.completedVariationIds).toEqual(['beginner-main']);
  });

  test('orders due groups before upcoming groups', () => {
    const course = COURSES[0];
    const positions = {
      [course.lessons.beginner.positions[0].id]: { ...emptyRecord(), nextReviewAt: now - 1, intervalStage: 0 },
      [course.lessons.beginner.positions[1].id]: { ...emptyRecord(), nextReviewAt: now + REVIEW_INTERVALS[0], intervalStage: 0 },
    };
    const progress = { ...emptyProgress(), positions };
    const byCourse = { [course.id]: progress } as Record<Course['id'], CourseProgress>;
    const queue = reviewQueue(byCourse, now);
    expect(queue.groups.map((group) => group.kind)).toEqual(['due', 'upcoming']);
    expect(queue.total).toBe(1);
    expect(queue.upcomingTotal).toBe(1);
  });

  test('merges additive counters with the latest schedule state', () => {
    const stored = { ...emptyProgress(), positions: { p: { ...emptyRecord(), attempts: 4, intervalStage: 1, nextReviewAt: now + 10 } } };
    const merged = mergeProgress(stored, {
      completedLevels: [], unlockedLevel: 0, completedVariationIds: [], practiceMs: 20,
      positions: { p: { attempts: 2, corrects: 1, misses: 0, hints: 1, reviewStreak: 0, due: false, intervalStage: 3, nextReviewAt: now + 30 } },
    });
    expect(merged.positions.p).toMatchObject({ attempts: 6, corrects: 1, hints: 1, intervalStage: 3, nextReviewAt: now + 30 });
  });
});
