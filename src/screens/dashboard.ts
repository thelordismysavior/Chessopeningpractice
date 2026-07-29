import { COURSES, LEVELS, coursesById, type Course, type LevelKey } from '../courses';
import { courseMastery, lineState, overallMastery } from '../mastery';
import { loadProgress, resetAllProgress, type CourseProgress } from '../progress';
import { reviewQueue } from '../review-queue';
import { app, bindPrimaryNavigation, bindSettings, escapeHtml, levelNames, loadMoveDuration, resetPageScroll, settingsDialogMarkup, sideNames, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

function lineMeter(course: Course, level: LevelKey, progress: CourseProgress): string {
  const states = course.lessons[level].variations.map((variation) => lineState(variation, progress));
  const counts = {
    mastered: states.filter((state) => state === 'mastered').length,
    banked: states.filter((state) => state === 'banked').length,
    untouched: states.filter((state) => state === 'untouched').length,
  };
  const label = `${counts.mastered} mastered, ${counts.banked} banked, ${counts.untouched} untouched of ${states.length} lines`;
  const segments = states.map((state) => `<span class="meter-segment is-${state}"></span>`).join('');
  return `<span class="line-meter" role="img" aria-label="${label}">${segments}</span>`;
}

function levelButton(course: Course, level: LevelKey, progress: CourseProgress): string {
  const index = LEVELS.indexOf(level);
  const unlocked = index <= progress.unlockedLevel;
  const complete = progress.completedLevels.includes(level);
  const detail = complete ? 'Complete' : unlocked ? `${course.lessons[level].positions.length} positions · Ready` : `Complete ${levelNames[LEVELS[index - 1]]} first`;
  return `<button class="lesson-row ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-course="${course.id}" data-level="${level}"` : `disabled aria-label="${levelNames[level]} locked. ${detail}"`}><span class="lesson-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${levelNames[level]}</strong><small>${detail}</small></span>${lineMeter(course, level, progress)}<span class="lesson-state">${complete ? 'Banked' : unlocked ? 'Start' : 'Locked'}</span></button>`;
}

export async function renderDashboard(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
  try {
    const progressEntries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(progressEntries) as Record<Course['id'], CourseProgress>;
    const mastery = overallMastery(progressByCourse);
    const queue = reviewQueue(progressByCourse);
    const recommended = COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      const level = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
      return { course, level, progress };
    }).find(({ progress }) => progress.completedLevels.length < LEVELS.length);
    const nextAction = queue.total
      ? `<button id="home-review-queue" class="primary-action">Review ${queue.total} position${queue.total === 1 ? '' : 's'}</button>`
      : recommended
        ? `<button id="home-next-drill" class="primary-action" data-course="${recommended.course.id}" data-level="${recommended.level}">Drill ${escapeHtml(recommended.course.name)}</button>`
        : '<button id="home-learn" class="primary-action">Study the repertoire</button>';
    const masteryMarkup = `<aside class="mastery-figure"><p class="eyebrow">Mastery</p><strong>${Math.round(mastery.ratio * 100)}%</strong><span>${mastery.mastered} of ${mastery.total} lines mastered</span><div class="mastery-rule" role="img" aria-label="${Math.round(mastery.ratio * 100)} percent mastered"><span style="--mastery:${Math.round(mastery.ratio * 100)}%"></span></div><p>A line is mastered when it is banked and nothing is waiting for review.</p></aside>`;
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, active: 'home', reviewCount: queue.total })}<section class="dashboard-intro"><div class="home-lead"><p class="eyebrow">Home · White + Black</p><h1>Recall the line.<br><em>Nothing else.</em></h1><p class="lede">Four focused systems. Three levels each. Learn the position, produce the move, bank the line.</p><div class="next-action"><span class="meta-label">${queue.total ? 'Review due' : 'Next decision'}</span>${nextAction}</div></div>${masteryMarkup}</section><section class="section-heading"><p class="eyebrow">Your repertoire</p><h2>Four systems. One quiet loop.</h2></section><section class="course-grid">${COURSES.map((course) => {
      const progress = progressByCourse[course.id];
      const completed = progress.completedLevels.length;
      const nextLevel = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
      const nextCopy = completed === LEVELS.length ? 'All three lessons complete' : `Next up: <strong>${levelNames[nextLevel]}</strong>`;
      return `<article class="course-card"><div class="course-header"><div><span class="side-tag">${sideNames[course.side]}</span><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(course.description)}</p></div><span class="course-count">${String(completed).padStart(2, '0')} / 03</span></div><div class="core-line"><span>Core line - ${escapeHtml(course.eco)}</span><code>${escapeHtml(course.coreLine)}</code></div><div class="lesson-list">${LEVELS.map((level) => levelButton(course, level, progress)).join('')}</div><div class="course-footer"><span>${nextCopy}</span><span class="course-mastery">${Math.round(courseMastery(course, progress).ratio * 100)}% mastered</span></div></article>`;
    }).join('')}</section>${settingsDialogMarkup(loadMoveDuration(), email, true)}</main>`;
    bindPrimaryNavigation(navigate);
    document.querySelector('#home-review-queue')?.addEventListener('click', () => void navigate({ name: 'review-queue' }));
    document.querySelector('#home-learn')?.addEventListener('click', () => void navigate({ name: 'browse' }));
    bindSettings(
      () => undefined,
      () => resetAllProgress(COURSES.map((course) => course.id)),
      () => renderDashboard(navigate, email),
      navigate,
    );
    document.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void navigate({ name: 'practice', course, level: button.dataset.level as LevelKey, progress: progressByCourse[course.id] });
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Firebase unavailable</p><h1>Your board is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    document.querySelector('#retry-dashboard')!.addEventListener('click', () => void renderDashboard(navigate, email));
  }
}
