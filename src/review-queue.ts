import type { Course, LevelKey } from './courses';

export type ReviewGroup = { courseId: Course['id']; level: LevelKey; positionIds: string[] };
export type ReviewRun = { groups: ReviewGroup[]; index: number };
