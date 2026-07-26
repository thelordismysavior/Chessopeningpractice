import { Chess } from 'chess.js';
import './style.css';
import { isDragPastThreshold, resolveBoardDrop } from './board-input';
import { ATTRIBUTION_SOURCES, COURSES, LEVELS, coursesById, type Course, type LevelKey } from './courses';
import { shouldShowMoveGuide } from './guide-policy';
import { effectiveMoveDuration, loadMoveDuration, saveMoveDuration } from './move-settings';
import { pieceAppearance, pieceCode } from './piece-appearance';
import { LessonRunner, type RunnerFeedback, type RunnerSnapshot } from './lesson-runner';
import { diffProgress, loadProgress, resetAllProgress, saveProgress, type CourseProgress } from './progress';
import { duePositionIds } from './review-schedule';
import { signIn, signOutUser, watchUser } from './firebase';
import { routeArrowGeometry } from './route-arrow';
import { planFenTransition, planMoveTransition, settleDisplayFen, type MoveTransition } from './transition-plans';

const app = document.querySelector<HTMLDivElement>('#app')!;
const DRAG_THRESHOLD_PX = 6;
const TOUCH_LIFT_OFFSET_PX = -48;
const levelNames: Record<LevelKey, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const sideNames: Record<Course['side'], string> = { white: 'W / WHITE', black: 'B / BLACK' };
let signedInEmail: string | null = null;

function resetPageScroll(): void {
  window.scrollTo(0, 0);
}

