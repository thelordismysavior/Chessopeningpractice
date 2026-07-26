import type { LevelKey } from './courses';
import type { SessionSnapshot } from './practice-session';
import type { CourseProgress } from './progress';

export function applySessionProgress(progress: CourseProgress, level: LevelKey, snapshot: SessionSnapshot, attemptsDelta: number, reviewPositionIds: string[] = []): CourseProgress {
  const next = {
    ...progress,
    attempts: progress.attempts + attemptsDelta,
    missedPositionIds: [...new Set([...progress.missedPositionIds, ...snapshot.missedPositionIds])],
    completedPositionIds: [...new Set([...progress.completedPositionIds, ...snapshot.completedPositionIds])],
    reviewHistory: [...new Set([...progress.reviewHistory, ...reviewPositionIds])],
  };
  if (snapshot.lessonComplete && !next.completedLevels.includes(level)) {
    next.completedLevels = [...next.completedLevels, level];
    next.unlockedLevel = Math.max(next.unlockedLevel, Math.min(['beginner', 'intermediate', 'advanced'].indexOf(level) + 1, 2));
  }
  return next;
}
