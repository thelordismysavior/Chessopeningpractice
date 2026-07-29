import { COURSES, LEVELS, coursesById, type Course, type LevelKey } from '../courses';
import { courseMastery, lineState } from '../mastery';
import { loadProgress, type CourseProgress } from '../progress';
import { reviewQueue } from '../review-queue';
import {
  app,
  bindPrimaryNavigation,
  bindSettings,
  escapeHtml,
  levelNames,
  loadMoveDuration,
  resetPageScroll,
  settingsDialogMarkup,
  sideNames,
  topbarMarkup,
} from './shell';
import type { Navigate } from './navigation';

function levelRow(course: Course, level: LevelKey, progress: CourseProgress): string {
  const index = LEVELS.indexOf(level);
  const unlocked = index <= progress.unlockedLevel;
  const complete = progress.completedLevels.includes(level);
  const states = course.lessons[level].variations.map((variation) => lineState(variation, progress));
  const banked = states.filter((state) => state !== 'untouched').length;
  const prerequisite = index > 0 ? levelNames[LEVELS[index - 1]] : '';
  const detail = complete
    ? `${banked} of ${states.length} lines banked · Complete`
    : unlocked
      ? `${course.lessons[level].positions.length} positions · Ready`
      : `Complete ${prerequisite} to unlock`;
  return `<button class="lesson-row ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-course="${course.id}" data-level="${level}"` : `disabled aria-label="${levelNames[level]} locked. ${detail}"`}><span class="lesson-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${levelNames[level]}</strong><small>${detail}</small></span><span class="lesson-state">${complete ? 'Banked' : unlocked ? 'Start' : 'Locked'}</span></button>`;
}

export async function renderDrillLauncher(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Preparing your lines</p><div class="loading-line"></div></main>';
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
    const queue = reviewQueue(progressByCourse);
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, active: 'drill', reviewCount: queue.total })}<section class="page-heading drill-heading"><p class="eyebrow">Drill · Choose a line</p><h1>Recall starts here.</h1><p class="lede">Pick the system and level. LINE/64 will choose the next position without changing your progression rules.</p></section><section class="course-grid drill-grid">${COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      return `<article class="course-card drill-card"><header class="course-header"><div><span class="side-tag">${sideNames[course.side]}</span><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(course.description)}</p></div><span class="course-count">${Math.round(courseMastery(course, progress).ratio * 100)}%</span></header><div class="core-line"><span>Core line · ${escapeHtml(course.eco)}</span><code>${escapeHtml(course.coreLine)}</code></div><div class="lesson-list">${LEVELS.map((level) => levelRow(course, level, progress)).join('')}</div></article>`;
    }).join('')}</section>${settingsDialogMarkup(loadMoveDuration(), email)}</main>`;
    bindPrimaryNavigation(navigate);
    bindSettings(() => undefined, undefined, undefined, navigate);
    app.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void navigate({ name: 'practice', course, level: button.dataset.level as LevelKey, progress: progressByCourse[course.id] });
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Repertoire unavailable</p><h1>The line is still yours.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-drill">Try again</button></main>`;
    app.querySelector<HTMLButtonElement>('#retry-drill')!.addEventListener('click', () => void renderDrillLauncher(navigate, email));
  }
}
