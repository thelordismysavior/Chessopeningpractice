import { Chess } from 'chess.js';
import './style.css';
import { ATTRIBUTION_SOURCES, COURSES, LEVELS, coursesById, type Course, type LevelKey } from './courses';
import { createPracticeSession, type MoveFeedback, type SessionSnapshot } from './practice-session';
import { loadProgress, saveProgress, type CourseProgress } from './progress';
import { applySessionProgress } from './progress-state';
import { signIn, signOutUser, watchUser } from './firebase';

const app = document.querySelector<HTMLDivElement>('#app')!;
const pieceSymbols: Record<string, string> = {
  wK: '\u2654', wQ: '\u2655', wR: '\u2656', wB: '\u2657', wN: '\u2658', wP: '\u2659',
  bK: '\u265A', bQ: '\u265B', bR: '\u265C', bB: '\u265D', bN: '\u265E', bP: '\u265F',
};
const levelNames: Record<LevelKey, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
const sideNames: Record<Course['side'], string> = { white: 'W / WHITE', black: 'B / BLACK' };
let signedInEmail: string | null = null;

function escapeHtml(value: string | null): string {
  return (value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function renderSignedOut(message = 'Private opening practice for one learner.') {
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
  app.innerHTML = `<main class="error-page"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
  document.querySelector('#retry-auth')!.addEventListener('click', retry);
}

function renderSources() {
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

function reviewIds(progress: CourseProgress): string[] {
  const missed = progress.missedPositionIds;
  const completed = progress.completedPositionIds.filter((id) => !missed.includes(id));
  return Array.from({ length: Math.max(missed.length, completed.length) }, (_, index) => [missed[index], completed[index]]).flat().filter((id): id is string => Boolean(id));
}

function reviewIdsForLevel(course: Course, level: LevelKey, progress: CourseProgress): string[] {
  const positionIds = new Set(course.lessons[level].positions.map((position) => position.id));
  return reviewIds(progress).filter((id) => positionIds.has(id));
}

async function renderDashboard(email: string | null) {
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
  try {
    const progressEntries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(progressEntries) as Record<Course['id'], CourseProgress>;
    app.innerHTML = `<main class="app-shell"><header class="topbar"><a class="wordmark" href="#">Chess Practice<span>.</span></a><div class="account"><button id="sources" class="quiet-button">Sources</button><span>${escapeHtml(email) || 'owner'}</span><button id="sign-out" class="quiet-button">Sign out</button></div></header><section class="dashboard-intro"><div><p class="eyebrow">White + Black repertoire</p><h1>Make the first move<br><em>automatic.</em></h1><p class="lede">Four focused systems. Three levels each. Practice the line until it feels like your own.</p></div><div class="intro-note"><span>01</span><p>Choose a course below to continue your next available lesson.</p></div></section><section class="course-grid">${COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      const completed = progress.completedLevels.length;
      const nextLevel = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
      const allReviewIds = reviewIds(progress);
      const reviewLevel = LEVELS.find((candidate) => allReviewIds.some((id) => course.lessons[candidate].positions.some((position) => position.id === id)));
      const reviewPositionIds = reviewLevel ? reviewIdsForLevel(course, reviewLevel, progress) : [];
      const nextCopy = completed === LEVELS.length ? 'All three lessons complete' : `Next up: <strong>${levelNames[nextLevel]}</strong>`;
      return `<article class="course-card"><div class="course-header"><div><span class="side-tag">${sideNames[course.side]}</span><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(course.description)}</p></div><span class="course-count">${String(completed).padStart(2, '0')} / 03</span></div><div class="core-line"><span>Core line - ${escapeHtml(course.eco)}</span><code>${escapeHtml(course.coreLine)}</code></div><div class="lesson-list">${LEVELS.map((level) => levelButton(course, level, progress)).join('')}</div><div class="course-footer"><span>${nextCopy}</span>${reviewLevel && reviewPositionIds.length ? `<button class="review-link" data-review-course="${course.id}" data-review-level="${reviewLevel}">Review ${reviewPositionIds.length} positions</button>` : '<span class="muted">Clean practice builds recall</span>'}</div></article>`;
    }).join('')}</section></main>`;
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

function renderBoard(chess: Chess, selected: string | null, side: Course['side']): string {
  const board = chess.board();
  const rows = side === 'black' ? board.slice().reverse().map((row) => row.slice().reverse()) : board;
  return rows.flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
    const square = squareName(rowIndex, columnIndex, side);
    const dark = (rowIndex + columnIndex) % 2 === 1;
    const selectedClass = selected === square ? 'is-selected' : '';
    const symbol = piece ? pieceSymbols[`${piece.color}${piece.type.toUpperCase()}`] : '';
    return `<button class="board-square ${dark ? 'is-dark' : 'is-light'} ${selectedClass}" data-square="${square}" aria-label="${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}"><span>${symbol}</span></button>`;
  })).join('');
}

async function startPractice(course: Course, level: LevelKey, progress: CourseProgress, reviewPositionIds: string[] = []) {
  const lesson = course.lessons[level];
  const session = createPracticeSession(lesson, { reviewPositionIds });
  let selected: string | null = null;
  let feedback: MoveFeedback | null = null;
  let savedAttempts = 0;
  let liveProgress = { ...progress };
  let saveError = false;
  let saveQueue: Promise<void> = Promise.resolve();
  let pendingSave: Promise<void> = Promise.resolve();
  const selectableColor = course.side === 'white' ? 'w' : 'b';

  const persist = (snapshot: SessionSnapshot) => {
    const write = saveQueue.catch(() => undefined).then(async () => {
      const newAttempts = snapshot.attempts - savedAttempts;
      const nextProgress = applySessionProgress(liveProgress, level, snapshot, newAttempts, reviewPositionIds);
      await saveProgress(course.id, nextProgress, newAttempts);
      liveProgress = nextProgress;
      savedAttempts = snapshot.attempts;
      saveError = false;
    });
    pendingSave = write;
    saveQueue = write.catch(() => undefined);
    return write;
  };

  const draw = () => {
    const snapshot = session.snapshot;
    const position = snapshot.position ?? lesson.positions[lesson.positions.length - 1];
    const chess = new Chess(position.fen);
    const status = snapshot.status === 'complete' ? (snapshot.lessonComplete ? 'Lesson complete' : 'Review complete') : snapshot.status === 'needs-clean-run' ? 'Clean run required' : snapshot.status === 'retrying' ? 'Retry this position' : `${course.side === 'white' ? 'White' : 'Black'} to move`;
    app.innerHTML = `<main class="practice-shell"><header class="topbar"><button id="back-dashboard" class="back-button">&lt;- <span>Dashboard</span></button><div class="practice-meta"><span class="side-tag">${sideNames[course.side]}</span><span>${escapeHtml(course.name)}</span></div><button id="practice-sign-out" class="quiet-button">Sign out</button></header>${saveError ? '<div class="save-alert" role="alert"><span>Progress could not be saved.</span><button id="retry-save">Retry save</button></div>' : ''}<div class="practice-layout"><section class="lesson-copy"><p class="eyebrow">${levelNames[level]} lesson - ${snapshot.positionIndex + 1} of ${lesson.positions.length}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lede">${escapeHtml(lesson.summary)}</p><div class="explanation"><span class="explanation-mark">Why</span><p>${escapeHtml(position.explanation)}</p></div>${feedback ? `<div class="feedback feedback-${feedback.kind}"><strong>${escapeHtml(feedback.message)}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${escapeHtml(feedback.expectedSan)}</span>` : ''}</div>` : `<p class="move-hint">Select a ${course.side} piece, then select its destination.</p>`}<div class="practice-actions">${snapshot.status === 'needs-clean-run' ? '<button id="restart-run">Start clean run</button>' : snapshot.status === 'complete' ? '<button id="back-after-complete">Back to dashboard</button>' : ''}<button id="exit-practice" class="quiet-button">Exit lesson</button></div></section><section class="board-panel"><div class="board-frame"><div class="board" role="group" aria-label="Chess board">${renderBoard(chess, selected, course.side)}</div></div><div class="board-caption"><span>${status}</span><span>${snapshot.attempts} attempt${snapshot.attempts === 1 ? '' : 's'}</span></div></section></div></main>`;
    document.querySelector('#back-dashboard')!.addEventListener('click', () => void leavePractice());
    document.querySelector('#practice-sign-out')!.addEventListener('click', () => void leavePractice(true));
    document.querySelector('#exit-practice')!.addEventListener('click', () => void leavePractice());
    document.querySelector('#back-after-complete')?.addEventListener('click', () => void leavePractice());
    document.querySelector('#restart-run')?.addEventListener('click', () => { session.restartCleanRun(); feedback = null; selected = null; draw(); });
    document.querySelector('#retry-save')?.addEventListener('click', () => void persist(session.snapshot).then(draw).catch(() => { saveError = true; draw(); }));
    document.querySelectorAll<HTMLButtonElement>('[data-square]').forEach((button) => button.addEventListener('click', () => {
      const square = button.dataset.square!;
      const boardPiece = chess.get(square as Parameters<Chess['get']>[0]);
      if (!selected) {
        if (boardPiece?.color === selectableColor) selected = square;
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
      feedback = session.submitMove(move);
      void persist(feedback.snapshot).catch(() => { saveError = true; draw(); });
      draw();
    }));
  };

  const leavePractice = async (signOut = false) => {
    try {
      await pendingSave;
      if (!saveError) {
        if (signOut) await signOutUser();
        else await renderDashboard(signedInEmail);
      }
    } catch {
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
