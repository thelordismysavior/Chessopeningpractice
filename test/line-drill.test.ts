import { describe, expect, test } from 'vitest';
import type { PracticePosition } from '../src/courses';
import { LineDrill } from '../src/line-drill';

function pos(id: string, fen: string, expectedMove: string, expectedSan: string): PracticePosition {
  return { id, fen, expectedMove, expectedSan, explanation: `Play ${expectedSan}.` };
}

/** Two real Jobava London positions; White to move in both. */
const line = (): PracticePosition[] => [
  pos('l-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4', 'd4'),
  pos('l-2', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'b1c3', 'Nc3'),
];

const lessonDrill = () => new LineDrill(line(), { teachPass: true, mistakeBudget: 2 });
const reviewDrill = () => new LineDrill(line(), { teachPass: false });

function playLine(drill: LineDrill, positions = line()): void {
  for (const position of positions) drill.submitMove(position.expectedMove);
}

describe('phases', () => {
  test('starts in the teach phase and restarts the same line in recall', () => {
    const drill = lessonDrill();
    expect(drill.snapshot.phase).toBe('teach');

    playLine(drill);

    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.snapshot.position?.id).toBe('l-1');
    expect(drill.snapshot.status).toBe('active');
  });

  test('banks the line after a clean recall pass', () => {
    const drill = lessonDrill();
    playLine(drill);
    playLine(drill);

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(true);
  });

  test('a review has no teach phase and never banks', () => {
    const drill = reviewDrill();
    expect(drill.snapshot.phase).toBe('review');
    expect(drill.snapshot.mistakeBudget).toBeNull();

    playLine(drill);

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(false);
  });
});

describe('mistake budget', () => {
  test('teach-pass mistakes never count', () => {
    const drill = lessonDrill();
    drill.submitMove('b1c3');
    drill.submitMove('g1f3');
    expect(drill.snapshot.mistakes).toBe(0);

    playLine(drill);
    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.mistakes).toBe(0);
  });

  test('charges one mistake per position however many wrong attempts it takes', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('g1f3');
    expect(drill.snapshot.mistakes).toBe(1);
    expect(drill.snapshot.status).toBe('retrying');
  });

  test('one mistake still banks the line', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('d2d4');
    drill.submitMove('b1c3');
    drill.submitMove('d2d4');

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(true);
  });

  test('two mistakes restart the recall pass with a fresh budget, not the teach pass', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('d2d4');
    drill.submitMove('g1f3');
    drill.submitMove('b1c3');

    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.status).toBe('active');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.snapshot.mistakes).toBe(0);
    expect(drill.snapshot.banked).toBe(false);
  });

  test('a review never replays however many mistakes are made', () => {
    const drill = reviewDrill();
    drill.submitMove('b1c3');
    drill.submitMove('d2d4');
    drill.submitMove('g1f3');
    drill.submitMove('b1c3');

    expect(drill.snapshot.status).toBe('complete');
  });
});

describe('hints', () => {
  test('reveals the guide without spending budget', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    expect(drill.snapshot.hintVisible).toBe(true);
    expect(drill.snapshot.mistakes).toBe(0);
  });

  test('clears the reveal on the next position', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    drill.submitMove('d2d4');
    expect(drill.snapshot.hintVisible).toBe(false);
  });
});

describe('move validation', () => {
  test('rejects an illegal move without counting an attempt or advancing', () => {
    const drill = lessonDrill();
    const feedback = drill.submitMove('a1a8');
    expect(feedback.kind).toBe('illegal');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.outcomeLog).toEqual([]);
  });

  test('rejects unparseable input', () => {
    expect(lessonDrill().submitMove('nonsense').kind).toBe('illegal');
  });
});

describe('outcome log', () => {
  test('records one entry per finished position, tagged with its phase', () => {
    const drill = lessonDrill();
    playLine(drill);

    expect(drill.outcomeLog).toEqual([
      { positionId: 'l-1', phase: 'teach', attempts: 1, solvedFirstTry: true, hinted: false },
      { positionId: 'l-2', phase: 'teach', attempts: 1, solvedFirstTry: true, hinted: false },
    ]);
  });

  test('marks a fumbled recall position and counts its attempts', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('d2d4');

    expect(drill.outcomeLog.at(-1)).toEqual({
      positionId: 'l-1',
      phase: 'recall',
      attempts: 2,
      solvedFirstTry: false,
      hinted: false,
    });
  });

  test('marks a hinted position as hinted even when the move is then correct', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    drill.submitMove('d2d4');

    expect(drill.outcomeLog.at(-1)).toMatchObject({ positionId: 'l-1', phase: 'recall', hinted: true, solvedFirstTry: true });
  });
});