function escapeHtml(value: string | null): string {
  return (value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function settingsDialogMarkup(duration: number, includeProgressReset = false): string {
  const reset = includeProgressReset
    ? `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course and start again from Beginner. Move duration stays unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" hidden><p>This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`
    : '';
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="settings-form"><p class="eyebrow">Device preference</p><h2 id="settings-title">Settings</h2><label for="move-duration">Move duration (ms)</label><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><p class="settings-help">Used for learner moves, opponent replies, captures, and castling.</p>${reset}<button value="close">Done</button></form></dialog>`;
}

function bindSettings(onChange: (duration: number) => void, resetProgress?: () => Promise<void>): void {
  const dialog = app.querySelector<HTMLDialogElement>('#settings-dialog');
  const button = app.querySelector<HTMLButtonElement>('#settings');
  const input = app.querySelector<HTMLInputElement>('#move-duration');
  if (!dialog || !button || !input) return;
  button.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
  });
  const update = () => {
    const duration = saveMoveDuration(input.value);
    input.value = String(duration);
    onChange(duration);
  };
  input.addEventListener('change', update);
  const showReset = app.querySelector<HTMLButtonElement>('#show-reset-progress');
  const confirmation = app.querySelector<HTMLElement>('#reset-progress-confirmation');
  const cancelReset = app.querySelector<HTMLButtonElement>('#cancel-reset-progress');
  const confirmReset = app.querySelector<HTMLButtonElement>('#confirm-reset-progress');
  const resetError = app.querySelector<HTMLElement>('#reset-progress-error');
  if (!resetProgress || !showReset || !confirmation || !cancelReset || !confirmReset || !resetError) return;

  showReset.addEventListener('click', () => {
    showReset.hidden = true;
    confirmation.hidden = false;
    confirmReset.focus();
  });
  cancelReset.addEventListener('click', () => {
    confirmation.hidden = true;
    showReset.hidden = false;
    resetError.hidden = true;
    showReset.focus();
  });
  confirmReset.addEventListener('click', async () => {
    cancelReset.disabled = true;
    confirmReset.disabled = true;
    resetError.hidden = true;
    try {
      await resetProgress();
      dialog.close();
      await renderDashboard(signedInEmail);
    } catch {
      resetError.hidden = false;
      cancelReset.disabled = false;
      confirmReset.disabled = false;
      confirmReset.focus();
    }
  });
}

function renderSignedOut(message = 'Private opening practice for one learner.') {
  resetPageScroll();
  app.innerHTML = `<main class="auth-page"><div class="brand-mark">CP</div><p class="eyebrow">A quieter way to learn openings</p><h1>Chess Practice</h1><p class="lede">${escapeHtml(message)}</p><button id="sign-in">Sign in with Google <span aria-hidden="true">-&gt;</span></button></main>`;
  document.querySelector('#sign-in')!.addEventListener('click', async () => {
    try {
      await signIn();
    } catch {
      renderSignedOut('Sign-in is unavailable right now. Check your connection and try again.');
    }
  });
}

function renderAuthError(message: string, retry: () => void) {
  resetPageScroll();
  app.innerHTML = `<main class="error-page"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
  document.querySelector('#retry-auth')!.addEventListener('click', retry);
}

function renderSources() {
  resetPageScroll();
  app.innerHTML = `<main class="app-shell"><header class="topbar"><button id="back-dashboard" class="back-button">&lt;- <span>Dashboard</span></button><div class="account"><span>${escapeHtml(signedInEmail) || 'owner'}</span><button id="sign-out" class="quiet-button">Sign out</button></div></header><section class="sources-page"><p class="eyebrow">Sources &amp; attribution</p><h1>Openings, with a paper trail.</h1><p class="lede">The courses are fixed, local content. These references document the opening metadata and research behind them.</p><div class="source-list">${ATTRIBUTION_SOURCES.map((source) => `<article class="source-item"><div><h2>${escapeHtml(source.name)}</h2><p>${escapeHtml(source.description)}</p></div><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">-&gt;</span></a></article>`).join('')}</div></section></main>`;
  document.querySelector('#back-dashboard')!.addEventListener('click', () => void renderDashboard(signedInEmail));
  document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
}

function levelButton(course: Course, level: LevelKey, progress: CourseProgress): string {
  const index = LEVELS.indexOf(level);
  const unlocked = index <= progress.unlockedLevel;
  const complete = progress.completedLevels.includes(level);
  const detail = complete ? 'Completed' : unlocked ? `${course.lessons[level].positions.length} positions - Start lesson` : `Complete ${levelNames[LEVELS[index - 1]]} first`;
  return `<button class="lesson-row ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-course="${course.id}" data-level="${level}"` : 'disabled'}><span class="lesson-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${levelNames[level]}</strong><small>${detail}</small></span><span class="lesson-arrow" aria-hidden="true">${complete ? '&#10003;' : unlocked ? '-&gt;' : '&#128274;'}</span></button>`;
}

function reviewIdsForLevel(course: Course, level: LevelKey, progress: CourseProgress): string[] {
  return duePositionIds(progress.positions, course.lessons[level].positions.map((position) => position.id));
}

function allReviewIdsFor(course: Course, progress: CourseProgress): string[] {
  return LEVELS.flatMap((level) => reviewIdsForLevel(course, level, progress));
}

async function renderDashboard(email: string | null) {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
  try {
    const progressEntries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(progressEntries) as Record<Course['id'], CourseProgress>;
    app.innerHTML = `<main class="app-shell"><header class="topbar"><a class="wordmark" href="#">Chess Practice<span>.</span></a><div class="account"><button id="sources" class="quiet-button">Sources</button><button id="settings" class="quiet-button">Settings</button><span>${escapeHtml(email) || 'owner'}</span><button id="sign-out" class="quiet-button">Sign out</button></div></header><section class="dashboard-intro"><div><p class="eyebrow">White + Black repertoire</p><h1>Make the first move<br><em>automatic.</em></h1><p class="lede">Four focused systems. Three levels each. Practice the line until it feels like your own.</p></div><div class="intro-note"><span>01</span><p>Choose a course below to continue your next available lesson.</p></div></section><section class="course-grid">${COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      const completed = progress.completedLevels.length;
      const nextLevel = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
      const reviewLevel = LEVELS.find((candidate) => reviewIdsForLevel(course, candidate, progress).length > 0);
      const reviewPositionIds = reviewLevel ? reviewIdsForLevel(course, reviewLevel, progress) : [];
      const nextCopy = completed === LEVELS.length ? 'All three lessons complete' : `Next up: <strong>${levelNames[nextLevel]}</strong>`;
      return `<article class="course-card"><div class="course-header"><div><span class="side-tag">${sideNames[course.side]}</span><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(course.description)}</p></div><span class="course-count">${String(completed).padStart(2, '0')} / 03</span></div><div class="core-line"><span>Core line - ${escapeHtml(course.eco)}</span><code>${escapeHtml(course.coreLine)}</code></div><div class="lesson-list">${LEVELS.map((level) => levelButton(course, level, progress)).join('')}</div><div class="course-footer"><span>${nextCopy}</span>${reviewLevel && reviewPositionIds.length ? `<button class="review-link" data-review-course="${course.id}" data-review-level="${reviewLevel}">Review ${reviewPositionIds.length} positions</button>` : '<span class="muted">Clean practice builds recall</span>'}</div></article>`;
    }).join('')}</section>${settingsDialogMarkup(loadMoveDuration(), true)}</main>`;
    const courseCards = app.querySelectorAll<HTMLElement>('.course-card');
    COURSES.forEach((course, index) => {
      const footer = courseCards[index]?.querySelector<HTMLElement>('.course-footer');
      if (!footer) return;
      const links = LEVELS.map((level) => {
        const ids = reviewIdsForLevel(course, level, progressByCourse[course.id]);
        return ids.length && !footer.querySelector(`[data-review-level="${level}"]`) ? `<button class="review-link" data-review-course="${course.id}" data-review-level="${level}">Review ${ids.length} ${levelNames[level]}</button>` : '';
      }).join('');
      if (links) footer.insertAdjacentHTML('beforeend', `<div class="review-links">${links}</div>`);
    });
    document.querySelector('#sources')!.addEventListener('click', renderSources);
    bindSettings(
      () => undefined,
      () => resetAllProgress(COURSES.map((course) => course.id)),
    );
    document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
    document.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void startPractice(course, button.dataset.level as LevelKey, progressByCourse[course.id]);
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-review-course]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.reviewCourse as Course['id']];
      const reviewLevel = button.dataset.reviewLevel as LevelKey;
      void startPractice(course, reviewLevel, progressByCourse[course.id], reviewIdsForLevel(course, reviewLevel, progressByCourse[course.id]));
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Firebase unavailable</p><h1>Your board is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    document.querySelector('#retry-dashboard')!.addEventListener('click', () => void renderDashboard(email));
  }
}

