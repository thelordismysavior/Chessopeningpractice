import { LEVELS, type Lesson, type LevelKey, type PracticePosition, type Variation } from './courses';
import { isTrainableVariation } from './repertoire';
import { LineDrill, type DrillFeedback, type DrillPhase, type DrillStatus } from './line-drill';
import type { CourseProgress } from './progress';
import { applyOutcome, emptyRecord, reviewAt, withSchedule, type PositionRecord } from './review-schedule';

export const MISTAKE_BUDGET = 2;

/** A DrillFeedback whose snapshot is widened to the runner's view. */
export type RunnerFeedback = Omit<DrillFeedback, 'snapshot'> & { snapshot: RunnerSnapshot };

export type RunnerSnapshot = {
  phase: DrillPhase;
  status: DrillStatus;
  position: PracticePosition | null;
  positionIndex: number;
  positionCount: number;
  mistakes: number;
  mistakeBudget: number | null;
  hintVisible: boolean;
  hintLevel: number;
  lineId: string | null;
  lineTitle: string | null;
  lineSummary: string | null;
  lineIndex: number;
  lineCount: number;
  bankedVariationIds: string[];
  branchReview: BranchReview | null;
  lessonComplete: boolean;
};

export type BranchReview = {
  variationId: string;
  variationTitle: string;
  position: PracticePosition;
  opponentTrigger: string;
  resultingPlan: string;
};

export type LessonSummary = {
  bankedLines: { id: string; title: string }[];
  missed: { positionId: string; lineTitle: string; expectedSan: string }[];
  hints: number;
  elapsedMs: number;
  branch: BranchReview | null;
};

type RunnerOptions = {
  variationId?: string;
  reviewPositionIds?: string[];
  now?: () => number;
};

type Line = { variation: Variation | null; positions: PracticePosition[]; teachPass: boolean };

export function firstBranchPoint(lesson: Lesson, core: Variation): BranchReview | null {
  const alternative = lesson.variations.find((variation) => isTrainableVariation(variation) && variation.kind !== 'core');
  if (!alternative) return null;
  const divergenceIndex = alternative.positions.findIndex((position, index) => position.expectedMove !== core.positions[index]?.expectedMove);
  const position = divergenceIndex >= 0 ? alternative.positions[divergenceIndex] : undefined;
  if (!position) return null;
  return {
    variationId: alternative.id,
    variationTitle: alternative.title,
    position,
    opponentTrigger: lesson.lessonIdea.opponentTrigger,
    resultingPlan: lesson.lessonIdea.resultingPlan,
  };
}

export class LessonRunner {
  private readonly lesson: Lesson;
  private readonly base: CourseProgress;
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly isReview: boolean;
  private readonly lines: Line[];
  private readonly branch: BranchReview | null;
  private readonly banked: string[] = [];
  private readonly records: Record<string, PositionRecord>;
  private readonly missed: LessonSummary['missed'] = [];
  private readonly missedIds = new Set<string>();
  private appliedOutcomes = 0;
  private lineIndex = 0;
  private drill: LineDrill | null = null;
  private hints = 0;
  private finishedAt: number | null = null;
  private branchStarted = false;
  private branchCompleted = false;

  constructor(lesson: Lesson, base: CourseProgress, options: RunnerOptions = {}) {
    this.lesson = lesson;
    this.base = base;
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
    this.records = { ...base.positions };

    const trainablePositionIds = new Set(lesson.variations
      .filter(isTrainableVariation)
      .flatMap((variation) => variation.positions.map((position) => position.id)));
    const requestedReviewIds = options.reviewPositionIds ?? [];
    const reviewIds = requestedReviewIds.filter((id) => trainablePositionIds.has(id));
    const reviewPositions = reviewIds
      .map((id) => lesson.positions.find((position) => position.id === id))
      .filter((position): position is PracticePosition => Boolean(position));
    this.isReview = requestedReviewIds.length > 0;

    if (this.isReview) {
      this.lines = [{ variation: null, positions: reviewPositions, teachPass: false }];
      this.branch = null;
    } else {
      const bankedAlready = new Set(base.completedVariationIds);
      const variations = options.variationId
        ? lesson.variations.filter((variation) => variation.id === options.variationId && isTrainableVariation(variation))
        : lesson.variations.filter((variation) => isTrainableVariation(variation) && !bankedAlready.has(variation.id));
      this.lines = variations.map((variation) => ({
        variation,
        positions: variation.positions,
        teachPass: !bankedAlready.has(variation.id),
      }));
      const selected = this.lines[0]?.variation;
      this.branch = selected?.kind === 'core' && !bankedAlready.has(selected.id) ? firstBranchPoint(lesson, selected) : null;
    }

    this.openDrill();
  }

  get reviewMode(): boolean {
    return this.isReview;
  }

  get snapshot(): RunnerSnapshot {
    const line = this.lines[this.lineIndex] ?? null;
    const drill = this.drill?.snapshot ?? null;
    const complete = this.drill === null;
    const branch = this.branchStarted && !this.branchCompleted ? this.branch : null;
    return {
      phase: drill?.phase ?? (this.isReview ? 'review' : 'recall'),
      status: drill?.status ?? 'complete',
      position: drill?.position ?? null,
      positionIndex: drill?.positionIndex ?? 0,
      positionCount: drill?.positionCount ?? 0,
      mistakes: drill?.mistakes ?? 0,
      mistakeBudget: drill?.mistakeBudget ?? null,
      hintVisible: drill?.hintVisible ?? false,
      hintLevel: drill?.hintLevel ?? 0,
      lineId: branch?.variationId ?? line?.variation?.id ?? null,
      lineTitle: branch?.variationTitle ?? line?.variation?.title ?? null,
      lineSummary: branch ? `Recognize the alternative after ${branch.opponentTrigger}.` : line?.variation?.summary ?? null,
      lineIndex: this.lineIndex,
      lineCount: this.lines.length,
      bankedVariationIds: [...this.banked],
      branchReview: branch,
      lessonComplete: complete && !this.isReview && !branch,
    };
  }

