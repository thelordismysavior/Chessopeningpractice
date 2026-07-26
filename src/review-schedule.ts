export type PositionRecord = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
};

/** One finished position within a single pass. `attempts` counts submitted moves. */
export type PositionOutcome = {
  attempts: number;
  solvedFirstTry: boolean;
  hinted: boolean;
};

export type OutcomeContext = 'teach' | 'recall' | 'review';

export const REVIEW_CLEAR_STREAK = 2;

export const emptyRecord = (): PositionRecord => ({
  attempts: 0,
  corrects: 0,
  misses: 0,
  hints: 0,
  reviewStreak: 0,
  due: false,
});

export function applyOutcome(record: PositionRecord, outcome: PositionOutcome, context: OutcomeContext): PositionRecord {
  const next: PositionRecord = { ...record, attempts: record.attempts + outcome.attempts };
  if (context === 'teach') return next;

  const recalled = outcome.solvedFirstTry && !outcome.hinted;
  if (recalled) next.corrects += 1;
  else next.misses += 1;
  if (outcome.hinted) next.hints += 1;

  if (context === 'recall') {
    if (!recalled) {
      next.due = true;
      next.reviewStreak = 0;
    }
    return next;
  }

  if (!recalled) {
    next.reviewStreak = 0;
    return next;
  }
  const streak = next.reviewStreak + 1;
  if (streak >= REVIEW_CLEAR_STREAK) {
    next.reviewStreak = 0;
    next.due = false;
  } else {
    next.reviewStreak = streak;
  }
  return next;
}

export function duePositionIds(positions: Record<string, PositionRecord>, candidateIds: string[]): string[] {
  return candidateIds.filter((id) => positions[id]?.due);
}
