import { COURSES, LEVELS, type Course, type Variation } from './courses';
import type { CourseProgress } from './progress';

export type MasterySummary = { mastered: number; total: number; ratio: number };

export type LineState = 'untouched' | 'banked' | 'mastered';

const summary = (mastered: number, total: number): MasterySummary => ({
  mastered,
  total,
  ratio: total === 0 ? 0 : mastered / total,
});

/** A line is mastered when it is banked and none of its positions is due. */
export function lineState(variation: Variation, progress: CourseProgress): LineState {
  if (!progress.completedVariationIds.includes(variation.id)) return 'untouched';
  const due = variation.positions.some((position) => progress.positions[position.id]?.due);
  return due ? 'banked' : 'mastered';
}

export function courseMastery(course: Course, progress: CourseProgress): MasterySummary {
  let mastered = 0;
  let total = 0;
  for (const level of LEVELS) {
    for (const variation of course.lessons[level].variations) {
      total += 1;
      if (lineState(variation, progress) === 'mastered') mastered += 1;
    }
  }
  return summary(mastered, total);
}

export function overallMastery(progressByCourse: Record<Course['id'], CourseProgress>): MasterySummary {
  let mastered = 0;
  let total = 0;
  for (const course of COURSES) {
    const courseSummary = courseMastery(course, progressByCourse[course.id]);
    mastered += courseSummary.mastered;
    total += courseSummary.total;
  }
  return summary(mastered, total);
}
