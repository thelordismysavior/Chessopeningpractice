import { COURSES, LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { lineState, type LineState } from '../mastery';
import { productionLinePreview } from '../line-preview-production';
import { loadProgress, type CourseProgress } from '../progress';
import { isTrainableVariation, roleNames } from '../repertoire';
import { app, escapeHtml, levelNames, resetPageScroll, topbarMarkup } from './shell';
import type { BrowseScreen, Navigate } from './navigation';

type Row = { course: Course; level: LevelKey; variation: Variation; state: LineState | null };

const stateChips: Record<LineState, string> = { untouched: 'Untouched', banked: 'Due', mastered: 'Mastered', reference: 'Reference' };

type Filters = { course: Course['id'] | 'all'; state: LineState | 'all'; query: string };

function buildRows(progressByCourse: Record<Course['id'], CourseProgress> | null): Row[] {
  return COURSES.flatMap((course) => LEVELS.flatMap((level) => course.lessons[level].variations.map((variation) => ({
    course,
    level,
    variation,
    state: progressByCourse ? lineState(variation, progressByCourse[course.id]) : null,
  }))));
}

function matches(row: Row, filters: Filters): boolean {
  if (filters.course !== 'all' && row.course.id !== filters.course) return false;
  if (filters.state !== 'all' && row.state !== filters.state) return false;
  if (filters.query) {
    const haystack = `${row.course.name} ${row.variation.title} ${row.variation.summary} ${roleNames[row.variation.kind]}`.toLocaleLowerCase();
    if (!haystack.includes(filters.query.toLocaleLowerCase())) return false;
  }
  return true;
}

function rowMarkup(row: Row): string {
  const chip = row.state ? `<span class="browse-chip is-${row.state}">${stateChips[row.state]}</span>` : '';
  return `<button class="browse-row" data-line="${row.variation.id}"><span class="browse-line"><strong>${escapeHtml(row.variation.title)}</strong><small>${escapeHtml(row.course.name)} - ${levelNames[row.level]} - ${roleNames[row.variation.kind]}</small></span><span class="browse-meta"><span>${row.variation.positions.length} moves</span><code>${row.variation.evalCp > 0 ? '+' : ''}${(row.variation.evalCp / 100).toFixed(2)}</code>${chip}</span></button>`;
}

export async function renderBrowse(navigate: Navigate, email: string | null, screen: BrowseScreen): Promise<void> {
  resetPageScroll();
  app.innerHTML = '<main class="loading-page" aria-busy="true" aria-live="polite"><p class="eyebrow">Reading your repertoire</p><div class="loading-line"></div></main>';

  let progressByCourse: Record<Course['id'], CourseProgress> | null = null;
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
  } catch {
    progressByCourse = null;
  }

  const rows = buildRows(progressByCourse);
  const filters: Filters = { course: screen.courseId ?? 'all', state: 'all', query: '' };
  let disposeActivePreview: (() => void) | null = null;

  const disposePreview = () => {
    disposeActivePreview?.();
    disposeActivePreview = null;
  };

  const openPreview = (row: Row, returnCourseId: Course['id'] | null = row.course.id) => {
    disposeActivePreview = productionLinePreview.enter({
      course: row.course,
      level: row.level,
      line: row.variation,
      practiceAvailable: Boolean(progressByCourse) && isTrainableVariation(row.variation),
      onIntent: (intent) => {
        if (intent.type === 'back') {
          disposePreview();
          void navigate({ name: 'browse', ...(returnCourseId ? { courseId: returnCourseId } : {}) });
          return;
        }
        if (!progressByCourse) return;
        disposePreview();
        void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
      },
    });
  };

  const drawIndex = () => {
    disposePreview();
    const visible = rows.filter((row) => matches(row, filters));
    const courseChips = [{ id: 'all' as const, label: 'All courses' }, ...COURSES.map((course) => ({ id: course.id, label: course.name }))]
      .map((chip) => `<button class="filter-chip ${filters.course === chip.id ? 'is-active' : ''}" data-course-filter="${chip.id}" aria-pressed="${filters.course === chip.id}">${escapeHtml(chip.label)}</button>`).join('');
    const stateChipButtons = [{ id: 'all' as const, label: 'All' }, { id: 'banked' as const, label: 'Due' }, { id: 'untouched' as const, label: 'Unbanked' }, { id: 'mastered' as const, label: 'Mastered' }, { id: 'reference' as const, label: 'Reference' }]
      .map((chip) => `<button class="filter-chip ${filters.state === chip.id ? 'is-active' : ''}" data-state-filter="${chip.id}" aria-pressed="${filters.state === chip.id}"${progressByCourse ? '' : ' disabled'}>${chip.label}</button>`).join('');
    const note = progressByCourse ? '' : '<p class="browse-note">Progress is unavailable, so line states are hidden. The lines below are still complete.</p>';
    const list = visible.length
      ? `<div class="browse-list">${visible.map(rowMarkup).join('')}</div>`
      : '<p class="browse-note browse-empty">No lines match your search or filters.</p>';
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' }, links: [{ id: 'lines', label: 'Lines' }] })}<section class="browse-page"><p class="eyebrow">Browse &amp; study</p><h1>Read any line, any time.</h1><p class="lede">Every bundled line is searchable. Study is progress-neutral; trainable lines can be opened directly at any level.</p>${note}<label class="browse-search">Search repertoire<input id="browse-search" type="search" value="${escapeHtml(filters.query)}" placeholder="Opening, line, or role" autocomplete="off"></label><div class="filter-chips">${courseChips}</div><div class="filter-chips">${stateChipButtons}</div>${list}</section></main>`;
    app.querySelector('.browse-page > .eyebrow')?.replaceChildren('Repertoire');
    app.querySelector('.browse-page > h1')?.replaceChildren('Browse your lines.');
    app.querySelector('.browse-page > .lede')?.replaceChildren('Keep the repertoire small enough to recall. Search by Course or line name.');

    document.querySelector('#back-dashboard')!.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    app.querySelectorAll<HTMLButtonElement>('[data-course-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.course = button.dataset.courseFilter as Filters['course'];
      drawIndex();
    }));
    app.querySelectorAll<HTMLButtonElement>('[data-state-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.state = button.dataset.stateFilter as Filters['state'];
      drawIndex();
    }));
    app.querySelector<HTMLInputElement>('#browse-search')?.addEventListener('input', (event) => {
      filters.query = (event.target as HTMLInputElement).value;
      drawIndex();
      const input = app.querySelector<HTMLInputElement>('#browse-search');
      input?.focus();
      input?.setSelectionRange(filters.query.length, filters.query.length);
    });
    app.querySelectorAll<HTMLButtonElement>('[data-line]').forEach((button, index) => button.addEventListener('click', () => {
      const row = visible[index];
      if (!row) return;
      void navigate({ name: 'browse', courseId: row.course.id, lineId: row.variation.id });
    }));
  };

  if (screen.lineId) {
    const row = rows.find((candidate) => candidate.variation.id === screen.lineId && (!screen.courseId || candidate.course.id === screen.courseId));
    if (row) {
      openPreview(row, screen.courseId ?? row.course.id);
      return;
    }
  }
  drawIndex();
}
