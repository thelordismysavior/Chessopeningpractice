import { describe, expect, test } from 'vitest';
import { COURSES, LEVELS, type Course } from '../src/courses';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { emptyRecord } from '../src/review-schedule';
import { reviewQueue } from '../src/review-queue';

function allEmpty(): Record<Course['id'], CourseProgress> {
  return Object.fromEntries(COURSES.map((course) => [course.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
}

function markDue(progress: CourseProgress, ids: string[]): CourseProgress {
  const positions = { ...progress.positions };
  for (const id of ids) positions[id] = { ...emptyRecord(), due: true };
  return { ...progress, positions };
}

function idsFor(course: Course, level: typeof LEVELS[number], count: number): string[] {
  return course.lessons[level].positions.slice(0, count).map((position) => position.id);
}

describe('reviewQueue', () => {
  test('returns no groups and a zero total when nothing is due', () => {
    const queue = reviewQueue(allEmpty());
    expect(queue.groups).toEqual([]);
    expect(queue.total).toBe(0);
  });

  test('omits levels and courses with nothing due', () => {
    const byCourse = allEmpty();
    byCourse[COURSES[1].id] = markDue(byCourse[COURSES[1].id], idsFor(COURSES[1], 'intermediate', 2));
    const queue = reviewQueue(byCourse);
    expect(queue.groups).toHaveLength(1);
    expect(queue.groups[0]).toMatchObject({ courseId: COURSES[1].id, level: 'intermediate' });
    expect(queue.groups[0].positionIds).toHaveLength(2);
    expect(queue.total).toBe(2);
  });

  test('orders groups by course order then level order', () => {
    const byCourse = allEmpty();
    byCourse[COURSES[2].id] = markDue(byCourse[COURSES[2].id], idsFor(COURSES[2], 'beginner', 1));
    byCourse[COURSES[0].id] = markDue(byCourse[COURSES[0].id], [
      ...idsFor(COURSES[0], 'advanced', 1),
      ...idsFor(COURSES[0], 'beginner', 3),
    ]);
    const queue = reviewQueue(byCourse);
    expect(queue.groups.map((group) => [group.courseId, group.level])).toEqual([
      [COURSES[0].id, 'beginner'],
      [COURSES[0].id, 'advanced'],
      [COURSES[2].id, 'beginner'],
    ]);
    expect(queue.total).toBe(5);
  });

  test('only counts ids that belong to the level being grouped', () => {
    const byCourse = allEmpty();
    byCourse[COURSES[0].id] = markDue(byCourse[COURSES[0].id], ['not-a-real-position-id']);
    expect(reviewQueue(byCourse).groups).toEqual([]);
  });
});
