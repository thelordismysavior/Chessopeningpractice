import { Chess } from 'chess.js';
import { isDragPastThreshold, resolveBoardDrop, resolveTempoCut } from '../board-input';
import { coursesById, type Course, type LevelKey } from '../courses';
import { shouldShowMoveGuide, type PracticeMode } from '../guide-policy';
import { effectiveMoveDuration, loadMoveDuration, moveBeats } from '../move-settings';
import { pieceAppearance, pieceCode } from '../piece-appearance';
import { LessonRunner, type RunnerFeedback, type RunnerSnapshot } from '../lesson-runner';
import { courseMastery } from '../mastery';
import { diffProgress, loadProgress, saveProgress, type CourseProgress } from '../progress';
import { duePositionIds } from '../review-schedule';
import { saveResultSummary, type ResultSummary } from '../result';
import { planFenAnimation, planMoveAnimation, settleDisplayFen, type MoveAnimation } from '../move-animation';
import { renderBoard, renderEvalBar, updateBoard, updateEvalBar, type BoardAnimation, type BoardState, type SquareRoute } from '../board-view';
import { engine } from '../engine/engine-client';
import { centipawnLoss, costPhrase, type EvalScore } from '../engine/eval-scale';
import { app, backIcon, bindSettings, brandMarkup, escapeHtml, levelNames, resetPageScroll, settingsDialogMarkup, settingsIcon } from './shell';
import type { Navigate, PracticeScreen } from './navigation';

const DRAG_THRESHOLD_PX = 6;
const TOUCH_LIFT_OFFSET_PX = -48;

