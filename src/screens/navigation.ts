import type { Course, LevelKey } from '../courses';
import type { CourseProgress } from '../progress';
import type { ReviewRun } from '../review-queue';

export type PracticeScreen = {
  name: 'practice';
  course: Course;
  level: LevelKey;
  progress: CourseProgress;
  reviewPositionIds?: string[];
  run?: ReviewRun;
  entryHandoff?: { banked: string; next: string };
};

export type BrowseScreen = { name: 'browse'; courseId?: Course['id']; lineId?: string };

export type Screen =
  | { name: 'dashboard' }
  | { name: 'sources' }
  | { name: 'review-queue' }
  | BrowseScreen
  | PracticeScreen;

export type Navigate = (screen: Screen) => Promise<void>;
