import { COURSES, LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { courseMastery } from '../mastery';
import { loadProgress, resetAllProgress, type CourseProgress } from '../progress';
import { recommendedLines, trainableVariations } from '../repertoire';
import { reviewQueue } from '../review-queue';
import { app, bindSettings, escapeHtml, levelNames, loadMoveDuration, resetPageScroll, settingsDialogMarkup, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

type Recommendation = {
  course: Course;
  level: LevelKey;
  progress: CourseProgress;
  variation: Variation;
  duePositionIds: string[];
};

const courseIcons: Record<Course['id'], string> = {
  'jobava-london': '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M8 35 18 14l6 10 6-10 10 21"></path><path d="M11 35h26M18 14h12"></path><circle cx="24" cy="24" r="3"></circle></svg>',
  'london-system': '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M10 36V16l14-6 14 6v20"></path><path d="M14 20h20M14 28h20M20 16v20M28 16v20M8 36h32"></path></svg>',
  'classical-caro-kann': '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 8 38 14v9c0 9-6 14-14 17-8-3-14-8-14-17v-9L24 8Z"></path><path d="M17 24h14M24 17v14"></path></svg>',
  'classical-sicilian': '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 36V12M24 20l-10 8M24 20l10 8M14 28v8M34 28v8M10 36h8M30 36h8"></path><circle cx="24" cy="12" r="3"></circle></svg>',
};

function recommendation(progressByCourse: Record<Course['id'], CourseProgress>): Recommendation {
  const next = recommendedLines(progressByCourse)[0];
  if (next) return { course: next.course, level: next.level, progress: progressByCourse[next.course.id], variation: next.variation, duePositionIds: next.duePositionIds };
  const course = COURSES[0];
  return { course, level: LEVELS[0], progress: progressByCourse[course.id], variation: trainableVariations(course, LEVELS[0])[0], duePositionIds: [] };
}

function progressPercent(course: Course, progress: CourseProgress): number {
  const variationIds = new Set(trainableVariations(course).map((variation) => variation.id));
  const total = variationIds.size;
  const banked = progress.completedVariationIds.filter((id) => variationIds.has(id)).length;
  return total ? Math.round((banked / total) * 100) : 0;
}

function courseCard(course: Course, progress: CourseProgress, index: number): string {
  const completed = progress.completedLevels.length;
  const percent = progressPercent(course, progress);
  const mastery = courseMastery(course, progress);
  return `<a class="course-card" data-course-card="${course.id}" href="#/course/${course.id}"><div><div class="course-card-top"><span class="course-card-icon" data-tone="${course.side}" aria-hidden="true">${courseIcons[course.id]}</span><span class="course-card-meta"><strong>${String(index + 1).padStart(2, '0')}</strong><span>${trainableVariations(course).length} lines</span></span></div><h3>${escapeHtml(course.name)}</h3><p>${escapeHtml(course.promise)}</p></div><div class="progress-row"><div class="progress-label"><span>Progress</span><strong>${percent}% banked</strong></div><div class="progress-track" role="progressbar" aria-label="${escapeHtml(course.name)} progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><div class="progress-fill" style="width:${percent}%"></div></div></div><span class="course-card-detail"><span class="course-count">${String(completed).padStart(2, '0')} / 03</span><span>${Math.round(mastery.ratio * 100)}% mastered</span></span></a>`;
}

export async function renderDashboard(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page" aria-busy="true" aria-live="polite"><p class="eyebrow">Loading your repertoire</p><div class="loading-line"></div></main>';
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
    const timingNote = queue.total
      ? `${queue.total} position${queue.total === 1 ? '' : 's'} due now. Upcoming reviews stay below in the queue.`
      : queue.upcomingTotal
        ? `${queue.upcomingTotal} position${queue.upcomingTotal === 1 ? '' : 's'} banked. The next review is scheduled.`
        : 'Nothing is due. Continue with the next recommended line when you are ready.';
    const masteryMarkup = `<div class="surface dashboard-summary mastery-figure"><div class="mastery-heading"><span class="state">OVERALL PROGRESS</span><strong>${Math.round(masteryRatio * 100)}%</strong></div><div class="progress-row"><div class="progress-label"><span>Banked</span><span>${mastery.mastered} of ${mastery.total} lines</span></div><div class="progress-track" role="progressbar" aria-label="Overall course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(masteryRatio * 100)}"><div class="progress-fill" style="width:${Math.round(masteryRatio * 100)}%"></div></div></div><p class="note">${timingNote}</p>${queue.total ? `<a id="review-queue" class="button ghost review-entry" href="#/review-queue">Review ${queue.total} position${queue.total === 1 ? '' : 's'} <span aria-hidden="true">-&gt;</span></a>` : ''}</div>`;
    app.innerHTML = `<main class="app-shell home-shell" data-surface="home">${topbarMarkup({ email, wordmark: true, links: [{ id: 'lines', label: 'Lines' }, { id: 'browse', label: 'Browse' }, { id: 'queue-nav', label: 'Review queue' }, { id: 'sources', label: 'Sources' }, { id: 'settings', label: 'Settings' }, { id: 'account', label: 'Account' }] })}<section class="reading-rail home-content"><div class="dashboard-intro"><p class="label">HOME &middot; 04 COURSES</p><h1>Keep the line close.</h1><p class="lede">Choose a course, learn its named lines, then return when a position is due.</p></div><section id="courses" class="home-section section-rule"><div class="toolbar"><div><span class="state">COURSES</span><h2>Your openings.</h2></div><a id="browse-all" class="button secondary" href="#/browse">Browse all</a></div><div class="course-grid">${COURSES.map((course, index) => courseCard(course, progressByCourse[course.id], index)).join('')}</div></section><section id="review-queue-section" class="home-section section-rule"><span class="state">${queue.total ? `REVIEW QUEUE &middot; ${String(queue.total).padStart(2, '0')} DUE` : 'NEXT ACTION'}</span><div class="dashboard-grid"><div class="surface dashboard-focus"><span class="state">${due ? 'NEXT REVIEW' : 'CONTINUE'}</span><h2>${due ? 'Keep the position close.' : 'Start with one line.'}</h2><p>${escapeHtml(next.course.name)} &middot; ${levelNames[next.level]} &middot; ${escapeHtml(next.variation.title)}. ${due ? 'Produce the move from memory, then return to the line.' : 'Learn the shape, then produce the moves from memory.'}</p><div class="meter" role="img" aria-label="${due ? `${next.duePositionIds.length} positions due in this line` : 'Recommended line'}">${next.variation.positions.map((position) => `<i class="${next.duePositionIds.includes(position.id) ? 'due' : ''}"></i>`).join('')}</div><div class="actions"><button id="continue-practice" class="button primary">Continue practice</button></div></div>${masteryMarkup}</div></section></section>${settingsDialogMarkup(loadMoveDuration(), true)}</main>`;
    app.querySelector('#lines')?.addEventListener('click', () => void navigate({ name: 'lines' }));
    app.querySelector('#sources')?.addEventListener('click', () => void navigate({ name: 'sources' }));
    app.querySelector('#browse-all')?.addEventListener('click', () => void navigate({ name: 'browse' }));
    app.querySelector('#queue-nav')?.addEventListener('click', () => void navigate({ name: 'review-queue' }));
    app.querySelector('#review-queue')?.addEventListener('click', () => void navigate({ name: 'review-queue' }));
    app.querySelector('#continue-practice')?.addEventListener('click', () => void navigate({ name: 'practice', course: next.course, level: next.level, progress: next.progress, variationId: next.variation.id, reviewPositionIds: due ? next.duePositionIds : undefined }));
    bindSettings(
      () => undefined,
      () => resetAllProgress(COURSES.map((course) => course.id)),
      () => renderDashboard(navigate, email),
    );
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">LINE/64 unavailable</p><h1>Your repertoire is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-dashboard">Try again</button></main>`;
    app.querySelector('#retry-dashboard')?.addEventListener('click', () => void renderDashboard(navigate, email));
  }
}
