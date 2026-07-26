import { Chess } from 'chess.js';
import { COURSES, LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { renderBoard, renderEvalBar } from '../board-view';
import { engine } from '../engine/engine-client';
import type { EvalScore } from '../engine/eval-scale';
import { lineState, type LineState } from '../mastery';
import { loadProgress, type CourseProgress } from '../progress';
import { signOutUser } from '../firebase';
import { app, escapeHtml, levelNames, resetPageScroll, sideNames, topbarMarkup } from './shell';
import type { BrowseScreen, Navigate } from './navigation';

type Row = { course: Course; level: LevelKey; variation: Variation; state: LineState | null };

const stateChips: Record<LineState, string> = { untouched: 'Untouched', banked: 'Due', mastered: 'Mastered' };

type Filters = { course: Course['id'] | 'all'; state: LineState | 'all' };

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
  return true;
}

function rowMarkup(row: Row): string {
  const chip = row.state ? `<span class="browse-chip is-${row.state}">${stateChips[row.state]}</span>` : '';
  return `<button class="browse-row" data-line="${row.variation.id}"><span class="browse-line"><strong>${escapeHtml(row.variation.title)}</strong><small>${escapeHtml(row.course.name)} - ${levelNames[row.level]} - ${row.variation.kind}</small></span><span class="browse-meta"><span>${row.variation.positions.length} moves</span><code>${row.variation.evalCp > 0 ? '+' : ''}${(row.variation.evalCp / 100).toFixed(2)}</code>${chip}</span></button>`;
}

