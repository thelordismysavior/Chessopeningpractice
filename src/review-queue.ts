import { COURSES, LEVELS, type Course, type LevelKey } from './courses';
import type { CourseProgress } from './progress';
import { isTrainableVariation } from './repertoire';
import { duePositionIds, positionIsScheduled, positionIsDue } from './review-schedule';

export type ReviewGroup = { courseId: Course['id']; level: LevelKey; positionIds: string[]; kind?: 'due' | 'upcoming'; nextReviewAt?: number };

export type ReviewQueueSummary = {
  groups: ReviewGroup[];
  dueGroups: ReviewGroup[];
  upcomingGroups: ReviewGroup[];
  total: number;
  upcomingTotal: number;
};

/** An in-progress run through several groups. `index` is the group being drilled. */
export type ReviewRun = { groups: ReviewGroup[]; index: number };

export function reviewQueue(progressByCourse: Record<Course['id'], CourseProgress>, now = Date.now()): ReviewQueueSummary {
  const dueGroups: ReviewGroup[] = [];
  const upcomingGroups: ReviewGroup[] = [];
  for (const course of COURSES) {
    const progress = progressByCourse[course.id];
    if (!progress) continue;
    for (const level of LEVELS) {
      const candidateIds = course.lessons[level].variations
        .filter(isTrainableVariation)
        .flatMap((variation) => variation.positions.map((position) => position.id));
      const dueIds = duePositionIds(progress.positions, candidateIds, now);
      if (dueIds.length) dueGroups.push({ courseId: course.id, level, positionIds: dueIds, kind: 'due' });
      const upcomingIds = candidateIds.filter((id) => {
        const record = progress.positions[id];
        return positionIsScheduled(record) && !positionIsDue(record, now);
      });
      if (upcomingIds.length) {
        const nextReviewAt = Math.min(...upcomingIds.map((id) => progress.positions[id].nextReviewAt!));
        upcomingGroups.push({ courseId: course.id, level, positionIds: upcomingIds, kind: 'upcoming', nextReviewAt });
      }
    }
  }
  const groups = [...dueGroups, ...upcomingGroups];
  return {
    groups,
    dueGroups,
    upcomingGroups,
    total: dueGroups.reduce((sum, group) => sum + group.positionIds.length, 0),
    upcomingTotal: upcomingGroups.reduce((sum, group) => sum + group.positionIds.length, 0),
  };
}