function squareName(row: number, column: number, side: Course['side']): string {
  const boardRow = side === 'black' ? 7 - row : row;
  const boardColumn = side === 'black' ? 7 - column : column;
  return `${String.fromCharCode(97 + boardColumn)}${8 - boardRow}`;
}

type SquareRoute = { from: string; to: string };
type BoardAnimation = { plan: MoveTransition; arrived: boolean; duration: number };

function squarePosition(square: string, side: Course['side']): { x: number; y: number } {
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]) - 1;
  return { x: side === 'black' ? 7 - file : file, y: side === 'black' ? rank : 7 - rank };
}

function markerPosition(square: string, side: Course['side']): string {
  const position = squarePosition(square, side);
  return `left:${(position.x + .5) * 12.5}%;top:${(position.y + .5) * 12.5}%;`;
}

function renderRoute(route: SquareRoute | null, side: Course['side'], className: string, markers = true): string {
  if (!route) return '';
  const from = squarePosition(route.from, side);
  const to = squarePosition(route.to, side);
  const geometry = routeArrowGeometry((from.x + .5) * 12.5, (from.y + .5) * 12.5, (to.x + .5) * 12.5, (to.y + .5) * 12.5);
  if (!geometry) return '';
  const headPercent = geometry.width > 0 ? Math.min(100, geometry.head / geometry.width * 100) : 0;
  const markerMarkup = markers
    ? `<span class="route-origin" style="${markerPosition(route.from, side)}"></span><span class="route-target" style="${markerPosition(route.to, side)}"></span>`
    : '';
  return `<div class="board-route ${className}" aria-hidden="true">${markerMarkup}<span class="route-arrow" style="left:${geometry.left}%;top:${geometry.top}%;width:${geometry.width}%;--route-head:${headPercent}%;transform:translateY(-50%) rotate(${geometry.angle}deg)"></span></div>`;
}

