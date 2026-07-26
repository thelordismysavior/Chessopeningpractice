import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { LevelKey } from './courses';

export type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  attempts: number;
  missedPositionIds: string[];
  completedPositionIds: string[];
  completedVariationIds: string[];
  reviewHistory: string[];
};

export const emptyProgress = (): CourseProgress => ({ completedLevels: [], unlockedLevel: 0, attempts: 0, missedPositionIds: [], completedPositionIds: [], completedVariationIds: [], reviewHistory: [] });

export async function loadProgress(courseId: string): Promise<CourseProgress> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before loading progress.');
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'courses', courseId));
  return snapshot.exists() ? { ...emptyProgress(), ...snapshot.data() } as CourseProgress : emptyProgress();
}

export async function saveProgress(courseId: string, progress: CourseProgress, attemptsDelta = 0): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving progress.');
  const progressRef = doc(db, 'users', user.uid, 'courses', courseId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const current = snapshot.exists() ? { ...emptyProgress(), ...snapshot.data() } as CourseProgress : emptyProgress();
    transaction.set(progressRef, {
      completedLevels: [...new Set([...current.completedLevels, ...progress.completedLevels])],
      unlockedLevel: Math.max(current.unlockedLevel, progress.unlockedLevel),
      attempts: current.attempts + attemptsDelta,
      missedPositionIds: [...new Set([...current.missedPositionIds, ...progress.missedPositionIds])],
      completedPositionIds: [...new Set([...current.completedPositionIds, ...progress.completedPositionIds])],
      completedVariationIds: [...new Set([...current.completedVariationIds, ...progress.completedVariationIds])],
      reviewHistory: [...new Set([...current.reviewHistory, ...progress.reviewHistory])],
    });
  });
}
