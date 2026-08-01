import { Chess } from 'chess.js';
import type { Course, LevelKey, PracticePosition, Variation } from './courses';
import type { BoardAnimation, BoardState } from './board-view';
import type { EngineClient, EngineStatus } from './engine/engine-client';
import type { EvalScore } from './engine/eval-scale';
import { isTrainableVariation } from './repertoire';
import { planFenTransition, planMoveTransition, settleDisplayFen, type MoveTransition } from './transition-plans';

type LinePreviewAdvance = {
  authored: MoveTransition;
  reply: MoveTransition | null;
  nextIndex: number | null;
  settledFen: string;
  completed: boolean;
};

/**
 * Plans one manual preview advance without changing progress or the authored
 * positions. The reply is the opponent move that connects the authored move
 * to the next stored prompt, when one exists.
 */
function planLinePreviewAdvance(positions: PracticePosition[], index: number): LinePreviewAdvance | null {
  const position = positions[index];
  if (!position) return null;

  const authored = planMoveTransition(position.fen, position.expectedMove);
  if (!authored) return null;

  const next = positions[index + 1];
  const reply = next ? planFenTransition(authored.afterFen, next.fen) : null;
  const settledFen = settleDisplayFen(authored.afterFen, reply?.afterFen ?? null, next?.fen ?? null);
  return {
    authored,
    reply,
    nextIndex: next ? index + 1 : null,
    settledFen,
    completed: !next,
  };
}

export type LinePreviewIntent =
  | { type: 'back' }
  | { type: 'practice' };

export type LinePreviewEntry = {
  course: Course;
  level: LevelKey;
  line: Variation;
  practiceAvailable: boolean;
  onIntent: (intent: LinePreviewIntent) => void;
};

type PreviewWindow = Pick<Window, 'addEventListener' | 'removeEventListener' | 'requestAnimationFrame' | 'cancelAnimationFrame' | 'setTimeout' | 'clearTimeout'>;
type PreviewEngine = Pick<EngineClient, 'status' | 'clearMemo' | 'evaluate' | 'reset' | 'warm'>;

/**
 * The Line Preview timing adapter keeps tempo policy and clock scheduling
 * behind one seam. Production supplies device preferences and browser clocks;
 * interface tests supply the same shape with controlled clocks.
 */
export type LinePreviewTiming = {
  loadMoveDuration: () => number;
  effectiveMoveDuration: (storedDuration: number, reducedMotion: boolean) => number;
  moveBeats: (storedDuration: number, teaching: boolean) => { beforeReply: number; afterReply: number };
  reducedMotion: () => boolean;
  window: PreviewWindow;
};

export type LinePreviewDependencies = {
  engine: PreviewEngine;
  topbarMarkup: (options: { back: { id: string; label: string } }) => string;
  renderBoard: (state: BoardState) => string;
  updateBoard: (board: Element, state: BoardState) => void;
  renderEvalBar: (score: EvalScore | null, status: EngineStatus) => string;
  updateEvalBar: (panel: Element, score: EvalScore | null, status: EngineStatus) => void;
  escapeHtml: (value: string) => string;
  levelNames: Record<LevelKey, string>;
  sideNames: Record<Course['side'], string>;
  timing: LinePreviewTiming;
};

export type LinePreviewDisposer = () => void;

export type LinePreviewController = {
  enter(entry: LinePreviewEntry): LinePreviewDisposer;
  dispose(): void;
};

type PreviewSession = {
  id: number;
  dispose: LinePreviewDisposer;
  disposed: boolean;
};

type PreviewEvaluation = {
  active: boolean;
  publish: ((score: EvalScore | null) => void) | null;
  settle: ((score: EvalScore | null) => void) | null;
};

function publishPreviewScore(evaluation: PreviewEvaluation, score: EvalScore): void {
  if (!evaluation.active) return;
  evaluation.publish?.(score);
}

function settlePreviewScore(evaluation: PreviewEvaluation, score: EvalScore | null): void {
  if (!evaluation.active) return;
  evaluation.settle?.(score);
  evaluation.active = false;
  evaluation.publish = null;
  evaluation.settle = null;
}

let activeLinePreviewDisposer: LinePreviewDisposer | null = null;

export function disposeActiveLinePreview(): void {
  const disposer = activeLinePreviewDisposer;
  activeLinePreviewDisposer = null;
  disposer?.();
}