export async function startPractice(navigate: Navigate, email: string | null, options: PracticeScreen): Promise<void> {
  const { course, level, progress, variationId, reviewPositionIds = [], run, entryHandoff } = options;
  resetPageScroll();
  engine.reset();
  engine.warm();
  const lesson = course.lessons[level];
  const selectedVariationId = variationId ?? lesson.variations.find((variation) => variation.kind === 'core')?.id;
  const session = new LessonRunner(lesson, progress, { variationId: selectedVariationId, reviewPositionIds });
  const masteryBefore = courseMastery(course, progress);
  let selected: string | null = null;
  let feedback: RunnerFeedback | null = null;
  let savedProgress: CourseProgress = progress;
  let liveProgress = { ...progress };
  let saveError = false;
  let saveQueue: Promise<void> = Promise.resolve();
  let pendingSave: Promise<void> = Promise.resolve();
  let moveDuration = loadMoveDuration();
  let displayFen: string | null = null;
  let routeFlash: SquareRoute | null = null;
  let routeTimer: number | null = null;
  let animation: BoardAnimation | null = null;
  let sequencePosition = session.snapshot.position;
  let sequenceActive = false;
  let busy = false;
  let dragging = false;
  let suppressClick = false;
  let boardEl: HTMLDivElement | null = null;
  let evalEl: HTMLElement | null = null;
  let displayedChess = new Chess();
  let settledChess = displayedChess;
  let learnerAfterFen: string | null = null;
  let replyAfterFen: string | null = null;
  let cutRequested = false;
  let cutSquare: string | null = null;
  let releaseWait: (() => void) | null = null;
  let completionFocusRequested = false;
  let leaving = false;
  let handoff: { banked: string; next: string; verb?: string } | null = entryHandoff ?? null;
  let handoffTimer: number | null = entryHandoff
    ? window.setTimeout(() => { handoff = null; handoffTimer = null; if (!leaving) draw(); }, 1600)
    : null;
  let evalScore: EvalScore | null = null;
  let evalFen: string | null = null;
  let moveCost: string | null = null;
  let costGeneration = 0;
  let practiceMode: PracticeMode = session.reviewMode || session.snapshot.phase !== 'teach' ? 'drill' : 'learn';
  let assistedPositionKey: string | null = null;
  const selectableColor = course.side === 'white' ? 'w' : 'b';

  const persist = () => {
    const write = saveQueue.catch(() => undefined).then(async () => {
      const current = session.progressFor(level);
      const delta = diffProgress(savedProgress, current);
      await saveProgress(course.id, delta);
      savedProgress = current;
      liveProgress = current;
      saveError = false;
    });
    pendingSave = write;
    saveQueue = write.catch(() => undefined);
    return write;
  };

  const clearRouteFlash = () => {
    routeFlash = null;
    if (routeTimer !== null) window.clearTimeout(routeTimer);
    routeTimer = null;
  };

  const flashRoute = (route: SquareRoute) => {
    clearRouteFlash();
    routeFlash = route;
    routeTimer = window.setTimeout(() => {
      routeFlash = null;
      routeTimer = null;
      if (!leaving) draw();
    }, 600);
  };

  const showHandoff = (banked: string, next: string, verb = 'Banked') => {
    if (handoffTimer !== null) window.clearTimeout(handoffTimer);
    handoff = { banked, next, verb };
    handoffTimer = window.setTimeout(() => {
      handoff = null;
      handoffTimer = null;
      if (!leaving) draw();
    }, 1600);
  };

  const draw = () => {
    let snapshot: RunnerSnapshot = session.snapshot;
    const positionKey = snapshot.position ? `${snapshot.phase}:${snapshot.position.id}` : null;
    if (practiceMode === 'learn' && positionKey && snapshot.status !== 'complete' && assistedPositionKey !== positionKey) {
      session.requestHint();
      assistedPositionKey = positionKey;
      snapshot = session.snapshot;
    }
    const lessonComplete = snapshot.lessonComplete && !sequenceActive;
    const levelComplete = lessonComplete && session.progressFor(level).completedLevels.includes(level);
    const completionMessage = saveError
      ? 'Save progress before leaving the course.'
      : levelComplete
        ? `${levelNames[level]} complete.`
        : 'Line complete.';
    const position = sequenceActive && sequencePosition ? sequencePosition : snapshot.position ?? lesson.positions[lesson.positions.length - 1];
    const chess = new Chess(animation?.plan.fromFen ?? displayFen ?? position.fen);
    const status = sequenceActive
      ? 'Playing move'
      : snapshot.branchReview
        ? 'Branch review'
      : snapshot.status === 'complete'
        ? (snapshot.lessonComplete ? variationId ? 'Line complete' : 'Lesson complete' : 'Review complete')
        : snapshot.status === 'retrying'
          ? 'Retry this position'
          : `${course.side === 'white' ? 'White' : 'Black'} to move`;
    const showGuide = !sequenceActive && shouldShowMoveGuide(snapshot.phase, snapshot.status, snapshot.hintLevel, practiceMode);
    const expectedRoute = showGuide ? { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) } : null;
    const moveCount = snapshot.positionCount || lesson.positions.length;
    const moveOrdinal = Math.min(snapshot.positionIndex + 1, moveCount);
    const phaseLabel = snapshot.branchReview ? 'Branch review' : session.reviewMode ? 'Review' : snapshot.phase === 'teach' ? 'Learn the line' : 'Recall';
    const budgetMarkup = snapshot.mistakeBudget === null
      ? ''
      : `<p class="mistake-budget" aria-label="${snapshot.mistakes} of ${snapshot.mistakeBudget} mistakes used">${Array.from({ length: snapshot.mistakeBudget }, (_, slot) => `<span class="budget-slot ${slot < snapshot.mistakes ? 'is-spent' : ''}"></span>`).join('')}<small>${snapshot.mistakes} of ${snapshot.mistakeBudget} slips used</small></p>`;
    const metaHeader = `<p class="eyebrow">${snapshot.branchReview ? 'Branch review' : phaseLabel}</p>`;
    const progressHeader = snapshot.branchReview
      ? '<p class="eyebrow">Recognize the change</p>'
      : session.reviewMode || !snapshot.lineTitle
        ? `<p class="eyebrow">${run?.scope === 'course' ? `Course Review · ${escapeHtml(course.name)} · ` : ''}${levelNames[level]} review &middot; move ${moveOrdinal} of ${moveCount}</p>`
        : `<p class="eyebrow">Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount} &middot; move ${moveOrdinal} of ${moveCount}</p>`;
    const copyHeader = snapshot.branchReview
      ? `${progressHeader}<p class="line-title">${escapeHtml(snapshot.branchReview.variationTitle)}</p><h1>What is the resulting plan?</h1><p class="lesson-summary"><strong>Opponent trigger:</strong> ${escapeHtml(snapshot.branchReview.opponentTrigger)} <strong>Resulting plan:</strong> ${escapeHtml(snapshot.branchReview.resultingPlan)} Produce the move that starts it.</p>`
      : session.reviewMode || !snapshot.lineTitle
        ? `${progressHeader}<h1>${escapeHtml(lesson.title)}</h1><p class="lede">${escapeHtml(lesson.summary)}</p>`
        : `${progressHeader}<p class="line-title">${escapeHtml(snapshot.lineTitle)}</p><p class="lede">${escapeHtml(snapshot.lineSummary)}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lesson-summary">${escapeHtml(lesson.summary)}</p>${budgetMarkup}`;
    const handoffMarkup = handoff
      ? `<div class="line-handoff" role="status" aria-live="polite"><strong>${escapeHtml(handoff.verb ?? 'Banked')}: ${escapeHtml(handoff.banked)}</strong><span>Next up: ${escapeHtml(handoff.next)}</span></div>`
      : '';
    const feedbackMarkup = lessonComplete
      ? (() => {
          const summary = session.summary();
          const masteryAfter = courseMastery(course, session.progressFor(level));
          const minutes = Math.max(1, Math.round(summary.elapsedMs / 60000));
          const missedMarkup = summary.missed.length
            ? `<ul class="summary-missed">${summary.missed.map((entry) => `<li><strong>${escapeHtml(entry.expectedSan)}</strong><span>${escapeHtml(entry.lineTitle)}</span></li>`).join('')}</ul>`
            : '<p class="summary-clean">Nothing missed. Nothing queued for review.</p>';
          return `<div class="summary-panel" role="status" aria-live="polite"><strong>${escapeHtml(completionMessage)}</strong><dl class="summary-stats"><div><dt>Lines banked</dt><dd>${summary.bankedLines.length}</dd></div><div><dt>Hints used</dt><dd>${summary.hints}</dd></div><div><dt>Time</dt><dd>${minutes} min</dd></div><div><dt>Course mastery</dt><dd>${Math.round(masteryBefore.ratio * 100)}% &rarr; ${Math.round(masteryAfter.ratio * 100)}%</dd></div></dl><h2 class="summary-heading">To review</h2>${missedMarkup}</div>`;
        })()
      : feedback
        ? `<div class="feedback feedback-${feedback.kind}" role="status" aria-live="polite"><strong>${escapeHtml(feedback.message)}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${escapeHtml(feedback.expectedSan)}</span>${moveCost ? `<details class="engine-note"><summary>Engine</summary><span class="move-cost">${escapeHtml(moveCost)}</span></details>` : ''}` : ''}</div>`
        : `<p class="move-hint">${snapshot.phase === 'teach' ? 'Follow the arrow to learn the line.' : `Select a ${course.side} piece, then select its destination.`}</p>`;
    const dueAfterLesson = lessonComplete
      ? [...new Set([
          ...duePositionIds(session.progressFor(level).positions, lesson.positions.map((entry) => entry.id)),
          ...session.summary().missed.map((entry) => entry.positionId),
        ])]
      : [];
    const reviewNowMarkup = dueAfterLesson.length
      ? `<button id="review-now" class="quiet-button">Review ${dueAfterLesson.length} position${dueAfterLesson.length === 1 ? '' : 's'}</button>`
      : '';
    const canHint = !sequenceActive && snapshot.status !== 'complete' && snapshot.phase !== 'teach' && snapshot.hintLevel < 3;
    const hintText = snapshot.hintLevel === 1
      ? `<p class="hint-copy"><strong>Plan:</strong> ${escapeHtml(lesson.lessonIdea.plan)}</p>`
      : snapshot.hintLevel === 2
        ? `<p class="hint-copy"><strong>Destination:</strong> ${escapeHtml(position.expectedMove.slice(2, 4))}</p>`
        : snapshot.hintLevel >= 3
          ? `<p class="hint-copy"><strong>Move:</strong> ${escapeHtml(position.expectedSan)} (${escapeHtml(position.expectedMove)})</p>`
          : '';
    const hintMarkup = hintText || canHint ? `<div class="hint-region" aria-live="polite">${hintText}${canHint ? `<button id="show-hint" class="quiet-button">${snapshot.hintLevel ? 'Show more' : 'Show me'}</button>` : ''}</div>` : '';
    const nextGroup = run ? run.groups[run.index + 1] : undefined;
    const nextGroupLabel = nextGroup ? `${coursesById[nextGroup.courseId].name}, ${levelNames[nextGroup.level]}` : '';
    const actionMarkup = lessonComplete
      ? `<button id="proceed"${saveError ? ' disabled' : ''}>Proceed</button>${reviewNowMarkup}`
      : snapshot.status === 'complete'
        ? nextGroup
          ? `<button id="next-group">Next: ${escapeHtml(nextGroupLabel)}</button>`
          : run
            ? run.scope === 'course'
              ? `<button id="back-to-course">Back to ${escapeHtml(course.name)}</button>`
              : '<button id="back-to-queue">Back to review queue</button>'
            : `<button id="back-after-complete">Back to ${escapeHtml(course.name)}</button>`
        : `${hintMarkup}<button id="exit-practice" class="quiet-button">Exit lesson</button>`;
    displayedChess = chess;
    settledChess = new Chess(sequenceActive
      ? settleDisplayFen(learnerAfterFen ?? position.fen, replyAfterFen, session.snapshot.position?.fen ?? null)
      : chess.fen());
    const settledFen = sequenceActive || animation ? null : chess.fen();
    if (settledFen && settledFen !== evalFen) evalScore = null;
    const boardState: BoardState = { chess, selected, side: course.side, guide: expectedRoute, hintSquare: snapshot.hintLevel === 2 ? position.expectedMove.slice(2, 4) : null, route: routeFlash, animation, dragging, settling: sequenceActive, interactive: !busy || sequenceActive, selectableColor };
    const modeMarkup = `<div class="mode-switch" role="tablist" aria-label="Practice Mode"><button type="button" role="tab" data-practice-mode="learn" aria-selected="${practiceMode === 'learn'}">Learn</button><button type="button" role="tab" data-practice-mode="drill" aria-selected="${practiceMode === 'drill'}">Drill</button></div>`;
    const nextMain = document.createRange().createContextualFragment(`<main class="practice-shell shell"><header class="topbar has-back practice-appbar"><div class="topbar-start"><button id="back-dashboard" class="back-button icon-button" aria-label="${escapeHtml(course.name)}">${backIcon}</button></div><a class="wordmark" href="#/home">${brandMarkup()}</a><div class="topbar-end"><button id="settings" class="icon-button" type="button" aria-label="Settings">${settingsIcon}</button></div></header>${saveError ? '<div class="save-alert" role="alert"><span>Progress could not be saved.</span><button id="retry-save">Retry save</button></div>' : ''}<div class="practice-layout"><div class="practice-board-column"><section class="practice-meta">${metaHeader}</section>${modeMarkup}<section class="board-panel"><div class="eval-host"></div><div class="board-frame"></div><div class="board-caption" aria-live="polite"><span>${status}</span><span>${snapshot.lineCount ? `Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount}` : 'Review'}</span></div></section></div><div class="practice-copy-column"><section class="lesson-copy">${copyHeader}</section><section class="practice-details"><div class="explanation"><span class="explanation-mark">Why this move</span><p>${escapeHtml(position.explanation)}</p></div>${handoffMarkup}${feedbackMarkup}<div class="practice-actions">${actionMarkup}</div></section></div></div>${settingsDialogMarkup(moveDuration)}</main>`).firstElementChild!;
    if (practiceMode === 'drill' && feedback?.kind !== 'incorrect') nextMain.querySelector('.explanation')?.remove();
    app.append(nextMain);
    const panel = nextMain.querySelector<HTMLElement>('.board-panel');
    const evalHost = nextMain.querySelector<HTMLElement>('.eval-host');
    if (panel && evalHost) {
      if (!evalEl) {
        evalEl = document.createRange().createContextualFragment(renderEvalBar(evalScore, engine.status)).firstElementChild as HTMLElement;
      }
      evalHost.append(evalEl);
      updateEvalBar(panel, evalScore, engine.status);
      evalEl = panel.querySelector<HTMLElement>('.eval-bar, .eval-note');
    }
    const frame = nextMain.querySelector<HTMLDivElement>('.board-frame');
    if (frame) {
      if (!boardEl) {
        const fragment = document.createRange().createContextualFragment(renderBoard(boardState));
        boardEl = fragment.firstElementChild as HTMLDivElement;
      }
      const focused = boardEl.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
      frame.appendChild(boardEl);
      if (focused && document.activeElement !== focused) focused.focus({ preventScroll: true });
      updateBoard(boardEl, boardState);
    }
    Array.from(app.children).forEach((child) => {
      if (child !== nextMain) child.remove();
    });
    bindSettings((duration) => { moveDuration = duration; });
    if (!lessonComplete) completionFocusRequested = false;
    if (lessonComplete && !completionFocusRequested) {
      completionFocusRequested = true;
      window.requestAnimationFrame(() => app.querySelector<HTMLButtonElement>('#proceed')?.focus());
    }
    if (settledFen && settledFen !== evalFen) {
      evalFen = settledFen;
      const paint = (score: EvalScore | null) => {
        if (leaving || evalFen !== settledFen) return;
        const panel = app.querySelector('.board-panel');
        if (panel) updateEvalBar(panel, score, engine.status);
      };
      const streaming = moveBeats(moveDuration, false).beforeReply > 0
        && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      void engine.evaluate(settledFen, selectableColor, streaming ? paint : undefined).then((score) => {
        if (leaving || evalFen !== settledFen) return;
        if (score === null && engine.status !== 'unavailable') return;
        evalScore = score;
        paint(score);
      });
    }

    document.querySelector('#back-dashboard')!.addEventListener('click', () => void leavePractice());
    app.querySelectorAll<HTMLButtonElement>('[data-practice-mode]').forEach((button) => button.addEventListener('click', () => {
      practiceMode = button.dataset.practiceMode === 'drill' ? 'drill' : 'learn';
      if (practiceMode === 'drill') assistedPositionKey = null;
      draw();
    }));
    document.querySelector('#exit-practice')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#back-after-complete')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#back-to-course')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#back-to-queue')?.addEventListener('click', () => void (async () => {
      leaving = true;
      if (handoffTimer !== null) window.clearTimeout(handoffTimer);
      try {
        await pendingSave;
        await navigate({ name: 'review-queue' });
      } catch {
        leaving = false;
        saveError = true;
        draw();
      }
    })());
    document.querySelector('#next-group')?.addEventListener('click', () => void (async () => {
      if (!run || !nextGroup || leaving) return;
      leaving = true;
      if (handoffTimer !== null) window.clearTimeout(handoffTimer);
      const button = app.querySelector<HTMLButtonElement>('#next-group');
      if (button) {
        button.disabled = true;
        button.textContent = 'Saving...';
      }
      try {
        await pendingSave;
        const nextCourse = coursesById[nextGroup.courseId];
        const nextProgress = await loadProgress(nextCourse.id);
        await navigate({
          name: 'practice',
          course: nextCourse,
          level: nextGroup.level,
          progress: nextProgress,
          reviewPositionIds: nextGroup.positionIds,
          run: { groups: run.groups, index: run.index + 1, scope: run.scope },
          entryHandoff: { banked: `${course.name}, ${levelNames[level]}`, next: nextGroupLabel, verb: 'Reviewed' },
        });
      } catch {
        leaving = false;
        saveError = true;
        draw();
      }
    })());
    document.querySelector('#proceed')?.addEventListener('click', () => void proceedAfterLesson());
    document.querySelector('#review-now')?.addEventListener('click', () => void (async () => {
      if (leaving) return;
      leaving = true;
      if (handoffTimer !== null) window.clearTimeout(handoffTimer);
      try {
        await pendingSave;
        await navigate({ name: 'practice', course, level, progress: liveProgress, reviewPositionIds: dueAfterLesson });
      } catch {
        leaving = false;
        saveError = true;
        draw();
      }
    })());
    document.querySelector('#show-hint')?.addEventListener('click', () => { session.requestHint(); draw(); });
    document.querySelector('#retry-save')?.addEventListener('click', () => void persist().then(draw).catch(() => { saveError = true; draw(); }));
    const board = boardEl;
    if (!board) return;
    const squareAtPoint = (event: PointerEvent): string | null => {
      const element = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('[data-square]');
      return element?.dataset.square ?? null;
    };
    let pointerOrigin: string | null = null;
    let pointerId: number | null = null;
    let pointerMoved = false;
    let pressX = 0;
    let pressY = 0;
    let liftEl: HTMLElement | null = null;
    const clearLift = () => {
      liftEl?.remove();
      liftEl = null;
    };
    const positionLift = (event: PointerEvent) => {
      if (!liftEl) return;
      const offsetY = event.pointerType === 'touch' ? TOUCH_LIFT_OFFSET_PX : 0;
      liftEl.style.transform = `translate(${event.clientX}px, ${event.clientY + offsetY}px) translate(-50%, -50%) scale(1.18)`;
    };
    if (board.dataset.listenersBound) return;
    board.dataset.listenersBound = 'true';
    board.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      suppressClick = false;
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-square]');
      const square = button?.dataset.square;
      if (!square) return;
      const settledPiece = settledChess.get(square as Parameters<Chess['get']>[0]) ?? null;
      if (!leaving && resolveTempoCut(sequenceActive, settledPiece?.color ?? null, selectableColor) === 'cut') {
        suppressClick = true;
        cutRequested = true;
        cutSquare = square;
        releaseWait?.();
        return;
      }
      if (busy || displayedChess.get(square as Parameters<Chess['get']>[0])?.color !== selectableColor) return;
      pointerOrigin = square;
      pointerId = event.pointerId;
      pointerMoved = false;
      pressX = event.clientX;
      pressY = event.clientY;
    });
    board.addEventListener('pointermove', (event) => {
      if (pointerId !== event.pointerId || !pointerOrigin) return;
      if (pointerMoved) {
        positionLift(event);
        return;
      }
      if (!isDragPastThreshold(pressX, pressY, event.clientX, event.clientY, DRAG_THRESHOLD_PX)) return;
      const originButton = app.querySelector<HTMLButtonElement>(`[data-square="${pointerOrigin}"]`);
      const boardPiece = displayedChess.get(pointerOrigin as Parameters<Chess['get']>[0]);
      if (!originButton || !boardPiece) return;
      board.setPointerCapture(event.pointerId);
      pointerMoved = true;
      selected = pointerOrigin;
      dragging = true;
      originButton.classList.add('is-selected', 'is-vacated');
      board.classList.add('is-dragging');
      const appearance = pieceAppearance(pieceCode(boardPiece.color, boardPiece.type));
      liftEl = document.createElement('span');
      liftEl.className = `drag-lift piece-side-${appearance.side}`;
      liftEl.setAttribute('aria-hidden', 'true');
      liftEl.textContent = appearance.glyph;
      liftEl.style.fontSize = getComputedStyle(originButton).fontSize;
      app.appendChild(liftEl);
      positionLift(event);
    });
    const finishPointer = (event: PointerEvent, canceled = false) => {
      if (pointerId !== event.pointerId || !pointerOrigin) return;
      if (board.hasPointerCapture(event.pointerId)) board.releasePointerCapture(event.pointerId);
      const origin = pointerOrigin;
      const moved = pointerMoved;
      pointerOrigin = null;
      pointerId = null;
      pointerMoved = false;
      dragging = false;
      clearLift();
      board.classList.remove('is-dragging');
      board.querySelector(`[data-square="${origin}"]`)?.classList.remove('is-vacated');
      if (!moved) return;
      suppressClick = !canceled;
      const target = canceled ? null : squareAtPoint(event);
      const move = resolveBoardDrop(origin, target, moved, busy);
      if (!move) {
        selected = null;
        draw();
        return;
      }
      const targetPiece = displayedChess.get(target as Parameters<Chess['get']>[0]);
      if (targetPiece?.color === selectableColor) {
        selected = target;
        draw();
        return;
      }
      submitAttempt(move, { fromDrag: true });
    };
    board.addEventListener('pointerup', (event) => finishPointer(event));
    board.addEventListener('pointercancel', (event) => finishPointer(event, true));
    board.addEventListener('click', (event) => {
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-square]');
      if (!button) return;
      const square = button.dataset.square!;
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
        return;
      }
      const settledPiece = settledChess.get(square as Parameters<Chess['get']>[0]) ?? null;
      if (!leaving && resolveTempoCut(sequenceActive, settledPiece?.color ?? null, selectableColor) === 'cut') {
        cutRequested = true;
        cutSquare = square;
        releaseWait?.();
        return;
      }
      if (busy) return;
      const boardPiece = displayedChess.get(square as Parameters<Chess['get']>[0]);
      if (!selected) {
        if (boardPiece?.color === selectableColor) selected = square;
        draw();
        return;
      }
      if (selected === square) {
        selected = null;
        draw();
        return;
      }
      if (boardPiece?.color === selectableColor) {
        selected = square;
        draw();
        return;
      }
      const move = `${selected}${square}`;
      selected = null;
      submitAttempt(move);
    });
  };

  const wait = (milliseconds: number) => new Promise<void>((resolve) => {
    if (cutRequested) { resolve(); return; }
    const timer = window.setTimeout(() => { releaseWait = null; resolve(); }, milliseconds);
    releaseWait = () => { window.clearTimeout(timer); releaseWait = null; resolve(); };
  });
  const nextFrame = () => new Promise<void>((resolve) => { window.requestAnimationFrame(() => resolve()); });

  const playPhase = async (plan: MoveAnimation, duration: number) => {
    animation = { plan, arrived: false, duration };
    draw();
    if (duration === 0) {
      animation = null;
      displayFen = plan.afterFen;
      draw();
      return;
    }
    await nextFrame();
    if (leaving || cutRequested) return;
    animation.arrived = true;
    app.querySelectorAll<HTMLElement>('.animated-piece').forEach((piece) => piece.classList.add('is-arrived'));
    await wait(duration);
    if (leaving || cutRequested) return;
    animation = null;
    displayFen = plan.afterFen;
    draw();
  };

  const playSequence = async (learnerPlan: MoveAnimation, replyPlan: MoveAnimation | null, skipLearnerMotion = false) => {
    const duration = effectiveMoveDuration(moveDuration, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const beats = moveBeats(moveDuration, session.snapshot.phase === 'teach');
    await playPhase(learnerPlan, skipLearnerMotion ? 0 : duration);
    if (leaving) return;
    if (replyPlan && !cutRequested) {
      await wait(beats.beforeReply);
      if (leaving) return;
      if (!cutRequested) {
        await playPhase(replyPlan, duration);
        if (leaving) return;
      }
      if (!cutRequested) await wait(beats.afterReply);
    }
    if (leaving) return;
    animation = null;
    displayFen = settleDisplayFen(
      learnerPlan.afterFen,
      replyPlan?.afterFen ?? null,
      session.snapshot.position?.fen ?? null,
    );
    sequenceActive = false;
    busy = false;
    selected = cutSquare;
    cutSquare = null;
    cutRequested = false;
    draw();
  };


  const explainCost = async (generation: number, fen: string, playedMove: string, expectedMove: string, expectedSan: string) => {
    const playedPlan = planMoveAnimation(fen, playedMove);
    const expectedPlan = planMoveAnimation(fen, expectedMove);
    if (!playedPlan || !expectedPlan) return;
    const playedScore = await engine.evaluate(playedPlan.afterFen, selectableColor);
    if (leaving || generation !== costGeneration || !playedScore) return;
    const expectedScore = await engine.evaluate(expectedPlan.afterFen, selectableColor);
    if (leaving || generation !== costGeneration || !expectedScore) return;
    const playedSan = new Chess(fen).move({ from: playedMove.slice(0, 2), to: playedMove.slice(2, 4), promotion: 'q' }).san;
    moveCost = costPhrase(playedSan, expectedSan, centipawnLoss(expectedScore, playedScore));
    draw();
  };

  function submitAttempt(move: string, options: { fromDrag?: boolean } = {}) {
    if (busy) return;
    const before = session.snapshot;
    const position = before.position;
    if (!position) return;
    const generation = ++costGeneration;
    const result = session.submitMove(move);
    feedback = result;
    const after = session.snapshot;
    if (before.lineId && after.lineId && before.lineId !== after.lineId && before.lineTitle && after.lineTitle) {
      showHandoff(before.lineTitle, after.lineTitle);
    }
    const attemptedRoute = { from: move.slice(0, 2), to: move.slice(2, 4) };
    moveCost = null;
    if (result.kind === 'illegal' || result.kind === 'incorrect') {
      flashRoute(attemptedRoute);
      if (result.kind === 'incorrect') {
        void persist().catch(() => { saveError = true; if (!leaving) draw(); });
        void explainCost(generation, position.fen, move, position.expectedMove, position.expectedSan);
      }
      draw();
      return;
    }
    if (result.kind !== 'correct') {
      draw();
      return;
    }
    const learnerPlan = planMoveAnimation(position.fen, move);
    const replyPlan = learnerPlan && result.snapshot.position ? planFenAnimation(learnerPlan.afterFen, result.snapshot.position.fen) : null;
    if (!learnerPlan) {
      displayFen = result.snapshot.position?.fen ?? position.fen;
      void persist().catch(() => { saveError = true; if (!leaving) draw(); });
      draw();
      return;
    }
    sequencePosition = position;
    learnerAfterFen = learnerPlan.afterFen;
    replyAfterFen = replyPlan?.afterFen ?? null;
    sequenceActive = true;
    busy = true;
    displayFen = null;
    cutRequested = false;
    void persist().catch(() => { saveError = true; if (!leaving) draw(); });
    void playSequence(learnerPlan, replyPlan, Boolean(options.fromDrag));
  }

  const proceedAfterLesson = async () => {
    if (leaving) return;
    leaving = true;
    if (handoffTimer !== null) window.clearTimeout(handoffTimer);
    const button = app.querySelector<HTMLButtonElement>('#proceed');
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }
    try {
      await pendingSave;
      const completedSummary = session.summary();
      const resultSummary: ResultSummary = {
        courseId: course.id,
        level,
        lineId: variationId ?? completedSummary.bankedLines[0]?.id ?? '',
        lineTitle: completedSummary.bankedLines[0]?.title ?? lesson.title,
        lineState: session.reviewMode ? 'reviewed' : 'banked',
        settledScore: evalScore,
        mistakes: completedSummary.missed.length,
        hints: completedSummary.hints,
        elapsedMs: completedSummary.elapsedMs,
        missed: completedSummary.missed,
        authoredCorrection: completedSummary.branch?.position.explanation ?? lesson.positions.at(-1)?.explanation ?? lesson.summary,
        branch: completedSummary.branch
          ? {
              variationId: completedSummary.branch.variationId,
              variationTitle: completedSummary.branch.variationTitle,
              positionId: completedSummary.branch.position.id,
              expectedSan: completedSummary.branch.position.expectedSan,
              opponentTrigger: completedSummary.branch.opponentTrigger,
              resultingPlan: completedSummary.branch.resultingPlan,
              explanation: completedSummary.branch.position.explanation,
            }
          : null,
      };
      saveResultSummary(resultSummary);
      await navigate({ name: 'result', summary: resultSummary });
    } catch {
      leaving = false;
      saveError = true;
      draw();
    }
  };

  const leavePractice = async () => {
    leaving = true;
    if (handoffTimer !== null) window.clearTimeout(handoffTimer);
    try {
      await pendingSave;
      if (!saveError) {
        await navigate({ name: 'course', course, progress: liveProgress });
      }
    } catch {
      leaving = false;
      saveError = true;
      draw();
    }
  };

  draw();
}
