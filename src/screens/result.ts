import { evalLabel } from '../engine/eval-scale';
import { COURSES, coursesById } from '../courses';
import { loadProgress, type CourseProgress } from '../progress';
import { nextResultAction, type ResultSummary } from '../result';
import { app, escapeHtml, levelNames, resetPageScroll, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

export async function renderResult(navigate: Navigate, email: string | null, summary: ResultSummary): Promise<void> {
  resetPageScroll();
  const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
  const progressByCourse = Object.fromEntries(entries) as Record<typeof COURSES[number]['id'], CourseProgress>;
  const action = nextResultAction(progressByCourse);
  const actionLabel = action.kind === 'continue' ? 'Continue' : action.kind === 'review' ? 'Review due positions' : 'Return home';
  const branch = summary.branch
    ? `<article class="result-branch"><p class="eyebrow">Branch review</p><h2>${escapeHtml(summary.branch.variationTitle)}</h2><p><strong>Opponent trigger:</strong> ${escapeHtml(summary.branch.opponentTrigger)}</p><p><strong>Resulting plan:</strong> ${escapeHtml(summary.branch.resultingPlan)}</p><p><strong>Authored correction:</strong> ${escapeHtml(summary.branch.explanation)} Expected ${escapeHtml(summary.branch.expectedSan)}.</p></article>`
    : '';
  const missed = summary.missed.length
    ? `<ul class="summary-missed">${summary.missed.map((entry) => `<li><strong>${escapeHtml(entry.expectedSan)}</strong><span>${escapeHtml(entry.lineTitle)}</span></li>`).join('')}</ul>`
    : '<p class="summary-clean">No missed positions.</p>';
  const lineState = summary.lineState[0].toUpperCase() + summary.lineState.slice(1);
  app.innerHTML = `<main class="app-shell result-page">${topbarMarkup({ email, back: { id: 'back-practice', label: 'Practice' }, wordmark: true, links: [] })}<section class="result-content"><p class="eyebrow">Session result &middot; ${escapeHtml(levelNames[summary.level])}</p><h1>${escapeHtml(summary.lineTitle)}</h1><p class="lede">Your latest completed practice is saved in this tab.</p><section class="summary-panel"><dl class="summary-stats"><div><dt>Settled Score</dt><dd>${summary.settledScore ? escapeHtml(evalLabel(summary.settledScore)) : '--'}</dd></div><div><dt>Mistakes</dt><dd>${summary.mistakes}</dd></div><div><dt>Line state</dt><dd>${lineState}</dd></div><div><dt>Hints</dt><dd>${summary.hints}</dd></div></dl><h2 class="summary-heading">Authored correction</h2><p>${escapeHtml(summary.authoredCorrection)}</p><h2 class="summary-heading">Missed positions</h2>${missed}</section>${branch}<div class="result-actions"><button id="result-next-action">${actionLabel}</button></div></section></main>`;
  app.querySelector('.result-content > .eyebrow')?.replaceChildren(`Move settled · ${lineState} line`);
  app.querySelector('.result-content > h1')?.replaceChildren('The line remains.');
  app.querySelector('.result-content > .lede')?.replaceChildren(`${summary.lineTitle} is ${summary.lineState}. Banking was automatic; choose the recommended next action when ready.`);
  app.querySelector('#back-practice')?.addEventListener('click', () => void navigate({ name: 'practice', course: coursesById[summary.courseId], level: summary.level, progress: progressByCourse[summary.courseId], variationId: summary.lineId }));
  app.querySelector('#settings')?.addEventListener('click', () => void navigate({ name: 'settings' }));
  app.querySelector('#result-next-action')?.addEventListener('click', () => {
    if (action.kind === 'home') return void navigate({ name: 'dashboard' });
    if (action.kind === 'review') return void navigate({ name: 'review-queue' });
    const course = coursesById[action.courseId];
    void navigate({ name: 'practice', course, level: action.level, progress: progressByCourse[action.courseId], variationId: action.variationId });
  });
}
