import type { EvalScore } from './engine/eval-scale';
import { coursesById, LEVELS, type Course, type LevelKey } from './courses';
import type { CourseProgress } from './progress';
import { courseRepertoireLines, recommendedLines, sortRepertoireLines } from './repertoire';
import { courseReview, reviewQueue } from './review-queue';

export const RESULT_STORAGE_KEY = 'chess-practice.latest-result';

export type ResultBranchSummary = {
  variationId: string;
  variationTitle: string;
  positionId: string;
  expectedSan: string;
  opponentTrigger: string;
  resultingPlan: string;
  explanation: string;
};

export type ResultSummary = {
  courseId: Course['id'];
  level: LevelKey;
  lineId: string;
  lineTitle: string;
  lineState: 'banked' | 'reviewed';
  settledScore: EvalScore | null;
  mistakes: number;
  hints: number;
  elapsedMs: number;
  missed: { positionId: string; lineTitle: string; expectedSan: string }[];
  authoredCorrection: string;
  branch: ResultBranchSummary | null;
};

export type ResultAction =
  | { kind: 'continue'; courseId: Course['id']; level: LevelKey; variationId: string }
  | { kind: 'review'; courseId?: Course['id'] }
  | { kind: 'course'; courseId: Course['id'] }
  | { kind: 'home' };

type ResultStorage = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): ResultStorage | null {
  try {
    return typeof globalThis.sessionStorage === 'undefined' ? null : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

export function saveResultSummary(summary: ResultSummary, target: ResultStorage | null = storage()): void {
  try {
    target?.setItem(RESULT_STORAGE_KEY, JSON.stringify(summary));
  } catch {
    // Result remains navigable even when session storage is unavailable.
  }
}

export function loadResultSummary(target: ResultStorage | null = storage()): ResultSummary | null {
  try {
    const raw = target?.getItem(RESULT_STORAGE_KEY);
    if (!raw) return null;
    const summary = JSON.parse(raw) as Partial<ResultSummary>;
    return typeof summary.courseId === 'string'
      && summary.courseId in coursesById
      && typeof summary.level === 'string'
      && LEVELS.includes(summary.level as LevelKey)
      && typeof summary.lineId === 'string'
      && typeof summary.lineTitle === 'string'
      ? summary as ResultSummary
      : null;
  } catch {
    return null;
  }
}

export function nextResultAction(progressByCourse: Record<Course['id'], CourseProgress>, course?: Course, now = Date.now()): ResultAction {
  if (course) {
    const next = sortRepertoireLines(courseRepertoireLines(course, progressByCourse[course.id], now)).find((line) => line.state === 'untouched');
    if (next) return { kind: 'continue', courseId: course.id, level: next.level, variationId: next.variation.id };
    if (courseReview(course, progressByCourse[course.id], now).total) return { kind: 'review', courseId: course.id };
    return { kind: 'course', courseId: course.id };
  }
  const next = recommendedLines(progressByCourse, now).find((line) => line.state === 'untouched');
  if (next) return { kind: 'continue', courseId: next.course.id, level: next.level, variationId: next.variation.id };
  if (reviewQueue(progressByCourse, now).total) return { kind: 'review' };
  return { kind: 'home' };
}
