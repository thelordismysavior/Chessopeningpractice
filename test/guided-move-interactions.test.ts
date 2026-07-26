import { describe, expect, test } from 'vitest';
import { resolveBoardDrop } from '../src/board-input';
import { COURSES } from '../src/courses';
import { shouldShowMoveGuide } from '../src/guide-policy';
import {
  effectiveMoveDuration,
  loadMoveDuration,
  normalizeMoveDuration,
  saveMoveDuration,
} from '../src/move-settings';
import { planFenTransition, planMoveTransition } from '../src/transition-plans';

const lesson = COURSES[0].lessons.beginner;

describe('board input outcomes', () => {
  test('cancels an unmoved, origin, or outside drop', () => {
    expect(resolveBoardDrop('e2', 'e2', true)).toBeNull();
    expect(resolveBoardDrop('e2', null, true)).toBeNull();
    expect(resolveBoardDrop('e2', 'e4', false)).toBeNull();
  });

  test('submits only a moved drop while input is unlocked', () => {
    expect(resolveBoardDrop('e2', 'e4', true)).toBe('e2e4');
    expect(resolveBoardDrop('e2', 'e4', true, true)).toBeNull();
  });
});

describe('guided move policy', () => {
  test('shows regular lesson guides and hides completed positions', () => {
    expect(shouldShowMoveGuide(false, 'active')).toBe(true);
    expect(shouldShowMoveGuide(false, 'retrying')).toBe(true);
    expect(shouldShowMoveGuide(false, 'complete')).toBe(false);
  });

  test('reveals a review guide only after a scored mistake', () => {
    expect(shouldShowMoveGuide(true, 'active')).toBe(false);
    expect(shouldShowMoveGuide(true, 'retrying')).toBe(true);
  });
});

describe('move transition plans', () => {
  test('plans castling as king and rook travel', () => {
    const position = COURSES[0].lessons.beginner.positions[6];
    const plan = planMoveTransition(position.fen, position.expectedMove);
    expect(plan?.isCastle).toBe(true);
    expect(plan?.pieces.map(({ from, to }) => [from, to]).sort()).toEqual(['e1-g1', 'h1-f1'].map((move) => move.split('-')));
  });

  test('keeps a captured piece in the plan until landing', () => {
    const position = COURSES.find((course) => course.id === 'classical-sicilian')!.lessons.advanced.positions[8];
    const plan = planMoveTransition(position.fen, position.expectedMove);
    expect(plan?.pieces[0].captured).toBe('wN');
    expect(plan?.pieces[0].captureSquare).toBe('b5');
  });

  test('infers the opponent reply from adjacent position FENs', () => {
    const learner = lesson.positions[0];
    const next = lesson.positions[1];
    const learnerPlan = planMoveTransition(learner.fen, learner.expectedMove)!;
    const reply = planFenTransition(learnerPlan.afterFen, next.fen);
    expect(reply?.pieces[0]).toMatchObject({ from: 'd7', to: 'd5', piece: 'bP' });
  });
});

describe('move duration settings', () => {
  test('normalizes invalid, stepped, and out-of-range values', () => {
    expect(normalizeMoveDuration('not a number')).toBe(200);
    expect(normalizeMoveDuration(126)).toBe(150);
    expect(normalizeMoveDuration(-20)).toBe(0);
    expect(normalizeMoveDuration(2050)).toBe(2000);
  });

  test('persists the normalized device-local value', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
    expect(saveMoveDuration(450, storage)).toBe(450);
    expect(loadMoveDuration(storage)).toBe(450);
  });

  test('reduced motion overrides movement without changing storage', () => {
    expect(effectiveMoveDuration(450, true)).toBe(0);
    expect(effectiveMoveDuration(450, false)).toBe(450);
  });
});