  submitMove(move: string): RunnerFeedback {
    if (!this.drill) {
      return {
        kind: 'complete',
        message: 'This lesson is complete.',
        expectedMove: '',
        expectedSan: '',
        retryRequired: false,
        snapshot: this.snapshot,
      };
    }
    const feedback = this.drill.submitMove(move);
    this.absorbOutcomes();
    if (this.drill.snapshot.status === 'complete') this.closeDrill();
    return { ...feedback, snapshot: this.snapshot };
  }

  requestHint(): RunnerSnapshot {
    if (this.drill && this.drill.snapshot.status !== 'complete') {
      const before = this.drill.snapshot.hintVisible;
      this.drill.requestHint();
      if (!before) this.hints += 1;
    }
    return this.snapshot;
  }

  progressFor(level: LevelKey): CourseProgress {
    if (this.isReview && this.lines.every((line) => line.positions.length === 0)) return this.base;
    const completedLevels = [...this.base.completedLevels];
    const completedVariationIds = [...new Set([...this.base.completedVariationIds, ...this.banked])];
    let unlockedLevel = this.base.unlockedLevel;
    const levelIndex = LEVELS.indexOf(level);
    const prerequisiteComplete = levelIndex === 0 || completedLevels.includes(LEVELS[levelIndex - 1]);
    const levelComplete = this.lesson.variations.filter(isTrainableVariation).every((variation) => completedVariationIds.includes(variation.id));

    if (this.snapshot.lessonComplete && levelComplete && prerequisiteComplete && !completedLevels.includes(level)) {
      completedLevels.push(level);
      unlockedLevel = Math.max(unlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
    }

    return {
      completedLevels,
      unlockedLevel,
      completedVariationIds,
      positions: { ...this.records },
      practiceMs: this.base.practiceMs + this.elapsedMs(),
    };
  }

  summary(): LessonSummary {
    const titles = new Map(this.lesson.variations.map((variation) => [variation.id, variation.title]));
    return {
      bankedLines: this.banked.map((id) => ({ id, title: titles.get(id) ?? id })),
      missed: [...this.missed],
      hints: this.hints,
      elapsedMs: this.elapsedMs(),
      branch: this.branch,
    };
  }

  private elapsedMs(): number {
    return Math.max(0, (this.finishedAt ?? this.now()) - this.startedAt);
  }

  private openDrill(): void {
    const line = this.lines[this.lineIndex];
    if (!line) {
      this.drill = null;
      this.finishedAt = this.now();
      return;
    }
    this.drill = this.isReview
      ? new LineDrill(line.positions, { teachPass: false })
      : new LineDrill(line.positions, { teachPass: line.teachPass, mistakeBudget: MISTAKE_BUDGET });
    this.appliedOutcomes = 0;
  }

  private openBranchDrill(): void {
    if (!this.branch) return;
    this.drill = new LineDrill([this.branch.position], { teachPass: false });
    this.appliedOutcomes = 0;
  }

  private closeDrill(): void {
    if (this.branchStarted && !this.branchCompleted) {
      this.branchCompleted = true;
      this.drill = null;
      this.finishedAt = this.now();
      return;
    }
    const line = this.lines[this.lineIndex];
    if (this.isReview && line) {
      const remaining = line.positions.filter((position) => this.records[position.id]?.due);
      if (remaining.length) {
        this.drill = new LineDrill(remaining, { teachPass: false });
        this.appliedOutcomes = 0;
        return;
      }
    }
    if (this.drill?.snapshot.banked && line?.variation) this.banked.push(line.variation.id);
    if (this.branch && !this.branchStarted && line?.variation?.kind === 'core') {
      this.branchStarted = true;
      this.openBranchDrill();
      return;
    }
    this.lineIndex += 1;
    this.openDrill();
  }

  private absorbOutcomes(): void {
    if (!this.drill) return;
    const log = this.drill.outcomeLog;
    const lineTitle = this.branchStarted && !this.branchCompleted
      ? this.branch?.variationTitle ?? 'Branch review'
      : this.lines[this.lineIndex]?.variation?.title ?? 'Review';

    for (let index = this.appliedOutcomes; index < log.length; index += 1) {
      const entry = log[index];
      const context = entry.phase;
      const clean = entry.solvedFirstTry && !entry.hinted;
      let record = applyOutcome(
        this.records[entry.positionId] ?? emptyRecord(),
        { attempts: entry.attempts, solvedFirstTry: entry.solvedFirstTry, hinted: entry.hinted },
        context,
        this.now(),
      );
      if (entry.recovery && clean) record = withSchedule({ ...record, due: false, reviewStreak: 0 }, 0, reviewAt(0, this.now()));
      this.records[entry.positionId] = record;

      const scored = context !== 'teach';
      if (scored && !clean && !this.missedIds.has(entry.positionId)) {
        this.missedIds.add(entry.positionId);
        const position = this.lesson.positions.find((candidate) => candidate.id === entry.positionId);
        this.missed.push({
          positionId: entry.positionId,
          lineTitle,
          expectedSan: position?.expectedSan ?? '',
        });
      }
    }
    this.appliedOutcomes = log.length;
  }
}
