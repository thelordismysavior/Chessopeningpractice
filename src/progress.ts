import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { LevelKey } from './courses';

export type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  attempts: number;
  missedPositionIds: string[];
  completedPositionIds: string[];
  reviewHistory: string[];
};

export const emptyProgress = (): CourseProgress => ({ completedLevels: [], unlockedLevel: 0, attempts: 0, missedPositionIds: [], completedPositionIds: [], reviewHistory: [] });

export async function loadProgress(courseId: string): Promise<CourseProgress> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before loading progress.');
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'courses', courseId));
  return snapshot.exists() ? { ...emptyProgress(), ...snapshot.data() } as CourseProgress : emptyProgress();
}

export async function saveProgress(courseId: string, progress: CourseProgress): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving progress.');
  await setDoc(doc(db, 'users', user.uid, 'courses', courseId), progress);
}
