import { LEVELS, type LevelKey } from './courses';
import type { SessionSnapshot } from './practice-session';
import type { CourseProgress } from './progress';

export function applySessionProgress(progress: CourseProgress, level: LevelKey, snapshot: SessionSnapshot, attemptsDelta: number, reviewPositionIds: string[] = []): CourseProgress {
  const next = {
    ...progress,
    attempts: progress.attempts + attemptsDelta,
    missedPositionIds: [...new Set([...progress.missedPositionIds, ...snapshot.missedPositionIds])],
    completedPositionIds: [...new Set([...progress.completedPositionIds, ...snapshot.completedPositionIds])],
    completedVariationIds: [...new Set([...progress.completedVariationIds, ...snapshot.bankedVariationIds])],
    reviewHistory: [...new Set([...progress.reviewHistory, ...reviewPositionIds])],
  };
  const levelIndex = LEVELS.indexOf(level);
  const prerequisiteComplete = levelIndex === 0 || next.completedLevels.includes(LEVELS[levelIndex - 1]);
  if (snapshot.lessonComplete && prerequisiteComplete && !next.completedLevels.includes(level)) {
    next.completedLevels = [...next.completedLevels, level];
    next.unlockedLevel = Math.max(next.unlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
  }
  return next;
}
