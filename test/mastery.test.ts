import { describe, expect, test } from 'vitest';
import { COURSES, type Course } from '../src/courses';
import { courseMastery, lineState, overallMastery } from '../src/mastery';
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
    expect(summary.total).toBe(15);
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
    expect(summary.total).toBe(15);
  });
});

describe('overall mastery', () => {
  test('sums every course', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
    const summary = overallMastery(byCourse);
    expect(summary.total).toBe(70);
    expect(summary.mastered).toBe(0);
  });

  test('reports the ratio across courses', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
    byCourse[course.id] = progressWith({ completedVariationIds: [beginnerMain.id] });
    const summary = overallMastery(byCourse);
    expect(summary.mastered).toBe(1);
    expect(summary.ratio).toBeCloseTo(1 / 70);
  });
});

describe('lineState', () => {
  const course = COURSES[0];
  const variation = course.lessons.beginner.variations[0];

  test('is untouched when the line is not banked, even with clean positions', () => {
    const progress: CourseProgress = {
      ...emptyProgress(),
      positions: { [variation.positions[0].id]: { ...emptyRecord(), attempts: 1, corrects: 1 } },
    };
    expect(lineState(variation, progress)).toBe('untouched');
  });

  test('is banked when the line is banked but a position is due', () => {
    const progress: CourseProgress = {
      ...emptyProgress(),
      completedVariationIds: [variation.id],
      positions: { [variation.positions[1].id]: { ...emptyRecord(), due: true } },
    };
    expect(lineState(variation, progress)).toBe('banked');
  });

  test('is mastered when the line is banked with nothing due', () => {
    const progress: CourseProgress = { ...emptyProgress(), completedVariationIds: [variation.id] };
    expect(lineState(variation, progress)).toBe('mastered');
  });

  test('a due position in a different line does not affect this line', () => {
    const other = course.lessons.beginner.variations[1];
    const progress: CourseProgress = {
      ...emptyProgress(),
      completedVariationIds: [variation.id],
      positions: { [other.positions[0].id]: { ...emptyRecord(), due: true } },
    };
    expect(lineState(variation, progress)).toBe('mastered');
  });
});
