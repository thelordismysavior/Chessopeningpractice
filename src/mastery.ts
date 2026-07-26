import { COURSES, LEVELS, type Course } from './courses';
import type { CourseProgress } from './progress';

export type MasterySummary = { mastered: number; total: number; ratio: number };

const summary = (mastered: number, total: number): MasterySummary => ({
  mastered,
  total,
  ratio: total === 0 ? 0 : mastered / total,
});

export function courseMastery(course: Course, progress: CourseProgress): MasterySummary {
  const banked = new Set(progress.completedVariationIds);
  let mastered = 0;
  let total = 0;

  for (const level of LEVELS) {
    for (const variation of course.lessons[level].variations) {
      total += 1;
      if (!banked.has(variation.id)) continue;
      if (variation.positions.some((position) => progress.positions[position.id]?.due)) continue;
      mastered += 1;
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
