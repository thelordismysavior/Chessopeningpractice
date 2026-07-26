import { describe, expect, test } from 'vitest';
import { COURSES, type Course } from '../src/courses';
import { courseMastery, overallMastery } from '../src/mastery';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { emptyRecord } from '../src/review-schedule';

const course = COURSES[0];
const beginnerMain = course.lessons.beginner.variations[0];

function progressWith(overrides: Partial<CourseProgress>): CourseProgress {
  return { ...emptyProgress(), ...overrides };
}

describe('course mastery', () => {
  test('counts every line in every level as the denominator', () => {
    const summary = courseMastery(course, emptyProgress());
    expect(summary.total).toBe(9);
    expect(summary.mastered).toBe(0);
    expect(summary.ratio).toBe(0);
  });

  test('counts a banked line with no due positions as mastered', () => {
    const summary = courseMastery(course, progressWith({ completedVariationIds: [beginnerMain.id] }));
    expect(summary.mastered).toBe(1);
  });

  test('does not count a banked line that still has a due position', () => {
    const summary = courseMastery(course, progressWith({
      completedVariationIds: [beginnerMain.id],
      positions: { [beginnerMain.positions[0].id]: { ...emptyRecord(), due: true } },
    }));
    expect(summary.mastered).toBe(0);
  });

  test('ignores a due position belonging to a line that is not banked', () => {
    const summary = courseMastery(course, progressWith({
      positions: { [beginnerMain.positions[0].id]: { ...emptyRecord(), due: true } },
    }));
    expect(summary.mastered).toBe(0);
    expect(summary.total).toBe(9);
  });
});

describe('overall mastery', () => {
  test('sums every course', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
    const summary = overallMastery(byCourse);
    expect(summary.total).toBe(36);
    expect(summary.mastered).toBe(0);
  });

  test('reports the ratio across courses', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
    byCourse[course.id] = progressWith({ completedVariationIds: [beginnerMain.id] });
    const summary = overallMastery(byCourse);
    expect(summary.mastered).toBe(1);
    expect(summary.ratio).toBeCloseTo(1 / 36);
  });
});
