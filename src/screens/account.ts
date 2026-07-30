import { COURSES, type Course } from '../courses';
import { signOutUser } from '../firebase';
import { overallMastery } from '../mastery';
import { loadProgress, resetAllProgress, type CourseProgress } from '../progress';
import { reviewQueue } from '../review-queue';
import { app, bindProgressReset, escapeHtml, progressResetMarkup, resetPageScroll, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

export async function renderAccount(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page" aria-busy="true" aria-live="polite"><p class="eyebrow">Reading your account</p><div class="loading-line"></div></main>';
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
    const mastery = overallMastery(progressByCourse);
    const queue = reviewQueue(progressByCourse);
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' }, links: [{ id: 'settings-link', label: 'Settings' }, { id: 'sources', label: 'Sources' }] })}<section class="account-page"><p class="eyebrow">Account</p><h1>${escapeHtml(email)}</h1><p class="lede">Signed-in learner account. Progress belongs to this account; device preferences stay local.</p><div class="account-summary surface"><span class="state">OVERALL LEARNING</span><strong>${Math.round(mastery.ratio * 100)}%</strong><p>${mastery.mastered} of ${mastery.total} lines mastered. ${queue.total} position${queue.total === 1 ? '' : 's'} due now.</p></div><nav class="account-links" aria-label="Account links"><a class="button secondary" id="settings-link-card" href="#/settings">Settings</a><a class="button secondary" id="sources-link-card" href="#/sources">Sources</a></nav><section class="account-actions"><button id="account-sign-out" class="quiet-button">Sign out</button></section><section class="account-reset">${progressResetMarkup()}</section></section></main>`;
    app.querySelector('#back-dashboard')?.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    app.querySelector('#sign-out')?.addEventListener('click', () => void signOutUser());
    app.querySelector('#account-sign-out')?.addEventListener('click', () => void signOutUser());
    bindProgressReset(
      () => resetAllProgress(COURSES.map((course) => course.id)),
      () => renderAccount(navigate, email),
    );
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Account unavailable</p><h1>Your progress is still safe.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-account">Try again</button></main>`;
    app.querySelector('#retry-account')?.addEventListener('click', () => void renderAccount(navigate, email));
  }
}
