import { describe, expect, test } from 'vitest';
import { COURSES, LEVELS, type Course } from '../src/courses';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { nextResultAction, loadResultSummary, saveResultSummary, type ResultSummary } from '../src/result';

function emptyByCourse(): Record<Course['id'], CourseProgress> {
  return Object.fromEntries(COURSES.map((course) => [course.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
}

const summary: ResultSummary = {
  courseId: COURSES[0].id,
  level: LEVELS[0],
  lineId: 'beginner-main',
  lineTitle: 'Main line',
  lineState: 'banked',
  settledScore: { kind: 'cp', cp: 24 },
  mistakes: 1,
  hints: 0,
  elapsedMs: 1000,
  missed: [],
  authoredCorrection: 'Keep the centre.',
  branch: null,
};

describe('Result policy', () => {
  test('prioritizes remaining trainable material over due review', () => {
    const progress = emptyByCourse();
    progress[COURSES[0].id].positions['beginner-main-1'] = { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true };
    expect(nextResultAction(progress).kind).toBe('continue');
  });

  test('chooses due review after all trainable lines are banked', () => {
    const progress = emptyByCourse();
    for (const course of COURSES) progress[course.id].completedVariationIds = LEVELS.flatMap((level) => course.lessons[level].variations.filter((variation) => variation.kind !== 'reference').map((variation) => variation.id));
    progress[COURSES[0].id].positions[COURSES[0].lessons.beginner.variations[0].positions[0].id] = { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true };
    expect(nextResultAction(progress).kind).toBe('review');
  });

  test('falls back home when nothing remains actionable', () => {
    const progress = emptyByCourse();
    for (const course of COURSES) progress[course.id].completedVariationIds = LEVELS.flatMap((level) => course.lessons[level].variations.filter((variation) => variation.kind !== 'reference').map((variation) => variation.id));
    expect(nextResultAction(progress).kind).toBe('home');
  });

  test('round-trips the latest summary through session-scoped storage', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    saveResultSummary(summary, storage);
    expect(loadResultSummary(storage)).toEqual(summary);
  });
});
