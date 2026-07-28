import { describe, expect, test } from 'vitest';
import {
  centipawnLoss,
  costPhrase,
  evalLabel,
  fillFraction,
  moveSeverity,
  orientScore,
  parseInfo,
  parseScore,
  PROVISIONAL_MIN_DEPTH,
  type EvalScore,
} from '../src/engine/eval-scale';

const cp = (value: number): EvalScore => ({ kind: 'cp', cp: value });
const mate = (moves: number): EvalScore => ({ kind: 'mate', movesToMate: moves });

describe('parseScore', () => {
  test('reads a centipawn score from an info line', () => {
    expect(parseScore('info depth 12 seldepth 18 score cp -37 nodes 1000 pv e2e4')).toEqual(cp(-37));
  });

  test('reads a mate score and prefers it over any centipawn text', () => {
    expect(parseScore('info depth 20 score mate -3 pv e2e4')).toEqual(mate(-3));
  });

  test('returns null for a line with no score', () => {
    expect(parseScore('info depth 1 currmove e2e4')).toBeNull();
  });
});

describe('parseInfo', () => {
  test('reads depth alongside score', () => {
    expect(parseInfo('info depth 12 seldepth 18 score cp -37 nodes 1000 pv e2e4')).toEqual({ depth: 12, score: cp(-37) });
  });

  test('does not mistake seldepth for depth', () => {
    expect(parseInfo('info seldepth 30 depth 9 score cp 12')).toEqual({ depth: 9, score: cp(12) });
  });

  test('returns null without a score', () => {
    expect(parseInfo('info depth 1 currmove e2e4')).toBeNull();
  });

  test('gates noisy opening depths', () => {
    expect(PROVISIONAL_MIN_DEPTH).toBeGreaterThanOrEqual(6);
  });
});

describe('orientScore', () => {
  const white = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const black = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';

  test('keeps the score when the learner is the side to move', () => {
    expect(orientScore(cp(120), white, 'w')).toEqual(cp(120));
    expect(orientScore(cp(120), black, 'b')).toEqual(cp(120));
  });

  test('negates the score when the opponent is the side to move', () => {
    expect(orientScore(cp(120), black, 'w')).toEqual(cp(-120));
    expect(orientScore(mate(3), white, 'b')).toEqual(mate(-3));
  });
});

describe('fillFraction', () => {
  test('is a half at a dead level position', () => {
    expect(fillFraction(cp(0))).toBeCloseTo(0.5, 10);
  });

  test('is symmetric about a half', () => {
    for (const value of [15, 120, 450, 5000]) {
      expect(fillFraction(cp(value)) + fillFraction(cp(-value))).toBeCloseTo(1, 10);
    }
  });

  test('is monotonic and stays inside the bar', () => {
    const samples = [-5000, -400, -50, 0, 50, 400, 5000].map((value) => fillFraction(cp(value)));
    for (let index = 1; index < samples.length; index += 1) expect(samples[index]).toBeGreaterThan(samples[index - 1]);
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[samples.length - 1]).toBeLessThan(1);
  });

  test('fills the bar for the mating side', () => {
    expect(fillFraction(mate(3))).toBe(1);
    expect(fillFraction(mate(-3))).toBe(0);
  });
});

describe('evalLabel', () => {
  test('formats pawns with a sign and one decimal', () => {
    expect(evalLabel(cp(42))).toBe('+0.4');
    expect(evalLabel(cp(-130))).toBe('-1.3');
    expect(evalLabel(cp(0))).toBe('0.0');
  });

  test('formats mate scores', () => {
    expect(evalLabel(mate(3))).toBe('M3');
    expect(evalLabel(mate(-3))).toBe('-M3');
  });
});

describe('centipawnLoss', () => {
  test('is the drop from the expected move to the played move', () => {
    expect(centipawnLoss(cp(30), cp(-150))).toBe(180);
  });

  test('never goes below zero when the played move is better', () => {
    expect(centipawnLoss(cp(30), cp(90))).toBe(0);
  });

  test('treats a thrown-away mate as a large loss', () => {
    expect(centipawnLoss(mate(2), cp(0))).toBeGreaterThanOrEqual(300);
  });
});

describe('moveSeverity', () => {
  test('bands at 50, 150, and 300', () => {
    expect(moveSeverity(0)).toBe('fine');
    expect(moveSeverity(49)).toBe('fine');
    expect(moveSeverity(50)).toBe('inaccuracy');
    expect(moveSeverity(149)).toBe('inaccuracy');
    expect(moveSeverity(150)).toBe('mistake');
    expect(moveSeverity(299)).toBe('mistake');
    expect(moveSeverity(300)).toBe('blunder');
  });
});

describe('costPhrase', () => {
  test('names both moves and the cost in pawns', () => {
    expect(costPhrase('Bd3', 'Nf3', 140)).toBe('Bd3 gives up 1.4 - Nf3 is the line.');
    expect(costPhrase('Bd3', 'Nf3', 210)).toBe('Bd3 loses 2.1 - Nf3 is the line.');
    expect(costPhrase('Bd3', 'Nf3', 640)).toBe('Bd3 throws away 6.4 - Nf3 is the line.');
  });

  test('does not claim a cost when the move is merely off-book', () => {
    expect(costPhrase('Bd3', 'Nf3', 20)).toBe('Bd3 is playable, but Nf3 is the line.');
  });
});
