import { describe, expect, test } from 'vitest';
import {
  applyOutcome,
  duePositionIds,
  emptyRecord,
  type PositionOutcome,
  type PositionRecord,
} from '../src/review-schedule';

const clean: PositionOutcome = { attempts: 1, solvedFirstTry: true, hinted: false };
const fumbled: PositionOutcome = { attempts: 3, solvedFirstTry: false, hinted: false };
const hinted: PositionOutcome = { attempts: 1, solvedFirstTry: true, hinted: true };

describe('teach pass', () => {
  test('counts effort but never scores or queues', () => {
    const record = applyOutcome(emptyRecord(), fumbled, 'teach');
    expect(record).toEqual({ attempts: 3, corrects: 0, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('counts a teach-pass hint as effort only', () => {
    const record = applyOutcome(emptyRecord(), hinted, 'teach');
    expect(record.hints).toBe(0);
    expect(record.due).toBe(false);
  });
});

describe('recall pass', () => {
  test('a clean position scores a correct and stays out of the queue', () => {
    const record = applyOutcome(emptyRecord(), clean, 'recall');
    expect(record).toEqual({ attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('a fumbled position scores a miss and queues for review', () => {
    const record = applyOutcome(emptyRecord(), fumbled, 'recall');
    expect(record).toMatchObject({ attempts: 3, corrects: 0, misses: 1, due: true, reviewStreak: 0 });
  });

  test('a hinted position counts as a miss and queues, and records the hint', () => {
    const record = applyOutcome(emptyRecord(), hinted, 'recall');
    expect(record).toMatchObject({ corrects: 0, misses: 1, hints: 1, due: true });
  });

  test('zeroes an existing review streak when the position is missed again', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    expect(applyOutcome(start, fumbled, 'recall').reviewStreak).toBe(0);
  });
});

describe('review', () => {
  test('needs two clean answers to clear, not one', () => {
    const start: PositionRecord = { ...emptyRecord(), due: true };
    const once = applyOutcome(start, clean, 'review');
    expect(once).toMatchObject({ reviewStreak: 1, due: true });

    const twice = applyOutcome(once, clean, 'review');
    expect(twice).toMatchObject({ reviewStreak: 0, due: false, corrects: 2 });
  });

  test('a miss restarts the count and keeps the position due', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    const record = applyOutcome(start, fumbled, 'review');
    expect(record).toMatchObject({ reviewStreak: 0, due: true, misses: 1 });
  });

  test('a hint restarts the count and keeps the position due', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    const record = applyOutcome(start, hinted, 'review');
    expect(record).toMatchObject({ reviewStreak: 0, due: true, hints: 1 });
  });
});

describe('due query', () => {
  test('returns only due candidates, in candidate order', () => {
    const positions = {
      a: { ...emptyRecord(), due: true },
      b: emptyRecord(),
      c: { ...emptyRecord(), due: true },
    };
    expect(duePositionIds(positions, ['c', 'b', 'a', 'missing'])).toEqual(['c', 'a']);
  });
});
