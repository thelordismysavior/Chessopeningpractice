import { describe, expect, test } from 'vitest';
import { emptyRecord } from '../src/review-schedule';
import {
  diffProgress,
  emptyProgress,
  mergeProgress,
  migrateProgress,
  type CourseProgress,
} from '../src/progress';

describe('migration from the legacy schema', () => {
  test('turns legacy id arrays into position records', () => {
    const migrated = migrateProgress({
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      attempts: 40,
      completedPositionIds: ['beginner-main-1', 'beginner-main-2'],
      missedPositionIds: ['beginner-main-2'],
      completedVariationIds: ['beginner-main'],
      reviewHistory: ['beginner-main-1'],
    });

    expect(migrated.completedLevels).toEqual(['beginner']);
    expect(migrated.unlockedLevel).toBe(1);
    expect(migrated.completedVariationIds).toEqual(['beginner-main']);
    expect(migrated.positions['beginner-main-1']).toMatchObject({ corrects: 1, due: false });
    expect(migrated.positions['beginner-main-2']).toMatchObject({ misses: 1, due: true, reviewStreak: 0 });
    expect(migrated).not.toHaveProperty('attempts');
    expect(migrated).not.toHaveProperty('reviewHistory');
  });

  test('passes an already-migrated document through unchanged', () => {
    const current: CourseProgress = {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: [],
      positions: { 'beginner-main-1': { ...emptyRecord(), attempts: 5, corrects: 2 } },
      practiceMs: 1200,
    };
    expect(migrateProgress(current)).toEqual(current);
  });

  test('returns empty progress for a missing document', () => {
    expect(migrateProgress(undefined)).toEqual(emptyProgress());
  });
});

describe('delta computation', () => {
  const saved: CourseProgress = {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [],
    positions: { p1: { ...emptyRecord(), attempts: 2, corrects: 1 } },
    practiceMs: 1000,
  };
  const current: CourseProgress = {
    completedLevels: ['beginner'],
    unlockedLevel: 1,
    completedVariationIds: ['beginner-main'],
    positions: {
      p1: { ...emptyRecord(), attempts: 5, corrects: 1, misses: 1, due: true },
      p2: { ...emptyRecord(), attempts: 1, corrects: 1 },
    },
    practiceMs: 4000,
  };

  test('reports counters as differences and review state as absolutes', () => {
    const delta = diffProgress(saved, current);
    expect(delta.practiceMs).toBe(3000);
    expect(delta.positions.p1).toEqual({ attempts: 3, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true });
    expect(delta.positions.p2).toEqual({ attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('omits positions that did not change', () => {
    expect(diffProgress(current, current).positions).toEqual({});
  });

  test('applying the same delta twice from an unchanged store yields the same result', () => {
    const stored = saved;
    const delta = diffProgress(saved, current);
    const first = mergeProgress(stored, delta);
    const retried = mergeProgress(stored, diffProgress(saved, current));
    expect(retried).toEqual(first);
    expect(first.positions.p1.attempts).toBe(5);
  });
});

describe('merge', () => {
  test('accumulates counters, unions banked lines, and overwrites review state', () => {
    const stored: CourseProgress = {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: ['beginner-main'],
      positions: { p1: { ...emptyRecord(), attempts: 2, misses: 1, reviewStreak: 1, due: true } },
      practiceMs: 500,
    };
    const merged = mergeProgress(stored, {
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      completedVariationIds: ['beginner-main', 'beginner-alternative'],
      practiceMs: 250,
      positions: { p1: { attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false } },
    });

    expect(merged.completedLevels).toEqual(['beginner']);
    expect(merged.unlockedLevel).toBe(1);
    expect(merged.completedVariationIds).toEqual(['beginner-main', 'beginner-alternative']);
    expect(merged.practiceMs).toBe(750);
    expect(merged.positions.p1).toEqual({ attempts: 3, corrects: 1, misses: 1, hints: 0, reviewStreak: 0, due: false });
  });

  test('never lowers the unlocked level', () => {
    const stored = { ...emptyProgress(), unlockedLevel: 2 };
    const merged = mergeProgress(stored, {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: [],
      practiceMs: 0,
      positions: {},
    });
    expect(merged.unlockedLevel).toBe(2);
  });
});