function validateEntry(entry: LinePreviewEntry): PracticePosition[] {
  const lesson = entry.course.lessons[entry.level];
  const registeredLine = lesson?.variations.find((variation) => variation.id === entry.line.id);
  if (!lesson || registeredLine !== entry.line) {
    throw new Error('Line Preview content does not belong to the supplied Course and level.');
  }

  if (entry.line.positions.length === 0) {
    throw new Error('Line Preview content must contain at least one authored position.');
  }

  for (const [index, position] of entry.line.positions.entries()) {
    const authored = planMoveTransition(position.fen, position.expectedMove);
    if (!authored) {
      throw new Error(`Line Preview authored move ${index + 1} is not legal from its position.`);
    }
    const next = entry.line.positions[index + 1];
    if (next && !planFenTransition(authored.afterFen, next.fen)) {
      throw new Error(`Line Preview positions ${index + 1} and ${index + 2} do not have one connecting reply.`);
    }
  }

  return entry.line.positions;
}

/**
 * Constructs the progress-neutral Line Preview once for an application host.
 * Each entry supplies only canonical line data and a semantic intent handler.
 */
export function createLinePreview(host: HTMLElement, dependencies: LinePreviewDependencies): LinePreviewController {
  let nextSessionId = 0;
  let activeSession: PreviewSession | null = null;

  const enter = (entry: LinePreviewEntry): LinePreviewDisposer => {
    const positions = validateEntry(entry);
    disposeActiveLinePreview();
    const session: PreviewSession = { id: ++nextSessionId, disposed: false, dispose: () => undefined };
    activeSession = session;

    const { course, level, line } = entry;
    const selectableColor = course.side === 'white' ? 'w' : 'b';
    let index = 0;
    let busy = false;
    let displayFen: string | null = null;
    let animation: BoardAnimation | null = null;
    let boardEl: HTMLDivElement | null = null;
    let evalEl: HTMLElement | null = null;
    let evalScore: EvalScore | null = null;
    let evalFen: string | null = null;
    let evaluationToken = 0;
    let previewFocusId: string | null = null;
    const evaluations = new Set<PreviewEvaluation>();
    const pendingTimers = new Map<number, () => void>();
    const pendingFrames = new Map<number, () => void>();
    const moveDuration = dependencies.timing.loadMoveDuration();
    const document = host.ownerDocument;

    const isCurrent = () => !session.disposed && activeSession?.id === session.id;
    const dispose = () => {
      if (session.disposed) return;
      session.disposed = true;
      const ownsActiveSession = activeSession?.id === session.id;
      if (ownsActiveSession) activeSession = null;
      if (activeLinePreviewDisposer === dispose) activeLinePreviewDisposer = null;
      dependencies.timing.window.removeEventListener('keydown', onKey);
      previewMain.querySelector<HTMLButtonElement>('#preview-back')?.removeEventListener('click', onBack);
      previewCopy.removeEventListener('click', onPreviewClick);
      for (const [timer, resolve] of pendingTimers) {
        dependencies.timing.window.clearTimeout(timer);
        pendingTimers.delete(timer);
        resolve();
      }
      for (const [frame, resolve] of pendingFrames) {
        dependencies.timing.window.cancelAnimationFrame(frame);
        pendingFrames.delete(frame);
        resolve();
      }
      pendingTimers.clear();
      pendingFrames.clear();
      for (const evaluation of evaluations) {
        evaluation.active = false;
        evaluation.publish = null;
        evaluation.settle = null;
      }
      evaluations.clear();
      animation = null;
      busy = false;
      evaluationToken += 1;
      previewFocusId = null;
      boardEl = null;
      evalEl = null;
    };
    session.dispose = dispose;
    activeLinePreviewDisposer = dispose;

    const currentFen = () => displayFen ?? positions[Math.min(index, positions.length - 1)].fen;
    const isCompleted = () => index >= positions.length;
    const stillCurrent = (token: number, fen: string) => isCurrent() && token === evaluationToken && currentFen() === fen;

    host.innerHTML = `<main class="app-shell line-preview-page"><div class="line-preview-shell">${dependencies.topbarMarkup({ back: { id: 'preview-back', label: 'Browse' } })}<section class="line-preview-layout"><div class="line-preview-copy"></div><div class="board-panel"><div class="eval-host"></div><div class="board-frame"></div><div class="board-caption" aria-live="polite"><span data-preview-status></span><span data-preview-progress></span></div></div></section></div></main>`;
    const previewMain = host.querySelector<HTMLElement>('.line-preview-page')!;
    const previewCopy = previewMain.querySelector<HTMLElement>('.line-preview-copy')!;
    const panel = previewMain.querySelector<HTMLElement>('.board-panel')!;
    const evalHost = panel.querySelector<HTMLElement>('.eval-host')!;
    const frame = panel.querySelector<HTMLDivElement>('.board-frame')!;
    const captionStatus = panel.querySelector<HTMLElement>('[data-preview-status]')!;
    const captionProgress = panel.querySelector<HTMLElement>('[data-preview-progress]')!;

    const fragmentElement = <T extends Element>(markup: string): T => document.createRange().createContextualFragment(markup).firstElementChild as T;

    const drawPreview = () => {
      if (!isCurrent()) return;
      const activeElement = document.activeElement;
      if (activeElement instanceof HTMLElement && previewMain.contains(activeElement) && activeElement.id) {
        previewFocusId = activeElement.id;
      }
      const completed = isCompleted();
      const position = positions[Math.min(index, positions.length - 1)];
      const fen = currentFen();
      const chess = new Chess(animation?.plan.fromFen ?? fen);
      const guide = !busy && !completed ? { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) } : null;
      const moveList = positions.map((entryPosition, entryIndex) => `<li class="preview-move ${entryIndex === index ? 'is-current' : ''}"${entryIndex === index ? ' aria-current="step"' : ''}>${String(entryIndex + 1).padStart(2, '0')} ${dependencies.escapeHtml(entryPosition.expectedSan)}</li>`).join('');
      const boardState: BoardState = {
        chess,
        selected: null,
        side: course.side,
        guide,
        route: null,
        animation,
        dragging: false,
        settling: busy,
        interactive: false,
        selectableColor,
      };
      const status = busy ? 'Playing move' : completed ? 'Preview complete' : `${position.expectedSan} is the move`;
      const controls = completed
        ? `<button id="preview-prev" class="quiet-button"${index === 0 ? ' disabled' : ''}>Previous</button><button id="preview-restart">Restart Preview</button>`
        : `<button id="preview-prev" class="quiet-button"${index === 0 || busy ? ' disabled' : ''}>Previous</button><button id="preview-next"${busy ? ' disabled' : ''}>Next</button>`;
      const practice = entry.practiceAvailable && isTrainableVariation(line) ? '<button id="preview-practice" class="quiet-button">Practice This Line</button>' : '';
      const completeCopy = completed
        ? '<div class="preview-complete" role="status" aria-live="polite"><strong>Line Preview complete.</strong><span>You can restart the walkthrough or begin practice.</span></div>'
        : `<div class="preview-guide"><span class="explanation-mark">Current authored move</span><strong>${dependencies.escapeHtml(position.expectedSan)}</strong><p>${dependencies.escapeHtml(position.explanation)}</p></div>`;
      previewCopy.innerHTML = `<p class="eyebrow">Line Preview &middot; ${dependencies.escapeHtml(course.name)} &middot; ${dependencies.levelNames[level]}${completed ? '' : ` &middot; move ${index + 1} of ${positions.length}`}</p><span class="side-tag">${dependencies.sideNames[course.side]}</span><h1>${dependencies.escapeHtml(line.title)}</h1><p class="lede">${dependencies.escapeHtml(line.summary)}</p><article class="lesson-idea"><div><p class="eyebrow">Lesson idea</p><h2>Anchor: ${dependencies.escapeHtml(course.lessons[level].lessonIdea.anchorSan)}</h2><p>${dependencies.escapeHtml(course.lessons[level].lessonIdea.plan)}</p></div><dl><div><dt>Opponent trigger</dt><dd>${dependencies.escapeHtml(course.lessons[level].lessonIdea.opponentTrigger)}</dd></div><div><dt>Resulting plan</dt><dd>${dependencies.escapeHtml(course.lessons[level].lessonIdea.resultingPlan)}</dd></div></dl></article>${completeCopy}<ol class="preview-moves" aria-label="Authored move guide">${moveList}</ol><div class="preview-actions" aria-busy="${busy}">${controls}${practice}</div><p class="preview-note">Preview only. Nothing here changes your progress.</p>`;
      captionStatus.textContent = status;
      captionProgress.textContent = completed ? 'Complete' : `Move ${index + 1} of ${positions.length}`;

      if (!evalEl) evalEl = fragmentElement<HTMLElement>(dependencies.renderEvalBar(evalScore, dependencies.engine.status));
      if (!evalEl.parentElement) evalHost.append(evalEl);
      dependencies.updateEvalBar(panel, evalScore, dependencies.engine.status);
      evalEl = panel.querySelector<HTMLElement>('.eval-bar, .eval-note');
      if (!boardEl) boardEl = fragmentElement<HTMLDivElement>(dependencies.renderBoard(boardState));
      if (!boardEl.parentElement) frame.append(boardEl);
      dependencies.updateBoard(boardEl, boardState);

      if (!busy && previewFocusId) {
        const focusId = completed && previewFocusId === 'preview-next' ? 'preview-restart' : previewFocusId;
        previewMain.querySelector<HTMLElement>(`#${focusId}`)?.focus({ preventScroll: true });
        previewFocusId = null;
      }

      if (!busy && evalFen !== fen) {
        evalFen = fen;
        evalScore = null;
        const token = ++evaluationToken;
        const evaluation: PreviewEvaluation = { active: true, publish: null, settle: null };
        evaluations.add(evaluation);
        evaluation.publish = (score) => {
          if (!stillCurrent(token, fen)) return;
          dependencies.updateEvalBar(panel, score, dependencies.engine.status);
          evalEl = panel.querySelector<HTMLElement>('.eval-bar, .eval-note');
        };
        evaluation.settle = (score) => {
          if (!stillCurrent(token, fen)) return;
          if (score === null && dependencies.engine.status !== 'unavailable') return;
          evalScore = score;
          evaluation.publish?.(score);
        };
        void dependencies.engine.evaluate(
          fen,
          selectableColor,
          dependencies.timing.reducedMotion() ? undefined : (score) => publishPreviewScore(evaluation, score),
        ).then((score) => settlePreviewScore(evaluation, score));
      }
    };

    const nextFrame = () => new Promise<void>((resolve) => {
      const frame = dependencies.timing.window.requestAnimationFrame(() => {
        pendingFrames.delete(frame);
        resolve();
      });
      pendingFrames.set(frame, resolve);
    });
    const wait = (milliseconds: number) => {
      if (milliseconds <= 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const timer = dependencies.timing.window.setTimeout(() => {
          pendingTimers.delete(timer);
          resolve();
        }, milliseconds);
        pendingTimers.set(timer, resolve);
      });
    };

    const playPhase = async (plan: MoveTransition, duration: number) => {
      animation = { plan, arrived: false, duration };
      drawPreview();
      if (duration === 0) {
        animation = null;
        displayFen = plan.afterFen;
        drawPreview();
        return;
      }
      await nextFrame();
      if (!isCurrent()) return;
      animation.arrived = true;
      boardEl?.querySelectorAll<HTMLElement>('.animated-piece').forEach((piece) => piece.classList.add('is-arrived'));
      await wait(duration);
      if (!isCurrent()) return;
      animation = null;
      displayFen = plan.afterFen;
      drawPreview();
    };

    const advance = async () => {
      if (!isCurrent() || busy || isCompleted()) return;
      const plan = planLinePreviewAdvance(positions, index);
      if (!plan) return;
      busy = true;
      displayFen = null;
      evalFen = null;
      evalScore = null;
      evaluationToken += 1;
      drawPreview();
      const duration = dependencies.timing.effectiveMoveDuration(moveDuration, dependencies.timing.reducedMotion());
      const beats = dependencies.timing.moveBeats(moveDuration, false);
      await playPhase(plan.authored, duration);
      if (!isCurrent()) return;
      if (plan.reply) {
        await wait(beats.beforeReply);
        if (!isCurrent()) return;
        await playPhase(plan.reply, duration);
        if (!isCurrent()) return;
        await wait(beats.afterReply);
      }
      if (!isCurrent()) return;
      displayFen = plan.settledFen;
      index = plan.nextIndex ?? positions.length;
      animation = null;
      busy = false;
      drawPreview();
    };

    const emitIntent = (intent: LinePreviewIntent) => {
      if (!isCurrent()) return;
      dispose();
      entry.onIntent(intent);
    };

    const invalidatePositionEvaluation = () => {
      displayFen = null;
      evalFen = null;
      evalScore = null;
      evaluationToken += 1;
    };

    const onKey = (event: KeyboardEvent) => {
      if (!isCurrent() || !host.isConnected || event.defaultPrevented) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previewCopy.querySelector<HTMLButtonElement>('#preview-prev')?.click();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        previewCopy.querySelector<HTMLButtonElement>('#preview-next')?.click();
      }
    };

    const onBack = () => emitIntent({ type: 'back' });
    previewMain.querySelector<HTMLButtonElement>('#preview-back')?.addEventListener('click', onBack);
    const onPreviewClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const target = event.target.closest<HTMLButtonElement>('button');
      if (!target) return;
      if (target.id === 'preview-prev') {
        if (busy || index <= 0) return;
        index -= 1;
        invalidatePositionEvaluation();
        drawPreview();
      } else if (target.id === 'preview-next') {
        void advance();
      } else if (target.id === 'preview-restart') {
        if (busy) return;
        index = 0;
        invalidatePositionEvaluation();
        drawPreview();
      } else if (target.id === 'preview-practice') {
        emitIntent({ type: 'practice' });
      }
    };
    previewCopy.addEventListener('click', onPreviewClick);

    dependencies.timing.window.addEventListener('keydown', onKey);
    dependencies.engine.reset();
    dependencies.engine.warm();
    dependencies.engine.clearMemo();
    drawPreview();
    return dispose;
  };

  return {
    enter,
    dispose: () => activeSession?.dispose(),
  };
}
