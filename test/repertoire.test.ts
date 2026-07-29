import { describe, expect, test } from 'vitest';
import { COURSES, LEVELS, type Course } from '../src/courses';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { lineState } from '../src/mastery';
import { recommendedLines, repertoireLines, sortRepertoireLines } from '../src/repertoire';
import { reviewQueue } from '../src/review-queue';

function emptyByCourse(): Record<Course['id'], CourseProgress> {
  return Object.fromEntries(COURSES.map((course) => [course.id, emptyProgress()])) as Record<Course['id'], CourseProgress>;
}

describe('repertoire discovery', () => {
  test('has exactly the two reference lines and twelve lesson ideas', () => {
    const references = COURSES.flatMap((course) => LEVELS.flatMap((level) => course.lessons[level].variations.filter((variation) => variation.kind === 'reference')));
    expect(references.map((variation) => variation.title)).toEqual(['Meet 3...c5', 'Meet 3.Bb5']);
    expect(COURSES.flatMap((course) => LEVELS.map((level) => course.lessons[level].lessonIdea))).toHaveLength(12);
    expect(COURSES.flatMap((course) => LEVELS.map((level) => course.lessons[level].lessonIdea)).every((idea) => idea.anchorFen && idea.plan && idea.opponentTrigger && idea.resultingPlan)).toBe(true);
  });

  test('reference lines are not mastery or review debt', () => {
    const byCourse = emptyByCourse();
    const referenceCourse = COURSES.find((course) => course.id === 'london-system')!;
    const reference = referenceCourse.lessons.beginner.variations.find((variation) => variation.kind === 'reference')!;
    byCourse[referenceCourse.id].completedVariationIds = [reference.id];
    byCourse[referenceCourse.id].positions[reference.positions[0].id] = { attempts: 4, corrects: 4, misses: 0, hints: 0, reviewStreak: 4, due: true };

    expect(lineState(reference, byCourse[referenceCourse.id])).toBe('reference');
    expect(reviewQueue(byCourse).total).toBe(0);
    expect(repertoireLines(byCourse).find((line) => line.variation.id === reference.id)?.duePositionIds).toEqual([]);
  });

  test('recommendation order puts due work before untouched role and level order', () => {
    const byCourse = emptyByCourse();
    const course = COURSES[0];
    const due = course.lessons.advanced.variations.find((variation) => variation.kind === 'punish')!;
    byCourse[course.id].positions[due.positions[0].id] = { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true };
    const lines = recommendedLines(byCourse);
    expect(lines[0].variation.id).toBe(due.id);
    expect(lines.findIndex((line) => line.level === 'beginner')).toBeLessThan(lines.findIndex((line) => line.level === 'advanced' && !line.duePositionIds.length));
    expect(sortRepertoireLines(lines, 'name').map((line) => `${line.course.name} ${line.variation.title}`)).toEqual([...lines].sort((a, b) => `${a.course.name} ${a.variation.title}`.localeCompare(`${b.course.name} ${b.variation.title}`)).map((line) => `${line.course.name} ${line.variation.title}`));
  });
});
