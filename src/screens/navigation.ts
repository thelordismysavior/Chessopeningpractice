import type { Course, LevelKey } from '../courses';
import type { CourseProgress } from '../progress';
import type { ReviewRun } from '../review-queue';

export type PracticeScreen = {
  name: 'practice';
  course: Course;
  level: LevelKey;
  progress: CourseProgress;
  variationId?: string;
  reviewPositionIds?: string[];
  run?: ReviewRun;
  entryHandoff?: { banked: string; next: string; verb?: string };
};

export type BrowseScreen = { name: 'browse'; courseId?: Course['id']; lineId?: string; study?: boolean };

export type Screen =
  | { name: 'dashboard' }
  | { name: 'course'; course: Course; progress: CourseProgress }
  | { name: 'lines' }
  | { name: 'settings' }
  | { name: 'account' }
  | { name: 'sources' }
  | { name: 'review-queue' }
  | BrowseScreen
  | PracticeScreen;

export type Navigate = (screen: Screen) => Promise<void>;
