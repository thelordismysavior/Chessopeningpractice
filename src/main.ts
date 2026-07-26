import { Chess } from 'chess.js';
import './style.css';
import { COURSES, LEVELS, coursesById, type Course, type LevelKey } from './courses';
import { createPracticeSession, type MoveFeedback, type SessionSnapshot } from './practice-session';
import { loadProgress, saveProgress, type CourseProgress } from './progress';
import { applySessionProgress } from './progress-state';
import { signIn, signOutUser, watchUser } from './firebase';

const app = document.querySelector<HTMLDivElement>('#app')!;
const pieceSymbols: Record<string, string> = { 'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙', 'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟' };
const levelNames: Record<LevelKey, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
let signedInEmail: string | null = null;

function escapeHtml(value: string | null): string {
  return (value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

function renderSignedOut(message = 'Private opening practice for one learner.') {
  app.innerHTML = `<main class="auth-page"><div class="brand-mark">CP</div><p class="eyebrow">A quieter way to learn openings</p><h1>Chess Practice</h1><p class="lede">${escapeHtml(message)}</p><button id="sign-in">Sign in with Google <span aria-hidden="true">→</span></button></main>`;
  document.querySelector('#sign-in')!.addEventListener('click', () => void signIn());
}

function levelButton(course: Course, level: LevelKey, progress: CourseProgress): string {
  const index = LEVELS.indexOf(level);
  const unlocked = index <= progress.unlockedLevel;
  const complete = progress.completedLevels.includes(level);
  return `<button class="lesson-row ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-course="${course.id}" data-level="${level}"` : 'disabled'}><span class="lesson-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${levelNames[level]}</strong><small>${complete ? 'Completed' : unlocked ? `${course.lessons[level].positions.length} positions · Start lesson` : `Complete ${levelNames[LEVELS[index - 1]]} first`}</small></span><span class="lesson-arrow" aria-hidden="true">${complete ? '✓' : unlocked ? '→' : '锁'}</span></button>`;
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
    app.innerHTML = `<main class="app-shell"><header class="topbar"><a class="wordmark" href="#">Chess Practice<span>.</span></a><div class="account"><span>${escapeHtml(email) || 'owner'}</span><button id="sign-out" class="quiet-button">Sign out</button></div></header><section class="dashboard-intro"><div><p class="eyebrow">White repertoire</p><h1>Make the first move<br><em>automatic.</em></h1><p class="lede">Two focused systems. Three levels each. Practice the line until it feels like your own.</p></div><div class="intro-note"><span>01</span><p>Choose a course below to continue your next available lesson.</p></div></section><section class="course-grid">${COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      const completed = progress.completedLevels.length;
      const nextLevel = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
      const allReviewIds = reviewIds(progress);
      const reviewLevel = LEVELS.find((candidate) => allReviewIds.some((id) => course.lessons[candidate].positions.some((position) => position.id === id)));
      const reviewPositionIds = reviewLevel ? reviewIdsForLevel(course, reviewLevel, progress) : [];
      const nextCopy = completed === LEVELS.length ? 'All three lessons complete' : `Next up: <strong>${levelNames[nextLevel]}</strong>`;
      return `<article class="course-card"><div class="course-header"><div><span class="side-tag">W · WHITE</span><h2>${course.name}</h2><p>${course.description}</p></div><span class="course-count">${String(completed).padStart(2, '0')} / 03</span></div><div class="core-line"><span>Core line · ${course.eco}</span><code>${course.coreLine}</code></div><div class="lesson-list">${LEVELS.map((level) => levelButton(course, level, progress)).join('')}</div><div class="course-footer"><span>${nextCopy}</span>${reviewLevel && reviewPositionIds.length ? `<button class="review-link" data-review-course="${course.id}" data-review-level="${reviewLevel}">Review ${reviewPositionIds.length} positions</button>` : '<span class="muted">Clean practice builds recall</span>'}</div></article>`;
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
    document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
    document.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void startPractice(course, button.dataset.level as LevelKey, progressByCourse[course.id]);
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-review-course]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.reviewCourse as Course['id']];
      const reviewLevel = button.dataset.reviewLevel as LevelKey;
      const ids = reviewIdsForLevel(course, reviewLevel, progressByCourse[course.id]);
      void startPractice(course, reviewLevel, progressByCourse[course.id], ids);
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page"><p class="eyebrow">Could not load progress</p><h1>Your board is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    document.querySelector('#retry-dashboard')!.addEventListener('click', () => void renderDashboard(email));
  }
}

function squareName(row: number, column: number): string {
  return `${String.fromCharCode(97 + column)}${8 - row}`;
}

function renderBoard(chess: Chess, selected: string | null): string {
  return chess.board().flatMap((row, rowIndex) => row.map((piece, columnIndex) => {
    const square = squareName(rowIndex, columnIndex);
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

  const persist = (snapshot: SessionSnapshot) => {
    const write = saveQueue.catch(() => undefined).then(async () => {
      const newAttempts = snapshot.attempts - savedAttempts;
      const nextProgress = applySessionProgress(liveProgress, level, snapshot, newAttempts, reviewPositionIds);
      await saveProgress(course.id, nextProgress, newAttempts);
      liveProgress = nextProgress;
      savedAttempts = snapshot.attempts;
      saveError = false;
    });
    saveQueue = write.catch(() => undefined);
    return write;
  };

  const draw = () => {
    const snapshot = session.snapshot;
    const position = snapshot.position ?? lesson.positions[lesson.positions.length - 1];
    const chess = new Chess(position.fen);
    app.innerHTML = `<main class="practice-shell"><header class="topbar"><button id="back-dashboard" class="back-button">← <span>Dashboard</span></button><div class="practice-meta"><span class="side-tag">W · WHITE</span><span>${course.name}</span></div><button id="practice-sign-out" class="quiet-button">Sign out</button></header>${saveError ? '<div class="save-alert" role="alert"><span>Progress could not be saved.</span><button id="retry-save">Retry save</button></div>' : ''}<div class="practice-layout"><section class="lesson-copy"><p class="eyebrow">${levelNames[level]} lesson · ${snapshot.positionIndex + 1} of ${lesson.positions.length}</p><h1>${lesson.title}</h1><p class="lede">${lesson.summary}</p><div class="explanation"><span class="explanation-mark">Why</span><p>${position.explanation}</p></div>${feedback ? `<div class="feedback feedback-${feedback.kind}"><strong>${feedback.message}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${feedback.expectedSan}</span>` : ''}</div>` : '<p class="move-hint">Select a white piece, then select its destination.</p>'}<div class="practice-actions">${snapshot.status === 'needs-clean-run' ? '<button id="restart-run">Start clean run</button>' : snapshot.status === 'complete' ? '<button id="back-after-complete">Back to dashboard</button>' : ''}<button id="exit-practice" class="quiet-button">Exit lesson</button></div></section><section class="board-panel"><div class="board-frame"><div class="board" role="group" aria-label="Chess board">${renderBoard(chess, selected)}</div></div><div class="board-caption"><span>${snapshot.status === 'complete' ? (snapshot.lessonComplete ? 'Lesson complete' : 'Review complete') : snapshot.status === 'needs-clean-run' ? 'Clean run required' : snapshot.status === 'retrying' ? 'Retry this position' : 'Your move'}</span><span>${snapshot.attempts} attempt${snapshot.attempts === 1 ? '' : 's'}</span></div></section></div></main>`;
    document.querySelector('#back-dashboard')!.addEventListener('click', () => void renderDashboard(signedInEmail));
    document.querySelector('#practice-sign-out')!.addEventListener('click', () => void signOutUser());
    document.querySelector('#exit-practice')!.addEventListener('click', () => void renderDashboard(signedInEmail));
    document.querySelector('#back-after-complete')?.addEventListener('click', () => void renderDashboard(signedInEmail));
    document.querySelector('#restart-run')?.addEventListener('click', () => { session.restartCleanRun(); feedback = null; selected = null; draw(); });
    document.querySelector('#retry-save')?.addEventListener('click', () => void persist(session.snapshot).then(draw).catch(() => { saveError = true; draw(); }));
    document.querySelectorAll<HTMLButtonElement>('[data-square]').forEach((button) => button.addEventListener('click', () => {
      const square = button.dataset.square!;
      const boardPiece = chess.get(square as Parameters<Chess['get']>[0]);
      if (!selected) {
        if (boardPiece?.color === 'w') selected = square;
        draw();
        return;
      }
      if (boardPiece?.color === 'w') {
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

  draw();
}

watchUser((user) => {
  if (!user) return renderSignedOut();
  if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
    void signOutUser();
    return renderSignedOut('This Google account is not approved.');
  }
  signedInEmail = user.email;
  void renderDashboard(user.email);
});
