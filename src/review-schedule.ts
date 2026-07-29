export type PositionRecord = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
  intervalStage?: number;
  nextReviewAt?: number | null;
};

/** One finished position within a single pass. `attempts` counts submitted moves. */
export type PositionOutcome = {
  attempts: number;
  solvedFirstTry: boolean;
  hinted: boolean;
};

export type OutcomeContext = 'teach' | 'recall' | 'review';

export const REVIEW_INTERVALS = [
  4 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
  90 * 24 * 60 * 60 * 1000,
  180 * 24 * 60 * 60 * 1000,
] as const;

export const emptyRecord = (): PositionRecord => ({
  attempts: 0,
  corrects: 0,
  misses: 0,
  hints: 0,
  reviewStreak: 0,
  due: false,
});

export function withSchedule(record: PositionRecord, intervalStage: number, nextReviewAt: number | null): PositionRecord {
  const next = { ...record };
  Object.defineProperties(next, {
    intervalStage: { configurable: true, enumerable: false, value: intervalStage, writable: true },
    nextReviewAt: { configurable: true, enumerable: false, value: nextReviewAt, writable: true },
  });
  return next;
}

export function reviewInterval(stage: number): number {
  return REVIEW_INTERVALS[Math.min(REVIEW_INTERVALS.length - 1, Math.max(0, Math.trunc(stage)))];
}

export function reviewAt(stage: number, now = Date.now()): number {
  return now + reviewInterval(stage);
}

export function positionIsDue(record: PositionRecord | undefined, now = Date.now()): boolean {
  if (!record) return false;
  return typeof record.nextReviewAt === 'number' ? record.nextReviewAt <= now : record.due;
}

export function positionIsScheduled(record: PositionRecord | undefined): boolean {
  return typeof record?.nextReviewAt === 'number';
}

export function formatReviewTime(timestamp: number, now = Date.now()): string {
  const remaining = timestamp - now;
  if (remaining <= 0) return 'Due now';
  if (remaining < 60 * 60 * 1000) return `in ${Math.ceil(remaining / 60000)} min`;
  if (remaining < 24 * 60 * 60 * 1000) return `in ${Math.ceil(remaining / (60 * 60 * 1000))} hours`;
  if (remaining < 7 * 24 * 60 * 60 * 1000) return `in ${Math.ceil(remaining / (24 * 60 * 60 * 1000))} days`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(timestamp);
}

export function applyOutcome(record: PositionRecord, outcome: PositionOutcome, context: OutcomeContext, now = Date.now()): PositionRecord {
  const next: PositionRecord = { ...record, attempts: record.attempts + outcome.attempts };
  if (context === 'teach') {
    return 'intervalStage' in record || 'nextReviewAt' in record
      ? withSchedule(next, record.intervalStage ?? 0, record.nextReviewAt ?? null)
      : next;
  }

  const recalled = outcome.solvedFirstTry && !outcome.hinted;
  if (recalled) next.corrects += 1;
  else next.misses += 1;
  if (outcome.hinted) next.hints += 1;

  if (context === 'recall') {
    if (!recalled) return withSchedule({ ...next, due: true, reviewStreak: 0 }, 0, reviewAt(0, now));
    const stage = Math.min(REVIEW_INTERVALS.length - 1, (record.intervalStage ?? 0) + 1);
    return withSchedule({ ...next, due: false }, stage, reviewAt(stage, now));
  }

  if (!recalled) return withSchedule({ ...next, due: true, reviewStreak: 0 }, 0, reviewAt(0, now));

  const stage = Math.min(REVIEW_INTERVALS.length - 1, (record.intervalStage ?? 0) + 1);
  return withSchedule({ ...next, reviewStreak: 0, due: false }, stage, reviewAt(stage, now));
}

export function duePositionIds(positions: Record<string, PositionRecord>, candidateIds: string[], now = Date.now()): string[] {
  return candidateIds.filter((id) => positionIsDue(positions[id], now));
}
