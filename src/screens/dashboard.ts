import { COURSES, LEVELS, coursesById, type Course, type LevelKey, type Variation } from '../courses';
import { courseMastery, lineState } from '../mastery';
import { loadProgress, resetAllProgress, type CourseProgress } from '../progress';
import { reviewQueue } from '../review-queue';
import { signOutUser } from '../firebase';
import { app, bindSettings, escapeHtml, levelNames, loadMoveDuration, resetPageScroll, settingsDialogMarkup, sideNames, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

type Recommendation = {
  course: Course;
  level: LevelKey;
  progress: CourseProgress;
  variation: Variation;
  duePositionIds: string[];
};

function lineMeter(course: Course, level: LevelKey, progress: CourseProgress): string {
  const states = course.lessons[level].variations.map((variation) => lineState(variation, progress));
  const counts = {
    mastered: states.filter((state) => state === 'mastered').length,
    banked: states.filter((state) => state === 'banked').length,
    untouched: states.filter((state) => state === 'untouched').length,
  };
  const label = `${counts.mastered} mastered, ${counts.banked} banked, ${counts.untouched} untouched of ${states.length} lines`;
  const segments = states.map((state) => `<span class="meter-segment line-meter-segment is-${state}"></span>`).join('');
  return `<span class="line-meter" role="img" aria-label="${label}">${segments}</span>`;
}

function levelButton(course: Course, level: LevelKey, progress: CourseProgress): string {
  const index = LEVELS.indexOf(level);
  const unlocked = index <= progress.unlockedLevel;
  const complete = progress.completedLevels.includes(level);
  const detail = complete ? 'Completed' : unlocked ? `${course.lessons[level].positions.length} positions - Start lesson` : `Complete ${levelNames[LEVELS[index - 1]]} first`;
  return `<button class="lesson-row ${unlocked ? '' : 'is-locked'}" ${unlocked ? `data-course="${course.id}" data-level="${level}"` : 'disabled'}><span class="lesson-index">${String(index + 1).padStart(2, '0')}</span><span><strong>${levelNames[level]}</strong><small>${detail}</small></span>${lineMeter(course, level, progress)}<span class="lesson-arrow" aria-hidden="true">${complete ? '&#10003;' : unlocked ? '-&gt;' : '&#128274;'}</span></button>`;
}

function recommendation(progressByCourse: Record<Course['id'], CourseProgress>): Recommendation {
  for (const course of COURSES) {
    const progress = progressByCourse[course.id];
    for (const level of LEVELS) {
      for (const variation of course.lessons[level].variations) {
        const duePositionIds = variation.positions.filter((position) => progress.positions[position.id]?.due).map((position) => position.id);
        if (duePositionIds.length) return { course, level, progress, variation, duePositionIds };
      }
    }
  }
  for (const course of COURSES) {
    const progress = progressByCourse[course.id];
    const level = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
    const variation = course.lessons[level].variations.find((candidate) => !progress.completedVariationIds.includes(candidate.id))
      ?? course.lessons[level].variations[0];
    if (variation) return { course, level, progress, variation, duePositionIds: [] };
  }
  const course = COURSES[0];
  return { course, level: LEVELS[0], progress: progressByCourse[course.id], variation: course.lessons.beginner.variations[0], duePositionIds: [] };
}

function progressPercent(course: Course, progress: CourseProgress): number {
  const variationIds = new Set(LEVELS.flatMap((level) => course.lessons[level].variations.map((variation) => variation.id)));
  const total = variationIds.size;
  const banked = progress.completedVariationIds.filter((id) => variationIds.has(id)).length;
  return total ? Math.round((banked / total) * 100) : 0;
}

function courseCard(course: Course, progress: CourseProgress, index: number): string {
  const completed = progress.completedLevels.length;
  const percent = progressPercent(course, progress);
  const mastery = courseMastery(course, progress);
  const nextLevel = LEVELS[Math.min(progress.unlockedLevel, LEVELS.length - 1)];
  const nextCopy = completed === LEVELS.length ? 'All three lessons complete' : `Next up: <strong>${levelNames[nextLevel]}</strong>`;
  return `<article class="course-card" data-course-card="${course.id}"><div class="course-card-top"><span class="course-card-icon" data-tone="${course.side}" aria-hidden="true">${course.side === 'white' ? 'W' : 'B'}</span><span class="course-card-meta"><strong>${String(index + 1).padStart(2, '0')}</strong><span>${course.lessons.beginner.variations.length} lines / level</span><span class="course-count">${String(completed).padStart(2, '0')} / 03</span></span></div><h2>${escapeHtml(course.name)}</h2><p>${escapeHtml(course.description)}</p><div class="progress-row"><div class="progress-label"><span>Progress</span><strong>${percent}% banked</strong></div><div class="progress-track" role="progressbar" aria-label="${escapeHtml(course.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div></div><div class="course-card-detail"><span>${nextCopy}</span><span>${Math.round(mastery.ratio * 100)}% mastered</span></div><div class="lesson-list">${LEVELS.map((level) => levelButton(course, level, progress)).join('')}</div></article>`;
}

export async function renderDashboard(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
  try {
    const progressEntries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(progressEntries) as Record<Course['id'], CourseProgress>;
    const mastery = Object.values(progressByCourse).reduce((summary, progress, index) => {
      const courseSummary = courseMastery(COURSES[index], progress);
      return { mastered: summary.mastered + courseSummary.mastered, total: summary.total + courseSummary.total };
    }, { mastered: 0, total: 0 });
    const masteryRatio = mastery.total ? mastery.mastered / mastery.total : 0;
    const queue = reviewQueue(progressByCourse);
    const next = recommendation(progressByCourse);
    const due = next.duePositionIds.length > 0;
    const masteryMarkup = `<div class="surface dashboard-summary mastery-figure"><div><span class="state">OVERALL PROGRESS</span><strong>${Math.round(masteryRatio * 100)}%</strong></div><div class="progress-row"><div class="progress-label"><span>Banked</span><span>${mastery.mastered} of ${mastery.total} lines</span></div><div class="progress-track" role="progressbar" aria-label="Overall course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(masteryRatio * 100)}"><div class="progress-fill" style="width:${Math.round(masteryRatio * 100)}%"></div></div></div><p class="note">${queue.total ? `${queue.total} position${queue.total === 1 ? '' : 's'} due now. The rest stays untouched until you choose it.` : 'Nothing is due. Continue with the next recommended line when you are ready.'}</p>${queue.total ? `<a id="review-queue" class="button ghost review-entry" href="#/review-queue">Review ${queue.total} position${queue.total === 1 ? '' : 's'} <span aria-hidden="true">-&gt;</span></a>` : ''}</div>`;
    app.innerHTML = `<main class="app-shell home-shell" data-surface="home">${topbarMarkup({ email, wordmark: true, links: [{ id: 'browse', label: 'Browse' }, { id: 'queue-nav', label: 'Review queue' }, { id: 'sources', label: 'Sources' }, { id: 'settings', label: 'Settings' }] })}<section class="reading-rail dashboard-intro"><div><p class="label">HOME &middot; 04 COURSES</p><h1>Keep the line close.</h1><p class="lede">Choose a course, learn its named lines, then return when a position is due.</p></div></section><section id="courses" class="home-section section-rule"><div class="toolbar"><div><span class="state">COURSES</span><h2>Your openings.</h2></div><a id="browse-all" class="button secondary" href="#/browse">Browse all</a></div><div class="course-grid">${COURSES.map((course, index) => courseCard(course, progressByCourse[course.id], index)).join('')}</div></section><section id="review-queue-section" class="home-section section-rule"><span class="state">${queue.total ? `REVIEW QUEUE &middot; ${String(queue.total).padStart(2, '0')} DUE` : 'NEXT ACTION'}</span><div class="dashboard-grid"><div class="surface dashboard-focus"><span class="state">${due ? 'NEXT REVIEW' : 'CONTINUE'}</span><h2>${due ? 'Keep the position close.' : 'Start with one line.'}</h2><p>${escapeHtml(next.course.name)} &middot; ${levelNames[next.level]} &middot; ${escapeHtml(next.variation.title)}. ${due ? 'Produce the move from memory, then return to the line.' : 'Learn the shape, then produce the moves from memory.'}</p><div class="meter" aria-label="${due ? `${next.duePositionIds.length} positions due in this line` : 'Recommended line'}">${next.variation.positions.map((position) => `<i class="${next.duePositionIds.includes(position.id) ? 'due' : ''}"></i>`).join('')}</div><div class="actions"><button id="continue-practice" class="button primary">Continue practice</button></div></div>${masteryMarkup}</div></section>${settingsDialogMarkup(loadMoveDuration(), true)}</main>`;
    app.querySelector('#sources')?.addEventListener('click', () => void navigate({ name: 'sources' }));
    app.querySelector('#browse')?.addEventListener('click', () => void navigate({ name: 'browse' }));
    app.querySelector('#queue-nav')?.addEventListener('click', () => void navigate({ name: 'review-queue' }));
    app.querySelector('#review-queue')?.addEventListener('click', () => void navigate({ name: 'review-queue' }));
    app.querySelector('#continue-practice')?.addEventListener('click', () => void navigate({ name: 'practice', course: next.course, level: next.level, progress: next.progress, reviewPositionIds: due ? next.duePositionIds : undefined }));
    bindSettings(
      () => undefined,
      () => resetAllProgress(COURSES.map((course) => course.id)),
      () => renderDashboard(navigate, email),
    );
    app.querySelector('#sign-out')?.addEventListener('click', () => void signOutUser());
    app.querySelectorAll<HTMLButtonElement>('[data-course][data-level]').forEach((button) => button.addEventListener('click', () => {
      const course = coursesById[button.dataset.course as Course['id']];
      void navigate({ name: 'practice', course, level: button.dataset.level as LevelKey, progress: progressByCourse[course.id] });
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">LINE/64 unavailable</p><h1>Your repertoire is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    app.querySelector('#retry-dashboard')?.addEventListener('click', () => void renderDashboard(navigate, email));
  }
}
