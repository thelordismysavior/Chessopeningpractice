import { Chess } from 'chess.js';
import type { Lesson, PracticePosition, Variation } from './courses';
import { parseUciMove } from './move-notation';

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
  variation: Variation | null;
  variationIndex: number;
  bankedVariationIds: string[];
};

export type MoveFeedback = {
  kind: FeedbackKind;
  message: string;
  expectedMove: string;
  expectedSan: string;
  retryRequired: boolean;
  snapshot: SessionSnapshot;
};

export class PracticeSession {
  private readonly lesson: Lesson;
  private readonly positions: PracticePosition[];
  private positionIndex = 0;
  private status: SessionStatus = 'active';
  private attempts = 0;
  private cleanRun = true;
  private readonly isReview: boolean;
  private readonly missedPositionIds = new Set<string>();
  private readonly completedPositionIds = new Set<string>();
  private readonly bankedVariationIds = new Set<string>();
  private variationCursor = 0;

  constructor(lesson: Lesson, options: { reviewPositionIds?: string[]; bankedVariationIds?: string[] } = {}) {
    this.lesson = lesson;
    const reviewIds = options.reviewPositionIds ?? [];
    const reviewPositions = reviewIds.map((id) => lesson.positions.find((position) => position.id === id)).filter((position): position is PracticePosition => Boolean(position));
    this.isReview = reviewPositions.length > 0;
    this.positions = this.isReview ? reviewPositions : lesson.positions;

    if (!this.isReview) {
      for (const id of options.bankedVariationIds ?? []) {
        if (lesson.variations.some((variation) => variation.id === id)) this.bankedVariationIds.add(id);
      }
      this.variationCursor = lesson.variations.findIndex((variation) => !this.bankedVariationIds.has(variation.id));
      if (this.variationCursor < 0) {
        this.status = 'complete';
        this.positionIndex = this.positions.length;
      } else {
        this.positionIndex = this.variationStartIndex(this.variationCursor);
      }
    }
  }

  get reviewMode(): boolean {
    return this.isReview;
  }

  get snapshot(): SessionSnapshot {
    const variation = this.currentVariation();
    return {
      status: this.status,
      positionIndex: this.positionIndex,
      position: this.positions[this.positionIndex] ?? null,
      attempts: this.attempts,
      missedPositionIds: [...this.missedPositionIds],
      completedPositionIds: [...this.completedPositionIds],
      cleanRun: this.cleanRun,
      lessonComplete: this.status === 'complete' && !this.isReview,
      variation: this.isReview ? null : variation,
      variationIndex: this.isReview || !variation ? 0 : this.positionIndex - this.variationStartIndex(this.variationCursor),
      bankedVariationIds: [...this.bankedVariationIds],
    };
  }

  submitMove(move: string): MoveFeedback {
    const position = this.positions[this.positionIndex];
    if (!position || this.status === 'complete' || this.status === 'needs-clean-run') {
      return { kind: 'complete', message: this.status === 'needs-clean-run' ? 'That run had mistakes. Start a clean run to bank this line.' : 'This drill is complete.', expectedMove: '', expectedSan: '', retryRequired: false, snapshot: this.snapshot };
    }

    const candidate = parseUciMove(move);
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

    if (this.isReview) {
      if (this.positionIndex === this.positions.length) {
        this.status = this.cleanRun ? 'complete' : 'needs-clean-run';
        return this.feedback('correct', this.cleanRun ? 'Review complete.' : 'Line finished. Repeat it once without a mistake to complete the review.', position, false);
      }
      this.status = 'active';
      return this.feedback('correct', 'Good. Continue the line.', position, false);
    }

    const variation = this.lesson.variations[this.variationCursor];
    const endExclusive = this.variationStartIndex(this.variationCursor) + variation.positions.length;
    if (this.positionIndex === endExclusive) {
      if (!this.cleanRun) {
        this.status = 'needs-clean-run';
        return this.feedback('correct', 'Line finished. Repeat it once without a mistake to bank this line.', position, false);
      }
      this.bankedVariationIds.add(variation.id);
      const nextIndex = this.lesson.variations.findIndex((entry, index) => index > this.variationCursor && !this.bankedVariationIds.has(entry.id));
      if (nextIndex < 0) {
        this.status = 'complete';
        return this.feedback('correct', 'Clean run complete.', position, false);
      }
      this.variationCursor = nextIndex;
      this.positionIndex = this.variationStartIndex(nextIndex);
      this.cleanRun = true;
      this.status = 'active';
      return this.feedback('correct', 'Line banked. Continue with the next line.', position, false);
    }

    this.status = 'active';
    return this.feedback('correct', 'Good. Continue the line.', position, false);
  }

  restartCleanRun(): SessionSnapshot {
    if (this.isReview) {
      this.positionIndex = 0;
    } else {
      this.positionIndex = this.variationStartIndex(this.variationCursor);
    }
    this.status = 'active';
    this.cleanRun = true;
    this.missedPositionIds.clear();
    this.completedPositionIds.clear();
    return this.snapshot;
  }

  private currentVariation(): Variation | null {
    if (this.isReview) return null;
    return this.lesson.variations[this.variationCursor] ?? null;
  }

  private variationStartIndex(variationIndex: number): number {
    let start = 0;
    for (let index = 0; index < variationIndex; index += 1) {
      start += this.lesson.variations[index].positions.length;
    }
    return start;
  }

  private feedback(kind: FeedbackKind, message: string, position: PracticePosition, retryRequired: boolean): MoveFeedback {
    return { kind, message, expectedMove: position.expectedMove, expectedSan: position.expectedSan, retryRequired, snapshot: this.snapshot };
  }
}

export const createPracticeSession = (lesson: Lesson, options?: { reviewPositionIds?: string[]; bankedVariationIds?: string[] }) => new PracticeSession(lesson, options);
