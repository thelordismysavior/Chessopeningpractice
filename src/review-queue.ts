import { COURSES, LEVELS, type Course, type LevelKey } from './courses';
import type { CourseProgress } from './progress';
import { duePositionIds, REVIEW_CLEAR_STREAK } from './review-schedule';

export type ReviewGroup = { courseId: Course['id']; level: LevelKey; positionIds: string[] };

export type ReviewQueueSummary = { groups: ReviewGroup[]; total: number };

/** An in-progress run through several groups. `index` is the group being drilled. */
export type ReviewRun = { groups: ReviewGroup[]; index: number };

export function reviewQueue(progressByCourse: Record<Course['id'], CourseProgress>): ReviewQueueSummary {
  const groups: ReviewGroup[] = [];
  for (const course of COURSES) {
    const progress = progressByCourse[course.id];
    if (!progress) continue;
    for (const level of LEVELS) {
      const candidateIds = course.lessons[level].positions.map((position) => position.id);
      const positionIds = duePositionIds(progress.positions, candidateIds);
      if (positionIds.length) groups.push({ courseId: course.id, level, positionIds });
    }
  }
  return { groups, total: groups.reduce((sum, group) => sum + group.positionIds.length, 0) };
}

export function reviewRunGroups(
  groups: ReviewGroup[],
  progressByCourse: Record<Course['id'], CourseProgress>,
): ReviewGroup[] {
  return groups.map((group) => ({
    ...group,
    positionIds: group.positionIds.flatMap((id) => (
      Array(Math.max(1, REVIEW_CLEAR_STREAK - (progressByCourse[group.courseId].positions[id]?.reviewStreak ?? 0))).fill(id)
    )),
  }));
}