export async function renderBrowse(navigate: Navigate, email: string | null, screen: BrowseScreen): Promise<void> {
  resetPageScroll();
  engine.reset();
  app.innerHTML = '<main class="loading-page"><p class="eyebrow">Reading your repertoire</p><div class="loading-line"></div></main>';

  let progressByCourse: Record<Course['id'], CourseProgress> | null = null;
  try {
    const entries = await Promise.all(COURSES.map(async (course) => [course.id, await loadProgress(course.id)] as const));
    progressByCourse = Object.fromEntries(entries) as Record<Course['id'], CourseProgress>;
  } catch {
    progressByCourse = null;
  }

  const rows = buildRows(progressByCourse);
  const filters: Filters = { course: screen.courseId ?? 'all', state: 'all' };

  const drawIndex = () => {
    const visible = rows.filter((row) => matches(row, filters));
    const courseChips = [{ id: 'all' as const, label: 'All courses' }, ...COURSES.map((course) => ({ id: course.id, label: course.name }))]
      .map((chip) => `<button class="filter-chip ${filters.course === chip.id ? 'is-active' : ''}" data-course-filter="${chip.id}" aria-pressed="${filters.course === chip.id}">${escapeHtml(chip.label)}</button>`).join('');
    const stateChipButtons = [{ id: 'all' as const, label: 'All' }, { id: 'banked' as const, label: 'Due' }, { id: 'untouched' as const, label: 'Unbanked' }, { id: 'mastered' as const, label: 'Mastered' }]
      .map((chip) => `<button class="filter-chip ${filters.state === chip.id ? 'is-active' : ''}" data-state-filter="${chip.id}" aria-pressed="${filters.state === chip.id}"${progressByCourse ? '' : ' disabled'}>${chip.label}</button>`).join('');
    const note = progressByCourse ? '' : '<p class="browse-note">Progress is unavailable, so line states are hidden. The lines below are still complete.</p>';
    const list = visible.length
      ? `<div class="browse-list">${visible.map(rowMarkup).join('')}</div>`
      : '<p class="browse-note">No lines match those filters.</p>';
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' } })}<section class="browse-page"><p class="eyebrow">Browse &amp; study</p><h1>Read any line, any time.</h1><p class="lede">Every line in the repertoire, locked or not. Stepping through a line here changes no progress.</p>${note}<div class="filter-chips">${courseChips}</div><div class="filter-chips">${stateChipButtons}</div>${list}</section></main>`;

    document.querySelector('#back-dashboard')!.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
    app.querySelectorAll<HTMLButtonElement>('[data-course-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.course = button.dataset.courseFilter as Filters['course'];
      drawIndex();
    }));
    app.querySelectorAll<HTMLButtonElement>('[data-state-filter]').forEach((button) => button.addEventListener('click', () => {
      filters.state = button.dataset.stateFilter as Filters['state'];
      drawIndex();
    }));
    app.querySelectorAll<HTMLButtonElement>('[data-line]').forEach((button) => button.addEventListener('click', () => {
      const row = rows.find((candidate) => candidate.variation.id === button.dataset.line);
      if (row) openWalker(row);
    }));
  };

  const openWalker = (row: Row) => {
    let index = 0;
    let evalScore: EvalScore | null = null;
    const positions = row.variation.positions;
    const unlocked = progressByCourse
      ? LEVELS.indexOf(row.level) <= progressByCourse[row.course.id].unlockedLevel
      : false;

    const drawWalker = () => {
      const position = positions[index];
      const chess = new Chess(position.fen);
      const guide = { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) };
      const moves = positions.map((entry, entryIndex) => `<li class="walker-move ${entryIndex === index ? 'is-current' : ''}">${String(entryIndex + 1).padStart(2, '0')} ${escapeHtml(entry.expectedSan)}</li>`).join('');
      app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'walker-back', label: 'Browse' } })}<section class="walker"><div class="walker-copy"><p class="eyebrow">${escapeHtml(row.course.name)} &middot; ${levelNames[row.level]} &middot; move ${index + 1} of ${positions.length}</p><span class="side-tag">${sideNames[row.course.side]}</span><p class="line-title">${escapeHtml(row.variation.title)}</p><p class="lede">${escapeHtml(row.variation.summary)}</p><div class="explanation"><span class="explanation-mark">Why</span><p>${escapeHtml(position.explanation)}</p></div><ol class="walker-moves">${moves}</ol><div class="walker-actions"><button id="walker-prev" class="quiet-button"${index === 0 ? ' disabled' : ''}>&lt;- Previous</button><button id="walker-next" class="quiet-button"${index === positions.length - 1 ? ' disabled' : ''}>Next -&gt;</button>${unlocked ? '<button id="walker-practice">Practice this level</button>' : ''}</div><p class="walker-note">Studying only. Nothing here changes your progress.</p></div><div class="board-panel">${renderEvalBar(evalScore, engine.status)}<div class="board-frame">${renderBoard(chess, null, row.course.side, guide, null, null, false, true, row.course.side === 'white' ? 'w' : 'b')}</div><div class="board-caption"><span>${escapeHtml(position.expectedSan)} is the move</span><span>Move ${index + 1} of ${positions.length}</span></div></div></section></main>`;

      document.querySelector('#walker-back')!.addEventListener('click', () => drawIndex());
      document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
      document.querySelector('#walker-prev')?.addEventListener('click', () => step(-1));
      document.querySelector('#walker-next')?.addEventListener('click', () => step(1));
      document.querySelector('#walker-practice')?.addEventListener('click', () => {
        if (!progressByCourse) return;
        void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id] });
      });

      const fen = position.fen;
      void engine.evaluate(fen, row.course.side === 'white' ? 'w' : 'b').then((score) => {
        if (positions[index]?.fen !== fen) return;
        if (score === null) {
          if (engine.status !== 'unavailable') return;
          evalScore = null;
        } else {
          evalScore = score;
        }
        const panel = app.querySelector('.board-panel');
        if (!panel) return;
        const existing = panel.querySelector('.eval-bar, .eval-note');
        const next = document.createRange().createContextualFragment(renderEvalBar(evalScore, engine.status)).firstElementChild;
        if (!next) return;
        if (existing) existing.replaceWith(next);
        else panel.prepend(next);
      });
    };

    const step = (delta: number) => {
      const next = index + delta;
      if (next < 0 || next >= positions.length) return;
      index = next;
      drawWalker();
    };

    const onKey = (event: KeyboardEvent) => {
      if (!app.querySelector('.walker')) {
        window.removeEventListener('keydown', onKey);
        return;
      }
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };

    window.addEventListener('keydown', onKey);
    drawWalker();
  };

  if (screen.lineId) {
    const row = rows.find((candidate) => candidate.variation.id === screen.lineId);
    if (row) {
      openWalker(row);
      return;
    }
  }
  drawIndex();
}
