import { describe, expect, test } from 'vitest';
import { applySessionProgress } from '../src/progress-state';
import type { CourseProgress } from '../src/progress';

const snapshot = (lessonComplete: boolean) => ({ status: lessonComplete ? 'complete' as const : 'needs-clean-run' as const, positionIndex: 0, position: null, attempts: 8, missedPositionIds: [], completedPositionIds: ['beginner-1'], cleanRun: lessonComplete, lessonComplete });
const emptyProgress = (): CourseProgress => ({ completedLevels: [], unlockedLevel: 0, attempts: 0, missedPositionIds: [], completedPositionIds: [], reviewHistory: [] });

describe('progress state', () => {
  test('unlocks levels sequentially and records review history', () => {
    const beginner = applySessionProgress(emptyProgress(), 'beginner', snapshot(true), 8, ['beginner-1']);
    expect(beginner.unlockedLevel).toBe(1);
    expect(beginner.completedLevels).toEqual(['beginner']);
    expect(beginner.reviewHistory).toEqual(['beginner-1']);

    const intermediate = applySessionProgress(beginner, 'intermediate', snapshot(true), 8);
    expect(intermediate.unlockedLevel).toBe(2);
    expect(intermediate.completedLevels).toEqual(['beginner', 'intermediate']);
  });

  test('does not unlock a level from a dirty run', () => {
    const progress = applySessionProgress(emptyProgress(), 'beginner', snapshot(false), 9);
    expect(progress.unlockedLevel).toBe(0);
    expect(progress.completedLevels).toEqual([]);
  });
});
