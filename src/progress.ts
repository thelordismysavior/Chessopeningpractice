import { doc, getDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { LevelKey } from './courses';
import { emptyRecord, type PositionRecord } from './review-schedule';

export type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  positions: Record<string, PositionRecord>;
  practiceMs: number;
};

/** Counters are differences; `reviewStreak` and `due` are absolute latest values. */
export type PositionDelta = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
};

export type ProgressDelta = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  practiceMs: number;
  positions: Record<string, PositionDelta>;
};

type StoredProgress = Partial<CourseProgress> & {
  completedPositionIds?: string[];
  missedPositionIds?: string[];
};

export const emptyProgress = (): CourseProgress => ({
  completedLevels: [],
  unlockedLevel: 0,
  completedVariationIds: [],
  positions: {},
  practiceMs: 0,
});

export function migrateProgress(stored: StoredProgress | undefined): CourseProgress {
  if (!stored) return emptyProgress();
  const positions: Record<string, PositionRecord> = { ...(stored.positions ?? {}) };

  for (const id of stored.completedPositionIds ?? []) {
    positions[id] = { ...emptyRecord(), ...positions[id], attempts: 1, corrects: 1 };
  }
  for (const id of stored.missedPositionIds ?? []) {
    const before = positions[id] ?? emptyRecord();
    positions[id] = { ...before, attempts: Math.max(before.attempts, 1), corrects: 0, misses: 1, reviewStreak: 0, due: true };
  }

  return {
    completedLevels: stored.completedLevels ?? [],
    unlockedLevel: stored.unlockedLevel ?? 0,
    completedVariationIds: stored.completedVariationIds ?? [],
    positions,
    practiceMs: stored.practiceMs ?? 0,
  };
}

export function diffProgress(saved: CourseProgress, current: CourseProgress): ProgressDelta {
  const positions: Record<string, PositionDelta> = {};
  for (const [id, record] of Object.entries(current.positions)) {
    const before = saved.positions[id] ?? emptyRecord();
    const delta: PositionDelta = {
      attempts: record.attempts - before.attempts,
      corrects: record.corrects - before.corrects,
      misses: record.misses - before.misses,
      hints: record.hints - before.hints,
      reviewStreak: record.reviewStreak,
      due: record.due,
    };
    const changed = delta.attempts !== 0 || delta.corrects !== 0 || delta.misses !== 0 || delta.hints !== 0
      || before.reviewStreak !== record.reviewStreak || before.due !== record.due;
    if (changed) positions[id] = delta;
  }
  return {
    completedLevels: current.completedLevels,
    unlockedLevel: current.unlockedLevel,
    completedVariationIds: current.completedVariationIds,
    practiceMs: current.practiceMs - saved.practiceMs,
    positions,
  };
}

export function mergeProgress(stored: CourseProgress, delta: ProgressDelta): CourseProgress {
  const positions = { ...stored.positions };
  for (const [id, entry] of Object.entries(delta.positions)) {
    const before = positions[id] ?? emptyRecord();
    positions[id] = {
      attempts: before.attempts + entry.attempts,
      corrects: before.corrects + entry.corrects,
      misses: before.misses + entry.misses,
      hints: before.hints + entry.hints,
      reviewStreak: entry.reviewStreak,
      due: entry.due,
    };
  }
  return {
    completedLevels: [...new Set([...stored.completedLevels, ...delta.completedLevels])],
    unlockedLevel: Math.max(stored.unlockedLevel, delta.unlockedLevel),
    completedVariationIds: [...new Set([...stored.completedVariationIds, ...delta.completedVariationIds])],
    positions,
    practiceMs: stored.practiceMs + delta.practiceMs,
  };
}

export async function loadProgress(courseId: string): Promise<CourseProgress> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before loading progress.');
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'courses', courseId));
  return migrateProgress(snapshot.exists() ? (snapshot.data() as StoredProgress) : undefined);
}

export async function saveProgress(courseId: string, delta: ProgressDelta): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving progress.');
  const progressRef = doc(db, 'users', user.uid, 'courses', courseId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const stored = migrateProgress(snapshot.exists() ? (snapshot.data() as StoredProgress) : undefined);
    transaction.set(progressRef, mergeProgress(stored, delta));
  });
}

export async function resetAllProgress(courseIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before resetting progress.');
  const batch = writeBatch(db);
  courseIds.forEach((courseId) => batch.delete(doc(db, 'users', user.uid, 'courses', courseId)));
  await batch.commit();
}
