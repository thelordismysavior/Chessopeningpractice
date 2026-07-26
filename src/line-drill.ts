import { Chess } from 'chess.js';
import type { PracticePosition } from './courses';
import { parseUciMove } from './move-notation';
import type { PositionOutcome } from './review-schedule';

export type DrillPhase = 'teach' | 'recall' | 'review';
export type DrillStatus = 'active' | 'retrying' | 'complete';
export type DrillFeedbackKind = 'correct' | 'incorrect' | 'illegal' | 'complete';

export type DrillConfig = { teachPass: boolean; mistakeBudget?: number };

export type DrillOutcomeEntry = PositionOutcome & { positionId: string; phase: DrillPhase };

export type DrillSnapshot = {
  phase: DrillPhase;
  status: DrillStatus;
  positionIndex: number;
  position: PracticePosition | null;
  positionCount: number;
  mistakes: number;
  mistakeBudget: number | null;
  hintVisible: boolean;
  banked: boolean;
};

export type DrillFeedback = {
  kind: DrillFeedbackKind;
  message: string;
  expectedMove: string;
  expectedSan: string;
  retryRequired: boolean;
  snapshot: DrillSnapshot;
};

export class LineDrill {
  private readonly positions: PracticePosition[];
  private readonly budget: number | null;
  private phase: DrillPhase;
  private status: DrillStatus = 'active';
  private index = 0;
  private mistakes = 0;
  private banked = false;
  private hintVisible = false;
  private attemptsOnPosition = 0;
  private wrongOnPosition = false;
  private hintedOnPosition = false;
  private readonly log: DrillOutcomeEntry[] = [];

  constructor(positions: PracticePosition[], config: DrillConfig) {
    this.positions = positions;
    this.budget = config.mistakeBudget ?? null;
    this.phase = config.teachPass ? 'teach' : config.mistakeBudget === undefined ? 'review' : 'recall';
  }

  get snapshot(): DrillSnapshot {
    return {
      phase: this.phase,
      status: this.status,
      positionIndex: this.index,
      position: this.positions[this.index] ?? null,
      positionCount: this.positions.length,
      mistakes: this.mistakes,
      mistakeBudget: this.phase === 'recall' ? this.budget : null,
      hintVisible: this.hintVisible,
      banked: this.banked,
    };
  }

  get outcomeLog(): DrillOutcomeEntry[] {
    return [...this.log];
  }

  requestHint(): DrillSnapshot {
    if (this.status === 'complete') return this.snapshot;
    this.hintVisible = true;
    this.hintedOnPosition = true;
    return this.snapshot;
  }

  submitMove(move: string): DrillFeedback {
    const position = this.positions[this.index];
    if (!position || this.status === 'complete') {
      return this.feedback('complete', 'This drill is complete.', position ?? null, false);
    }

    const candidate = parseUciMove(move);
    if (!candidate) return this.feedback('illegal', 'That is not a valid board move.', position, false);
    const chess = new Chess(position.fen);
    try {
      chess.move(candidate);
    } catch {
      return this.feedback('illegal', 'That move is not legal in this position.', position, false);
    }

    this.attemptsOnPosition += 1;

    if (move !== position.expectedMove) {
      if (!this.wrongOnPosition && this.phase !== 'teach') this.mistakes += 1;
      this.wrongOnPosition = true;
      this.status = 'retrying';
      return this.feedback('incorrect', `Not the repertoire move. ${position.expectedSan} keeps the plan: ${position.explanation}`, position, true);
    }

    this.log.push({
      positionId: position.id,
      phase: this.phase,
      attempts: this.attemptsOnPosition,
      solvedFirstTry: !this.wrongOnPosition,
      hinted: this.hintedOnPosition,
    });
    this.resetPositionTracking();
    this.index += 1;

    if (this.index < this.positions.length) {
      this.status = 'active';
      return this.feedback('correct', 'Good. Continue the line.', position, false);
    }

    return this.finishPass(position);
  }

  private finishPass(position: PracticePosition): DrillFeedback {
    if (this.phase === 'teach') {
      this.phase = 'recall';
      this.index = 0;
      this.mistakes = 0;
      this.status = 'active';
      return this.feedback('correct', 'Line learned. Now play it back without the guide.', position, false);
    }

    if (this.phase === 'review') {
      this.status = 'complete';
      return this.feedback('correct', 'Review complete.', position, false);
    }

    if (this.budget !== null && this.mistakes >= this.budget) {
      this.index = 0;
      this.mistakes = 0;
      this.status = 'active';
      return this.feedback('correct', 'That pass had too many slips. Play the line again to bank it.', position, false);
    }

    this.status = 'complete';
    this.banked = true;
    return this.feedback('correct', 'Line banked.', position, false);
  }

  private resetPositionTracking(): void {
    this.attemptsOnPosition = 0;
    this.wrongOnPosition = false;
    this.hintedOnPosition = false;
    this.hintVisible = false;
  }

  private feedback(kind: DrillFeedbackKind, message: string, position: PracticePosition | null, retryRequired: boolean): DrillFeedback {
    return {
      kind,
      message,
      expectedMove: position?.expectedMove ?? '',
      expectedSan: position?.expectedSan ?? '',
      retryRequired,
      snapshot: this.snapshot,
    };
  }
}
