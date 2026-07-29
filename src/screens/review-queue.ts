import { COURSES, coursesById, type Course, type LevelKey } from '../courses';
import { loadProgress, type CourseProgress } from '../progress';
import { reviewQueue, type ReviewGroup } from '../review-queue';
import { formatReviewTime } from '../review-schedule';
import { signOutUser } from '../firebase';
import { app, escapeHtml, levelNames, resetPageScroll, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

function groupRow(group: ReviewGroup, index: number): string {
  const course = coursesById[group.courseId];
  const count = group.positionIds.length;
  const upcoming = group.kind === 'upcoming';
  return `<article class="${upcoming ? 'queue-upcoming-row' : 'queue-row is-due'}"><div><h2>${escapeHtml(course.name)}</h2><p>${levelNames[group.level]} - ${count} position${count === 1 ? '' : 's'} ${upcoming ? 'banked' : 'due now'}</p></div>${upcoming ? `<span class="queue-next">Next review ${escapeHtml(formatReviewTime(group.nextReviewAt!))}</span>` : `<button data-group="${index}">Review ${count} <span aria-hidden="true">-&gt;</span></button>`}</article>`;
}

export async function renderReviewQueue(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Reading your review queue</p><div class="loading-line"></div></main>';
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
    const queue = reviewQueue(progressByCourse);
    const dueBody = queue.dueGroups.length
      ? `<p class="lede">${queue.total} position${queue.total === 1 ? '' : 's'} due across ${queue.dueGroups.length} lesson${queue.dueGroups.length === 1 ? '' : 's'}.</p><div class="queue-actions"><button id="review-all">Review all ${queue.total}</button></div><div class="queue-list">${queue.dueGroups.map(groupRow).join('')}</div>`
      : '<p class="lede queue-empty">Nothing is due. Everything you have banked is holding.</p>';
    const upcomingBody = queue.upcomingGroups.length
      ? `<section class="queue-upcoming"><h2>Recently banked</h2><p>These positions are scheduled to return.</p><div class="queue-list">${queue.upcomingGroups.map((group) => groupRow(group, -1)).join('')}</div></section>`
      : '';
    const body = `${dueBody}${upcomingBody}`;
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' } })}<section class="queue-page"><p class="eyebrow">Review queue</p><h1>What needs another look.</h1>${body}</section></main>`;

    document.querySelector('#back-dashboard')!.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());

    const startGroup = (index: number, run = false) => {
      const group = queue.dueGroups[index];
      if (!group) return;
      void navigate({
        name: 'practice',
        course: coursesById[group.courseId],
        level: group.level as LevelKey,
        progress: progressByCourse[group.courseId],
        reviewPositionIds: group.positionIds,
        run: run ? { groups: queue.dueGroups, index } : undefined,
      });
    };

    app.querySelectorAll<HTMLButtonElement>('[data-group]').forEach((button) => button.addEventListener('click', () => startGroup(Number(button.dataset.group))));
    document.querySelector('#review-all')?.addEventListener('click', () => startGroup(0, true));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Firebase unavailable</p><h1>Your board is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-queue">Try again</button></main>`;
    document.querySelector('#retry-queue')!.addEventListener('click', () => void renderReviewQueue(navigate, email));
  }
}