function renderBoard(chess: Chess, selected: string | null, side: Course['side'], guide: SquareRoute | null, route: SquareRoute | null, animation: BoardAnimation | null, dragging: boolean, disabled: boolean, selectableColor: 'w' | 'b'): string {
  const board = chess.board();
  const rows = side === 'black' ? board.slice().reverse().map((row) => row.slice().reverse()) : board;
  const hiddenPieces = new Set<string>(animation?.plan.pieces.map((piece) => piece.from));
  const squares = rows.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
    const square = squareName(rowIndex, columnIndex, side);
    const dark = (rowIndex + columnIndex) % 2 === 1;
    const selectedClass = selected === square ? 'is-selected' : '';
    const visiblePiece = hiddenPieces.has(square) ? null : piece;
    const appearance = visiblePiece ? pieceAppearance(pieceCode(visiblePiece.color, visiblePiece.type)) : null;
    const movable = !disabled && piece?.color === selectableColor;
    const fileLabel = rowIndex === 7 ? `<span class="coord-file" aria-hidden="true">${square[0]}</span>` : '';
    const rankLabel = columnIndex === 0 ? `<span class="coord-rank" aria-hidden="true">${square[1]}</span>` : '';
    const pieceMarkup = appearance
      ? `<span class="piece piece-side-${appearance.side}">${appearance.glyph}</span>`
      : '<span class="piece"></span>';
    return `<button type="button" class="board-square ${dark ? 'is-dark' : 'is-light'} ${selectedClass}${movable ? ' is-movable' : ''}" data-square="${square}" aria-pressed="${selected === square}" aria-label="${square}${visiblePiece ? `, ${visiblePiece.color === 'w' ? 'white' : 'black'} ${visiblePiece.type}` : ''}"${disabled ? ' disabled' : ''}>${fileLabel}${rankLabel}${pieceMarkup}</button>`;
  })).join('');
  const animatedPieces = animation ? animation.plan.pieces.map((piece) => {
    const from = squarePosition(piece.from, side);
    const to = squarePosition(piece.to, side);
    const appearance = pieceAppearance(piece.piece);
    return `<span class="animated-piece piece-side-${appearance.side} ${animation.arrived ? 'is-arrived' : ''}" style="--move-duration:${animation.duration}ms;--from-x:${from.x};--from-y:${from.y};--to-x:${to.x};--to-y:${to.y}">${appearance.glyph}</span>`;
  }).join('') : '';
  return `<div class="board ${dragging ? 'is-dragging' : ''}" role="group" aria-label="Chess board" aria-busy="${disabled}">${squares}${renderRoute(guide, side, 'guide-overlay', false)}<div class="piece-layer" aria-hidden="true">${animatedPieces}</div>${renderRoute(route, side, 'feedback-overlay')}</div>`;
}

