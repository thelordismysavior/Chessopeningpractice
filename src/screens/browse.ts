import { Chess } from 'chess.js';
import { COURSES, LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { renderBoard, renderEvalBar, updateEvalBar } from '../board-view';
import { engine } from '../engine/engine-client';
import type { EvalScore } from '../engine/eval-scale';
import { lineState, type LineState } from '../mastery';
import { loadProgress, type CourseProgress } from '../progress';
import { isReferenceVariation, isTrainableVariation, roleNames } from '../repertoire';
import { app, escapeHtml, levelNames, resetPageScroll, sideNames, topbarMarkup } from './shell';
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
  engine.reset();
  engine.warm();
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
  let walkerGeneration = 0;
  let removeWalkerKeyListener: (() => void) | null = null;

  const disposeWalker = () => {
    walkerGeneration += 1;
    removeWalkerKeyListener?.();
    removeWalkerKeyListener = null;
  };

  const drawIndex = () => {
    disposeWalker();
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
      if (row) {
        if (row.state === 'untouched' && isTrainableVariation(row.variation)) openConcept(row);
        else if (row.state === 'reference' || !progressByCourse) openWalker(row);
        else {
          void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
          return;
        }
        void navigate({ name: 'browse', courseId: row.course.id, lineId: row.variation.id, study: row.state !== 'untouched' });
      }
    }));
  };

  const openConcept = (row: Row) => {
    disposeWalker();
    const idea = row.course.lessons[row.level].lessonIdea;
    const preview = row.variation.positions.map((position, index) => `<li>${String(index + 1).padStart(2, '0')} ${escapeHtml(position.expectedSan)}</li>`).join('');
    app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'concept-back', label: 'Browse' } })}<section class="line-concept"><div><p class="eyebrow">${escapeHtml(row.course.name)} &middot; ${levelNames[row.level]} &middot; ${roleNames[row.variation.kind]}</p><h1>${escapeHtml(row.variation.title)}</h1><p class="lede">${escapeHtml(row.variation.summary)}</p><article class="lesson-idea"><div><p class="eyebrow">Lesson idea</p><h2>Anchor: ${escapeHtml(idea.anchorSan)}</h2><p>${escapeHtml(idea.plan)}</p></div><dl><div><dt>Opponent trigger</dt><dd>${escapeHtml(idea.opponentTrigger)}</dd></div><div><dt>Resulting plan</dt><dd>${escapeHtml(idea.resultingPlan)}</dd></div></dl></article><div class="line-concept-actions"><button id="start-line-lesson">Start lesson</button><button id="study-line" class="quiet-button">Study preview</button></div></div><div class="line-preview"><span class="state">MOVE PREVIEW</span><ol>${preview}</ol><p>One authored move at each position. The lesson will teach this line before recall.</p></div></section></main>`;
    app.querySelector('#concept-back')?.addEventListener('click', () => { drawIndex(); void navigate({ name: 'browse', courseId: screen.courseId }); });
    app.querySelector('#start-line-lesson')?.addEventListener('click', () => {
      if (!progressByCourse) return;
      void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
    });
    app.querySelector('#study-line')?.addEventListener('click', () => { openWalker(row); void navigate({ name: 'browse', courseId: row.course.id, lineId: row.variation.id, study: true }); });
  };

  const openWalker = (row: Row) => {
    disposeWalker();
    const generation = walkerGeneration;
    engine.clearMemo();
    let index = 0;
    let evalScore: EvalScore | null = null;
    const positions = row.variation.positions;
    const drawWalker = () => {
      if (generation !== walkerGeneration) return;
      const position = positions[index];
      const chess = new Chess(position.fen);
      const guide = { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) };
      const moves = positions.map((entry, entryIndex) => `<li class="walker-move ${entryIndex === index ? 'is-current' : ''}">${String(entryIndex + 1).padStart(2, '0')} ${escapeHtml(entry.expectedSan)}</li>`).join('');
      const boardState = { chess, selected: null, side: row.course.side, guide, route: null, animation: null, dragging: false, settling: false, interactive: false, selectableColor: row.course.side === 'white' ? 'w' as const : 'b' as const };
      const canPractice = isTrainableVariation(row.variation);
      const mode = isReferenceVariation(row.variation) ? 'Study' : 'Preview';
      app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'walker-back', label: 'Browse' } })}<section class="walker"><div class="walker-copy"><p class="eyebrow">${mode} &middot; ${escapeHtml(row.course.name)} &middot; ${levelNames[row.level]} &middot; move ${index + 1} of ${positions.length}</p><span class="side-tag">${sideNames[row.course.side]}</span><p class="line-title">${escapeHtml(row.variation.title)}</p><p class="lede">${escapeHtml(row.variation.summary)}</p><div class="explanation"><span class="explanation-mark">Why</span><p>${escapeHtml(position.explanation)}</p></div><ol class="walker-moves">${moves}</ol><div class="walker-actions"><button id="walker-prev" class="quiet-button"${index === 0 ? ' disabled' : ''}>&lt;- Previous</button><button id="walker-next" class="quiet-button"${index === positions.length - 1 ? ' disabled' : ''}>Next -&gt;</button>${canPractice ? '<button id="walker-practice">Practice this line</button>' : ''}</div><p class="walker-note">${isReferenceVariation(row.variation) ? 'Study only. Nothing here changes your progress.' : 'Preview only. Nothing here changes your progress.'}</p></div><div class="board-panel">${renderEvalBar(evalScore, engine.status)}<div class="board-frame">${renderBoard(boardState)}</div><div class="board-caption"><span>${escapeHtml(position.expectedSan)} is the move</span><span>Move ${index + 1} of ${positions.length}</span></div></div></section></main>`;

      document.querySelector('#walker-back')!.addEventListener('click', () => {
        drawIndex();
        void navigate({ name: 'browse' });
      });
      document.querySelector('#walker-prev')?.addEventListener('click', () => step(-1));
      document.querySelector('#walker-next')?.addEventListener('click', () => step(1));
      document.querySelector('#walker-practice')?.addEventListener('click', () => {
        if (!progressByCourse) return;
        disposeWalker();
        void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
      });

      const fen = position.fen;
      const panel = app.querySelector('.board-panel');
      const paint = (score: EvalScore | null) => {
        if (generation !== walkerGeneration || positions[index]?.fen !== fen) return;
        if (panel) updateEvalBar(panel, score, engine.status);
      };
      void engine.evaluate(fen, row.course.side === 'white' ? 'w' : 'b', window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : paint).then((score) => {
        if (generation !== walkerGeneration || positions[index]?.fen !== fen) return;
        if (score === null) {
          if (engine.status !== 'unavailable') return;
          evalScore = null;
        } else {
          evalScore = score;
        }
        paint(score);
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
        disposeWalker();
        return;
      }
      if (event.key === 'ArrowLeft') step(-1);
      if (event.key === 'ArrowRight') step(1);
    };

    window.addEventListener('keydown', onKey);
    removeWalkerKeyListener = () => window.removeEventListener('keydown', onKey);
    drawWalker();
  };

  if (screen.lineId) {
    const row = rows.find((candidate) => (
      candidate.variation.id === screen.lineId
      && (!screen.courseId || candidate.course.id === screen.courseId)
    ));
    if (row) {
      if (row.state === 'untouched' && isTrainableVariation(row.variation) && !screen.study) openConcept(row);
      else if (row.state && row.state !== 'reference' && progressByCourse && !screen.study) {
        void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
        return;
      }
      else openWalker(row);
      return;
    }
  }
  drawIndex();
}
