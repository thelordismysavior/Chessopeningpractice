import { describe, expect, test } from 'vitest';
import { applySessionProgress } from '../src/progress-state';
import type { CourseProgress } from '../src/progress';

const snapshot = (lessonComplete: boolean, bankedVariationIds: string[] = []) => ({
  status: lessonComplete ? 'complete' as const : 'needs-clean-run' as const,
  positionIndex: 0,
  position: null,
  attempts: 8,
  missedPositionIds: [],
  completedPositionIds: ['beginner-main-1'],
  cleanRun: lessonComplete,
  lessonComplete,
  variation: null,
  variationIndex: 0,
  bankedVariationIds,
});
const emptyProgress = (): CourseProgress => ({ completedLevels: [], unlockedLevel: 0, attempts: 0, missedPositionIds: [], completedPositionIds: [], completedVariationIds: [], reviewHistory: [] });

describe('progress state', () => {
  test('unlocks levels sequentially and records review history', () => {
    const beginner = applySessionProgress(emptyProgress(), 'beginner', snapshot(true, ['beginner-main', 'beginner-alternative', 'beginner-punish']), 8, ['beginner-main-1']);
    expect(beginner.unlockedLevel).toBe(1);
    expect(beginner.completedLevels).toEqual(['beginner']);
    expect(beginner.reviewHistory).toEqual(['beginner-main-1']);

    const intermediate = applySessionProgress(beginner, 'intermediate', snapshot(true, ['intermediate-main', 'intermediate-alternative', 'intermediate-punish']), 8);
    expect(intermediate.unlockedLevel).toBe(2);
    expect(intermediate.completedLevels).toEqual(['beginner', 'intermediate']);
  });

  test('does not unlock a level from a dirty run', () => {
    const progress = applySessionProgress(emptyProgress(), 'beginner', snapshot(false, ['beginner-main']), 9);
    expect(progress.unlockedLevel).toBe(0);
    expect(progress.completedLevels).toEqual([]);
  });

  test('does not complete a level before its prerequisite', () => {
    const intermediate = applySessionProgress(emptyProgress(), 'intermediate', snapshot(true, ['intermediate-main', 'intermediate-alternative', 'intermediate-punish']), 8);
    const advanced = applySessionProgress(emptyProgress(), 'advanced', snapshot(true, ['advanced-main', 'advanced-alternative', 'advanced-punish']), 8);
    expect(intermediate.completedLevels).toEqual([]);
    expect(intermediate.unlockedLevel).toBe(0);
    expect(advanced.completedLevels).toEqual([]);
    expect(advanced.unlockedLevel).toBe(0);
  });

  test('merges completedVariationIds as a set', () => {
    const first = applySessionProgress(emptyProgress(), 'beginner', snapshot(false, ['beginner-main']), 4);
    expect(first.completedVariationIds).toEqual(['beginner-main']);

    const second = applySessionProgress(first, 'beginner', snapshot(false, ['beginner-main', 'beginner-alternative']), 3);
    expect(second.completedVariationIds).toEqual(['beginner-main', 'beginner-alternative']);
  });
});
