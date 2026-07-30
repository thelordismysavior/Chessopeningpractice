import { COURSES, type Course } from '../courses';
import { loadProgress, type CourseProgress } from '../progress';
import { lineStatusLabel, recommendedLines, roleNames, type RepertoireLine } from '../repertoire';
import { signOutUser } from '../firebase';
import { app, escapeHtml, levelNames, resetPageScroll, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

function lineRow(line: RepertoireLine): string {
  const status = lineStatusLabel(line);
  return `<button class="line-selection-row" data-course-id="${line.course.id}" data-line-id="${line.variation.id}"><span><strong>${escapeHtml(line.variation.title)}</strong><small>${escapeHtml(line.course.name)} &middot; ${levelNames[line.level]} &middot; ${roleNames[line.variation.kind]}</small></span><span class="line-selection-status is-${line.state}">${status}</span><span aria-hidden="true">&rarr;</span></button>`;
}

function section(title: string, lines: RepertoireLine[]): string {
  return lines.length ? `<section class="lines-section"><div class="toolbar"><div><span class="state">LINES</span><h2>${title}</h2></div><span class="course-count">${lines.length}</span></div><div class="lines-list">${lines.map(lineRow).join('')}</div></section>` : '';
}

export async function renderLines(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Finding your lines</p><div class="loading-line"></div></main>';
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    const progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
    const lines = recommendedLines(progressByCourse);
    const due = lines.filter((line) => line.duePositionIds.length).slice(0, 8);
    const next = lines.filter((line) => line.state === 'untouched').slice(0, 6);
    const banked = lines.filter((line) => line.state === 'banked' || line.state === 'mastered').slice(0, 6);
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' }, links: [{ id: 'browse', label: 'Browse' }, { id: 'review-queue', label: 'Queue' }, { id: 'sources', label: 'Sources' }] })}<section class="lines-page"><p class="eyebrow">Lines</p><h1>A short path through the repertoire.</h1><p class="lede">Due work first, then the next untouched lines and the material you have already banked.</p>${section('Due now', due)}${section('Next to learn', next)}${section('Banked and mastered', banked)}${!due.length && !next.length && !banked.length ? '<p class="lines-empty">No trainable lines yet. Browse the repertoire to study a reference line.</p>' : ''}</section></main>`;
    app.querySelector('#back-dashboard')?.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    app.querySelector('#sign-out')?.addEventListener('click', () => void signOutUser());
    app.querySelectorAll<HTMLButtonElement>('[data-line-id]').forEach((button) => button.addEventListener('click', () => {
      const line = lines.find((candidate) => candidate.course.id === button.dataset.courseId && candidate.variation.id === button.dataset.lineId);
      if (!line) return;
      if (line.state === 'reference' || line.state === 'untouched') {
        void navigate({ name: 'browse', courseId: line.course.id, lineId: line.variation.id, study: line.state === 'reference' });
        return;
      }
      void navigate({ name: 'practice', course: line.course, level: line.level, progress: progressByCourse[line.course.id], variationId: line.variation.id });
    }));
  } catch (error) {
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Lines unavailable</p><h1>Your repertoire is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-lines">Try again</button></main>`;
    app.querySelector('#retry-lines')?.addEventListener('click', () => void renderLines(navigate, email));
  }
}
