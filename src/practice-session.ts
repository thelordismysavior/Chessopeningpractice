import { Chess, type Square } from 'chess.js';
import type { Lesson, PracticePosition } from './courses';

export type SessionStatus = 'active' | 'retrying' | 'needs-clean-run' | 'complete';
export type FeedbackKind = 'correct' | 'incorrect' | 'illegal' | 'complete';

export type SessionSnapshot = {
  status: SessionStatus;
  positionIndex: number;
  position: PracticePosition | null;
  attempts: number;
  missedPositionIds: string[];
  completedPositionIds: string[];
  cleanRun: boolean;
  lessonComplete: boolean;
};

export type MoveFeedback = {
  kind: FeedbackKind;
  message: string;
  expectedMove: string;
  expectedSan: string;
  retryRequired: boolean;
  snapshot: SessionSnapshot;
};

function parseMove(move: string): { from: Square; to: Square; promotion?: 'q' | 'r' | 'b' | 'n' } | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return null;
  return { from: move.slice(0, 2) as Square, to: move.slice(2, 4) as Square, ...(move[4] ? { promotion: move[4] as 'q' | 'r' | 'b' | 'n' } : {}) };
}

export class PracticeSession {
  private readonly positions: PracticePosition[];
  private positionIndex = 0;
  private status: SessionStatus = 'active';
  private attempts = 0;
  private cleanRun = true;
  private readonly isReview: boolean;
  private readonly missedPositionIds = new Set<string>();
  private readonly completedPositionIds = new Set<string>();

  constructor(lesson: Lesson, options: { reviewPositionIds?: string[] } = {}) {
    const reviewIds = options.reviewPositionIds ?? [];
    const reviewPositions = reviewIds.map((id) => lesson.positions.find((position) => position.id === id)).filter((position): position is PracticePosition => Boolean(position));
    this.isReview = reviewPositions.length > 0;
    this.positions = this.isReview ? reviewPositions : lesson.positions;
  }

  get snapshot(): SessionSnapshot {
    return {
      status: this.status,
      positionIndex: this.positionIndex,
      position: this.positions[this.positionIndex] ?? null,
      attempts: this.attempts,
      missedPositionIds: [...this.missedPositionIds],
      completedPositionIds: [...this.completedPositionIds],
      cleanRun: this.cleanRun,
      lessonComplete: this.status === 'complete' && !this.isReview,
    };
  }

  submitMove(move: string): MoveFeedback {
    const position = this.positions[this.positionIndex];
    if (!position || this.status === 'complete' || this.status === 'needs-clean-run') {
      return { kind: 'complete', message: this.status === 'needs-clean-run' ? 'That run had mistakes. Start a clean run to complete the lesson.' : 'This drill is complete.', expectedMove: '', expectedSan: '', retryRequired: false, snapshot: this.snapshot };
    }

    const candidate = parseMove(move);
    if (!candidate) return this.feedback('illegal', 'That is not a valid board move.', position, false);

    const chess = new Chess(position.fen);
    try {
      chess.move(candidate);
    } catch {
      return this.feedback('illegal', 'That move is not legal in this position.', position, false);
    }

    this.attempts += 1;
    if (move !== position.expectedMove) {
      this.cleanRun = false;
      this.missedPositionIds.add(position.id);
      this.status = 'retrying';
      return this.feedback('incorrect', `Try again: ${position.expectedSan} is the repertoire move.`, position, true);
    }

    this.completedPositionIds.add(position.id);
    this.positionIndex += 1;
    if (this.positionIndex === this.positions.length) {
      this.status = this.cleanRun ? 'complete' : 'needs-clean-run';
      return this.feedback('correct', this.cleanRun ? (this.isReview ? 'Review complete.' : 'Clean run complete.') : 'Line finished. Repeat it once without a mistake to complete the lesson.', position, false);
    }

    this.status = 'active';
    return this.feedback('correct', 'Good. Continue the line.', position, false);
  }

  restartCleanRun(): SessionSnapshot {
    this.positionIndex = 0;
    this.status = 'active';
    this.cleanRun = true;
    this.missedPositionIds.clear();
    this.completedPositionIds.clear();
    return this.snapshot;
  }

  private feedback(kind: FeedbackKind, message: string, position: PracticePosition, retryRequired: boolean): MoveFeedback {
    return { kind, message, expectedMove: position.expectedMove, expectedSan: position.expectedSan, retryRequired, snapshot: this.snapshot };
  }
}

export const createPracticeSession = (lesson: Lesson, options?: { reviewPositionIds?: string[] }) => new PracticeSession(lesson, options);
