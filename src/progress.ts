import { doc, getDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { LevelKey } from './courses';
import { emptyRecord, reviewAt, withSchedule, type PositionRecord } from './review-schedule';

export type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  positions: Record<string, PositionRecord>;
  practiceMs: number;
};

/** Counters are differences; review state is the absolute latest schedule state. */
export type PositionDelta = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
  intervalStage?: number;
  nextReviewAt?: number | null;
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
  attempts?: number;
  reviewHistory?: string[];
};

export const emptyProgress = (): CourseProgress => ({
  completedLevels: [],
  unlockedLevel: 0,
  completedVariationIds: [],
  positions: {},
  practiceMs: 0,
});

export function migrateProgress(stored: StoredProgress | undefined, now = Date.now()): CourseProgress {
  if (!stored) return emptyProgress();
  const positions: Record<string, PositionRecord> = {};
  for (const [id, value] of Object.entries(stored.positions ?? {})) {
    const record = { ...value } as PositionRecord;
    const learned = record.attempts > 0 || record.corrects > 0 || record.misses > 0 || record.due;
    positions[id] = 'intervalStage' in value || 'nextReviewAt' in value
      ? withSchedule(record, value.intervalStage ?? 0, value.nextReviewAt ?? null)
      : !learned
        ? record
      : withSchedule(record, 0, record.due ? now : reviewAt(0, now));
  }

  for (const id of stored.completedPositionIds ?? []) {
    const before = positions[id] ?? emptyRecord();
    positions[id] = withSchedule({ ...before, attempts: Math.max(before.attempts, 1), corrects: Math.max(before.corrects, 1), due: false }, before.intervalStage ?? 0, before.nextReviewAt ?? reviewAt(0, now));
  }
  for (const id of stored.missedPositionIds ?? []) {
    const before = positions[id] ?? emptyRecord();
    positions[id] = withSchedule({ ...before, attempts: Math.max(before.attempts, 1), misses: Math.max(before.misses, 1), reviewStreak: 0, due: true }, 0, now);
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
    if ('intervalStage' in record || 'nextReviewAt' in record) {
      delta.intervalStage = record.intervalStage ?? 0;
      delta.nextReviewAt = record.nextReviewAt ?? null;
    }
    const changed = delta.attempts !== 0 || delta.corrects !== 0 || delta.misses !== 0 || delta.hints !== 0
      || before.reviewStreak !== record.reviewStreak || before.due !== record.due
      || before.intervalStage !== record.intervalStage || before.nextReviewAt !== record.nextReviewAt;
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
  const positions: Record<string, PositionRecord> = {};
  for (const [id, record] of Object.entries(stored.positions)) {
    positions[id] = 'intervalStage' in record || 'nextReviewAt' in record
      ? { ...record, intervalStage: record.intervalStage ?? 0, nextReviewAt: record.nextReviewAt ?? null }
      : record;
  }
  for (const [id, entry] of Object.entries(delta.positions)) {
    const before = positions[id] ?? emptyRecord();
    const merged: PositionRecord = {
      attempts: before.attempts + entry.attempts,
      corrects: before.corrects + entry.corrects,
      misses: before.misses + entry.misses,
      hints: before.hints + entry.hints,
      reviewStreak: entry.reviewStreak,
      due: entry.due,
    };
    if ('intervalStage' in entry || 'nextReviewAt' in entry || 'intervalStage' in before || 'nextReviewAt' in before) {
      merged.intervalStage = entry.intervalStage ?? before.intervalStage ?? 0;
      merged.nextReviewAt = 'nextReviewAt' in entry ? entry.nextReviewAt ?? null : before.nextReviewAt ?? null;
    }
    positions[id] = merged;
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