async function startPractice(course: Course, level: LevelKey, progress: CourseProgress, reviewPositionIds: string[] = []) {
  resetPageScroll();
  const lesson = course.lessons[level];
  const session = new LessonRunner(lesson, progress, { reviewPositionIds });
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
  let focusedSquare: string | null = null;
  let completionFocusRequested = false;
  let leaving = false;
  const selectableColor = course.side === 'white' ? 'w' : 'b';
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];

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

  const draw = () => {
    const snapshot: RunnerSnapshot = session.snapshot;
    const lessonComplete = snapshot.lessonComplete && !sequenceActive;
    const completionMessage = saveError
      ? nextLevel ? `Save progress to unlock ${levelNames[nextLevel]}.` : 'Save progress before leaving the course.'
      : nextLevel ? `${levelNames[level]} complete. ${levelNames[nextLevel]} unlocked.` : `${levelNames[level]} complete. Course complete.`;
    const position = sequenceActive && sequencePosition ? sequencePosition : snapshot.position ?? lesson.positions[lesson.positions.length - 1];
    const chess = new Chess(animation?.plan.fromFen ?? displayFen ?? position.fen);
    const status = sequenceActive
      ? 'Playing move'
      : snapshot.status === 'complete'
        ? (snapshot.lessonComplete ? 'Lesson complete' : 'Review complete')
        : snapshot.status === 'retrying'
          ? 'Retry this position'
          : `${course.side === 'white' ? 'White' : 'Black'} to move`;
    const showGuide = !sequenceActive && shouldShowMoveGuide(snapshot.phase, snapshot.status, snapshot.hintVisible);
    const expectedRoute = showGuide ? { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) } : null;
    const moveCount = snapshot.positionCount || lesson.positions.length;
    const moveOrdinal = Math.min(snapshot.positionIndex + 1, moveCount);
    const copyHeader = session.reviewMode || !snapshot.lineTitle
      ? `<p class="eyebrow">${levelNames[level]} review - ${moveOrdinal} of ${moveCount}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lede">${escapeHtml(lesson.summary)}</p>`
      : `<p class="eyebrow">Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount} &middot; move ${moveOrdinal} of ${moveCount}</p><p class="line-title">${escapeHtml(snapshot.lineTitle)}</p><p class="lede">${escapeHtml(snapshot.lineSummary)}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lesson-summary">${escapeHtml(lesson.summary)}</p>`;
    const feedbackMarkup = lessonComplete
      ? `<div class="feedback feedback-complete" role="status" aria-live="polite"><strong>${completionMessage}</strong></div>`
      : feedback
        ? `<div class="feedback feedback-${feedback.kind}"><strong>${escapeHtml(feedback.message)}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${escapeHtml(feedback.expectedSan)}</span>` : ''}</div>`
        : `<p class="move-hint">Select a ${course.side} piece, then select its destination.</p>`;
    const actionMarkup = lessonComplete
      ? `<button id="proceed"${saveError ? ' disabled' : ''}>Proceed</button>`
      : snapshot.status === 'complete'
        ? '<button id="back-after-complete">Back to dashboard</button>'
        : '<button id="exit-practice" class="quiet-button">Exit lesson</button>';
    app.innerHTML = `<main class="practice-shell"><header class="topbar"><button id="back-dashboard" class="back-button">&lt;- <span>Dashboard</span></button><div class="practice-meta"><span class="side-tag">${sideNames[course.side]}</span><span>${escapeHtml(course.name)}</span></div><div class="account"><button id="settings" class="quiet-button">Settings</button><button id="practice-sign-out" class="quiet-button">Sign out</button></div></header>${saveError ? '<div class="save-alert" role="alert"><span>Progress could not be saved.</span><button id="retry-save">Retry save</button></div>' : ''}<div class="practice-layout"><section class="lesson-copy">${copyHeader}<div class="explanation"><span class="explanation-mark">Why</span><p>${escapeHtml(position.explanation)}</p></div>${feedbackMarkup}<div class="practice-actions">${actionMarkup}</div></section><section class="board-panel"><div class="board-frame">${renderBoard(chess, selected, course.side, expectedRoute, routeFlash, animation, dragging, busy, selectableColor)}</div><div class="board-caption"><span>${status}</span><span>${snapshot.lineCount ? `Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount}` : 'Review'}</span></div></section></div>${settingsDialogMarkup(moveDuration)}</main>`;    bindSettings((duration) => { moveDuration = duration; });
    if (!lessonComplete) completionFocusRequested = false;
    if (lessonComplete && !completionFocusRequested) {
      completionFocusRequested = true;
      window.requestAnimationFrame(() => app.querySelector<HTMLButtonElement>('#proceed')?.focus());
    } else if (focusedSquare && !busy) {
      window.requestAnimationFrame(() => app.querySelector<HTMLButtonElement>(`[data-square="${focusedSquare}"]`)?.focus());
    }
    document.querySelector('#back-dashboard')!.addEventListener('click', () => void leavePractice());
    document.querySelector('#practice-sign-out')!.addEventListener('click', () => void leavePractice(true));
    document.querySelector('#exit-practice')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#back-after-complete')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#proceed')?.addEventListener('click', () => void proceedAfterLesson());
    document.querySelector('#retry-save')?.addEventListener('click', () => void persist().then(draw).catch(() => { saveError = true; draw(); }));
    const board = app.querySelector<HTMLDivElement>('.board');
    if (!board) return;
    const displayedChess = chess;
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
    board.addEventListener('pointerdown', (event) => {
      if (busy || (event.pointerType === 'mouse' && event.button !== 0)) return;
      suppressClick = false;
      const button = (event.target as Element).closest<HTMLButtonElement>('[data-square]');
      const square = button?.dataset.square;
      if (!square || displayedChess.get(square as Parameters<Chess['get']>[0])?.color !== selectableColor) return;
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
    app.querySelectorAll<HTMLButtonElement>('[data-square]').forEach((button) => button.addEventListener('click', (event) => {
      const square = button.dataset.square!;
      focusedSquare = square;
      if (suppressClick) {
        suppressClick = false;
        event.preventDefault();
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
    }));
  };

  const wait = (milliseconds: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, milliseconds); });
  const nextFrame = () => new Promise<void>((resolve) => { window.requestAnimationFrame(() => resolve()); });

  const playPhase = async (plan: MoveTransition, duration: number) => {
    animation = { plan, arrived: false, duration };
    draw();
    if (duration === 0) {
      animation = null;
      displayFen = plan.afterFen;
      draw();
      return;
    }
    await nextFrame();
    if (leaving) return;
    animation.arrived = true;
    app.querySelectorAll<HTMLElement>('.animated-piece').forEach((piece) => piece.classList.add('is-arrived'));
    await wait(duration);
    if (leaving) return;
    animation = null;
    displayFen = plan.afterFen;
    draw();
  };

  const playSequence = async (learnerPlan: MoveTransition, replyPlan: MoveTransition | null, skipLearnerMotion = false) => {
    const duration = effectiveMoveDuration(moveDuration, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    await playPhase(learnerPlan, skipLearnerMotion ? 0 : duration);
    if (leaving) return;
    if (replyPlan) {
      await wait(250);
      if (leaving) return;
      await playPhase(replyPlan, duration);
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
    selected = null;
    draw();
  };

  function submitAttempt(move: string, options: { fromDrag?: boolean } = {}) {
    if (busy) return;
    const position = session.snapshot.position;
    if (!position) return;
    const result = session.submitMove(move);
    feedback = result;
    const attemptedRoute = { from: move.slice(0, 2), to: move.slice(2, 4) };
    if (result.kind === 'illegal' || result.kind === 'incorrect') {
      flashRoute(attemptedRoute);
      if (result.kind === 'incorrect') void persist().catch(() => { saveError = true; if (!leaving) draw(); });
      draw();
      return;
    }
    if (result.kind !== 'correct') {
      draw();
      return;
    }
    const learnerPlan = planMoveTransition(position.fen, move);
    const replyPlan = learnerPlan && result.snapshot.position ? planFenTransition(learnerPlan.afterFen, result.snapshot.position.fen) : null;
    if (!learnerPlan) {
      displayFen = result.snapshot.position?.fen ?? position.fen;
      void persist().catch(() => { saveError = true; if (!leaving) draw(); });
      draw();
      return;
    }
    sequencePosition = position;
    sequenceActive = true;
    busy = true;
    displayFen = null;
    void persist().catch(() => { saveError = true; if (!leaving) draw(); });
    void playSequence(learnerPlan, replyPlan, Boolean(options.fromDrag));
  }

  const proceedAfterLesson = async () => {
    if (leaving) return;
    leaving = true;
    const button = app.querySelector<HTMLButtonElement>('#proceed');
    if (button) {
      button.disabled = true;
      button.textContent = 'Saving...';
    }
    try {
      await pendingSave;
      if (nextLevel) await startPractice(course, nextLevel, liveProgress);
      else await renderDashboard(signedInEmail);
    } catch {
      leaving = false;
      saveError = true;
      draw();
    }
  };

  const leavePractice = async (signOut = false) => {
    leaving = true;
    try {
      await pendingSave;
      if (!saveError) {
        if (signOut) await signOutUser();
        else await renderDashboard(signedInEmail);
      }
    } catch {
      leaving = false;
      saveError = true;
      draw();
    }
  };

  draw();
}

function watchAuthentication() {
  watchUser((user) => {
    if (!user) return renderSignedOut();
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      void signOutUser();
      return renderSignedOut('This Google account is not approved.');
    }
    signedInEmail = user.email;
    void renderDashboard(user.email);
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

watchAuthentication();
