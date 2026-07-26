import { COURSES, LEVELS, coursesById, type Course, type LevelKey } from '../courses';
import { loadProgress, resetAllProgress, type CourseProgress } from '../progress';
import { duePositionIds } from '../review-schedule';
import { signOutUser } from '../firebase';
import { app, bindSettings, escapeHtml, levelNames, loadMoveDuration, resetPageScroll, settingsDialogMarkup, sideNames, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

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

export async function renderDashboard(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
  try {
    const progressEntries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(progressEntries) as Record<Course['id'], CourseProgress>;
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, wordmark: true, links: [{ id: 'sources', label: 'Sources' }, { id: 'settings', label: 'Settings' }] })}<section class="dashboard-intro"><div><p class="eyebrow">White + Black repertoire</p><h1>Make the first move<br><em>automatic.</em></h1><p class="lede">Four focused systems. Three levels each. Practice the line until it feels like your own.</p></div><div class="intro-note"><span>01</span><p>Choose a course below to continue your next available lesson.</p></div></section><section class="course-grid">${COURSES.map((course) => {
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
    document.querySelector('#sources')!.addEventListener('click', () => void navigate({ name: 'sources' }));
    bindSettings(
      () => undefined,
      () => resetAllProgress(COURSES.map((course) => course.id)),
      () => renderDashboard(navigate, email),
    );
    document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
    document.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void navigate({ name: 'practice', course, level: button.dataset.level as LevelKey, progress: progressByCourse[course.id] });
    }));
    document.querySelectorAll<HTMLButtonElement>('[data-review-course]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.reviewCourse as Course['id']];
      const reviewLevel = button.dataset.reviewLevel as LevelKey;
      void navigate({ name: 'practice', course, level: reviewLevel, progress: progressByCourse[course.id], reviewPositionIds: reviewIdsForLevel(course, reviewLevel, progressByCourse[course.id]) });
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Firebase unavailable</p><h1>Your board is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    document.querySelector('#retry-dashboard')!.addEventListener('click', () => void renderDashboard(navigate, email));
  }
}
