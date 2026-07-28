import { describe, expect, test } from 'vitest';
import { Chess } from 'chess.js';
import { isDragPastThreshold, resolveBoardDrop, resolveTempoCut } from '../src/board-input';
import { COURSES } from '../src/courses';
import { shouldShowMoveGuide } from '../src/guide-policy';
import {
  effectiveMoveDuration,
  loadMoveDuration,
  moveBeats,
  normalizeMoveDuration,
  saveMoveDuration,
} from '../src/move-settings';
import { planFenTransition, planMoveTransition, settleDisplayFen } from '../src/transition-plans';

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

  test('treats movement within the threshold of the press point as not a drag', () => {
    expect(isDragPastThreshold(100, 100, 103, 102, 6)).toBe(false);
    expect(isDragPastThreshold(20, 80, 24, 83, 6)).toBe(false);
  });

  test('anchors the threshold to the press point, not the square centre', () => {
    const squareCentre = { x: 50, y: 50 };
    const pressNearEdge = { x: 8, y: 12 };
    const tinyJitter = { x: pressNearEdge.x + 2, y: pressNearEdge.y + 1 };
    expect(Math.hypot(tinyJitter.x - squareCentre.x, tinyJitter.y - squareCentre.y)).toBeGreaterThan(6);
    expect(isDragPastThreshold(pressNearEdge.x, pressNearEdge.y, tinyJitter.x, tinyJitter.y, 6)).toBe(false);
  });

  test('promotes to a drag once movement from the press point meets the threshold', () => {
    expect(isDragPastThreshold(100, 100, 106, 100, 6)).toBe(true);
    expect(isDragPastThreshold(20, 80, 20, 88, 6)).toBe(true);
  });
});

describe('guided move policy', () => {
  test('always guides the teach pass', () => {
    expect(shouldShowMoveGuide('teach', 'active', false)).toBe(true);
    expect(shouldShowMoveGuide('teach', 'retrying', false)).toBe(true);
  });

  test('withholds the guide during recall until it is earned', () => {
    expect(shouldShowMoveGuide('recall', 'active', false)).toBe(false);
    expect(shouldShowMoveGuide('recall', 'retrying', false)).toBe(true);
    expect(shouldShowMoveGuide('recall', 'active', true)).toBe(true);
  });

  test('treats a review like a recall pass', () => {
    expect(shouldShowMoveGuide('review', 'active', false)).toBe(false);
    expect(shouldShowMoveGuide('review', 'retrying', false)).toBe(true);
    expect(shouldShowMoveGuide('review', 'active', true)).toBe(true);
  });

  test('never guides a finished drill', () => {
    expect(shouldShowMoveGuide('teach', 'complete', true)).toBe(false);
    expect(shouldShowMoveGuide('recall', 'complete', true)).toBe(false);
  });
});

describe('move transition plans', () => {
  test('plans castling as king and rook travel', () => {
    const position = COURSES[0].lessons.beginner.positions.find((entry) => entry.expectedSan === 'O-O');
    expect(position).toBeDefined();
    const plan = planMoveTransition(position!.fen, position!.expectedMove);
    expect(plan?.isCastle).toBe(true);
    expect(plan?.pieces.map(({ from, to }) => [from, to]).sort()).toEqual(['e1-g1', 'h1-f1'].map((move) => move.split('-')));
  });

  test('keeps a captured piece in the plan until landing', () => {
    const position = COURSES.find((course) => course.id === 'classical-sicilian')!.lessons.beginner.variations
      .find((variation) => variation.kind === 'main')!.positions
      .find((entry) => entry.expectedSan === 'cxd4');
    expect(position).toBeDefined();
    const plan = planMoveTransition(position!.fen, position!.expectedMove);
    expect(plan?.pieces[0].captured).toBe('wP');
    expect(plan?.pieces[0].captureSquare).toBe('d4');
  });

  test('infers the opponent reply from adjacent position FENs', () => {
    const learner = lesson.positions[0];
    const next = lesson.positions[1];
    const learnerPlan = planMoveTransition(learner.fen, learner.expectedMove)!;
    const reply = planFenTransition(learnerPlan.afterFen, next.fen);
    expect(reply?.pieces[0]).toMatchObject({ from: 'd7', to: 'd5', piece: 'bP' });
  });

  test('settles on the next line start when no reply joins the positions', () => {
    const learner = lesson.variations[0].positions.at(-1)!;
    const nextLine = lesson.variations[1].positions[0];
    const learnerPlan = planMoveTransition(learner.fen, learner.expectedMove)!;
    const reply = planFenTransition(learnerPlan.afterFen, nextLine.fen);

    expect(reply).toBeNull();
    expect(settleDisplayFen('learner', 'reply', 'next')).toBe('reply');
    expect(settleDisplayFen(learnerPlan.afterFen, reply?.afterFen ?? null, nextLine.fen)).toBe(nextLine.fen);
    expect(settleDisplayFen(learnerPlan.afterFen, null, null)).toBe(learnerPlan.afterFen);
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

describe('move beats', () => {
  test('teaching holds the reply longer than recall', () => {
    expect(moveBeats(200, true)).toEqual({ beforeReply: 120, afterReply: 300 });
    expect(moveBeats(200, false)).toEqual({ beforeReply: 120, afterReply: 150 });
  });

  test('a zero duration preference asks for no tempo at all', () => {
    expect(moveBeats(0, true)).toEqual({ beforeReply: 0, afterReply: 0 });
    expect(moveBeats(20, false)).toEqual({ beforeReply: 0, afterReply: 0 });
  });

  test('reduced motion still leaves time to read the reply', () => {
    expect(effectiveMoveDuration(450, true)).toBe(0);
    expect(moveBeats(450, false).beforeReply).toBe(120);
  });
});

describe('tempo cut', () => {
  test('a learner piece cuts the remaining tempo', () => {
    expect(resolveTempoCut(true, 'w', 'w')).toBe('cut');
  });

  test('empty and opponent squares do not cut', () => {
    expect(resolveTempoCut(true, null, 'w')).toBe('ignore');
    expect(resolveTempoCut(true, 'b', 'w')).toBe('ignore');
  });

  test('a reply-captured learner piece cannot be selected from the painted ghost', () => {
    const beforeReply = '8/8/8/4p3/3P4/8/8/K6k b - - 0 1';
    const reply = planMoveTransition(beforeReply, 'e5d4')!;
    const settledPiece = new Chess(reply.afterFen).get('d4');
    expect(settledPiece?.color).toBe('b');
    expect(resolveTempoCut(true, settledPiece?.color ?? null, 'w')).toBe('ignore');
  });

  test('a settled board has no tempo to cut', () => {
    expect(resolveTempoCut(false, 'w', 'w')).toBe('ignore');
  });
});
