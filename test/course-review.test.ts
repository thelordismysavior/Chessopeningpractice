import { describe, expect, test } from 'vitest';
import { COURSES, type Course } from '../src/courses';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { emptyRecord } from '../src/review-schedule';
import { courseReview } from '../src/review-queue';

const now = Date.UTC(2026, 0, 1);
const jobava = COURSES[0];
const caroKann = COURSES[3];

function allEmpty(): Record<Course['id'], CourseProgress> {
  return {
    'jobava-london': emptyProgress(),
    'london-system': emptyProgress(),
    'classical-sicilian': emptyProgress(),
    'classical-caro-kann': emptyProgress(),
  };
}

function bankDue(progress: CourseProgress, line: typeof jobava.lessons.beginner.variations[number], dueAt: number, count = 1): CourseProgress {
  return {
    ...progress,
    completedVariationIds: [...progress.completedVariationIds, line.id],
    positions: {
      ...progress.positions,
      ...Object.fromEntries(line.positions.slice(0, count).map((position) => [position.id, { ...emptyRecord(), nextReviewAt: dueAt }])),
    },
  };
}

describe('courseReview', () => {
  test('selects only the active Course’s due Banked Line positions', () => {
    const progress = allEmpty();
    const jobavaLine = jobava.lessons.beginner.variations[0];
    const foreignLine = caroKann.lessons.beginner.variations[0];
    progress[jobava.id] = bankDue(progress[jobava.id], jobavaLine, now - 1, 2);
    progress[jobava.id] = {
      ...progress[jobava.id],
      positions: { ...progress[jobava.id].positions, [jobavaLine.positions[2].id]: { ...emptyRecord(), nextReviewAt: now + 1 } },
    };
    progress[caroKann.id] = bankDue(progress[caroKann.id], foreignLine, now - 2);

    expect(courseReview(jobava, progress[jobava.id], now).groups).toEqual([
      { courseId: jobava.id, level: 'beginner', variationId: jobavaLine.id, positionIds: jobavaLine.positions.slice(0, 2).map((position) => position.id) },
    ]);
  });

  test('orders Banked Lines by their oldest due position and keeps each line contiguous', () => {
    const progress = allEmpty();
    const laterLine = jobava.lessons.beginner.variations[0];
    const earlierLine = jobava.lessons.advanced.variations[0];
    progress[jobava.id] = bankDue(progress[jobava.id], laterLine, now - 10, 2);
    progress[jobava.id] = bankDue(progress[jobava.id], earlierLine, now - 20, 2);

    const run = courseReview(jobava, progress[jobava.id], now);

    expect(run.groups.map((group) => group.variationId)).toEqual([earlierLine.id, laterLine.id]);
    expect(run.groups.flatMap((group) => group.positionIds)).toEqual([
      ...earlierLine.positions.slice(0, 2).map((position) => position.id),
      ...laterLine.positions.slice(0, 2).map((position) => position.id),
    ]);
  });
});
