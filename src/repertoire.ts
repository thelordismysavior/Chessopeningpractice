import { COURSES, LEVELS, type Course, type LevelKey, type Variation, type VariationKind } from './courses';
import { lineState, type LineState } from './mastery';
import type { CourseProgress } from './progress';
import { duePositionIds } from './review-schedule';

export type RepertoireLine = {
  course: Course;
  level: LevelKey;
  variation: Variation;
  state: LineState;
  duePositionIds: string[];
};

export const roleNames: Record<VariationKind, string> = {
  core: 'Core',
  alternative: 'Alternative',
  reference: 'Reference',
  punish: 'Punish',
};

export function isReferenceVariation(variation: Variation): boolean {
  return variation.kind === 'reference';
}

export function isTrainableVariation(variation: Variation): boolean {
  return !isReferenceVariation(variation);
}

export function trainableVariations(course: Course, level?: LevelKey): Variation[] {
  const levels = level ? [level] : LEVELS;
  return levels.flatMap((entry) => course.lessons[entry].variations.filter(isTrainableVariation));
}

function linesFor(course: Course, level: LevelKey, progress: CourseProgress, now: number): RepertoireLine[] {
  return course.lessons[level].variations.map((variation) => ({
    course,
    level,
    variation,
    state: lineState(variation, progress, now),
    duePositionIds: isTrainableVariation(variation)
      ? duePositionIds(progress.positions, variation.positions.map((position) => position.id), now)
      : [],
  }));
}

export function repertoireLines(progressByCourse: Record<Course['id'], CourseProgress>, now = Date.now()): RepertoireLine[] {
  return COURSES.flatMap((course) => LEVELS.flatMap((level) => linesFor(course, level, progressByCourse[course.id], now)));
}

export function courseRepertoireLines(course: Course, progress: CourseProgress, now = Date.now()): RepertoireLine[] {
  return LEVELS.flatMap((level) => linesFor(course, level, progress, now));
}

export function lineStatusLabel(line: RepertoireLine): string {
  if (line.duePositionIds.length) return 'Due now';
  if (line.state === 'untouched') return 'Untouched';
  if (line.state === 'reference') return 'Reference';
  if (line.state === 'banked') return 'Banked';
  return 'Mastered';
}

function alphaKey(line: RepertoireLine): string {
  return `${line.course.name} ${line.variation.title}`.toLocaleLowerCase();
}

function roleOrder(kind: VariationKind): number {
  return ({ core: 0, alternative: 1, punish: 2, reference: 3 } satisfies Record<VariationKind, number>)[kind];
}

function statusOrder(line: RepertoireLine): number {
  if (line.duePositionIds.length) return 0;
  if (line.state === 'untouched') return 1;
  if (line.state === 'reference') return 3;
  return 2;
}

export type LineSort = 'recommended' | 'level' | 'category' | 'status' | 'name';

export function sortRepertoireLines(lines: RepertoireLine[], sort: LineSort = 'recommended'): RepertoireLine[] {
  return [...lines].sort((left, right) => {
    if (sort === 'level') {
      const levelDifference = LEVELS.indexOf(left.level) - LEVELS.indexOf(right.level);
      if (levelDifference) return levelDifference;
    }
    if (sort === 'category') {
      const roleDifference = roleOrder(left.variation.kind) - roleOrder(right.variation.kind);
      if (roleDifference) return roleDifference;
    }
    if (sort === 'status') {
      const statusDifference = statusOrder(left) - statusOrder(right);
      if (statusDifference) return statusDifference;
    }
    if (sort === 'recommended') {
      const leftStatus = statusOrder(left);
      const rightStatus = statusOrder(right);
      const statusDifference = leftStatus - rightStatus;
      if (statusDifference) return statusDifference;
      if (leftStatus === 1) {
        const levelDifference = LEVELS.indexOf(left.level) - LEVELS.indexOf(right.level);
        if (levelDifference) return levelDifference;
        const roleDifference = roleOrder(left.variation.kind) - roleOrder(right.variation.kind);
        if (roleDifference) return roleDifference;
      }
    }
    if (sort === 'name' || sort === 'recommended' || sort === 'status' || sort === 'category' || sort === 'level') {
      return alphaKey(left).localeCompare(alphaKey(right));
    }
    return 0;
  });
}

export function recommendedLines(progressByCourse: Record<Course['id'], CourseProgress>, now = Date.now()): RepertoireLine[] {
  return sortRepertoireLines(repertoireLines(progressByCourse, now), 'recommended');
}
