import { Chess } from 'chess.js';
import { COURSES, LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { renderBoard, renderEvalBar, updateBoard, updateEvalBar, type BoardAnimation, type BoardState } from '../board-view';
import { engine } from '../engine/engine-client';
import type { EvalScore } from '../engine/eval-scale';
import { lineState, type LineState } from '../mastery';
import { effectiveMoveDuration, loadMoveDuration, moveBeats } from '../move-settings';
import { planLinePreviewAdvance } from '../line-preview';
import { loadProgress, type CourseProgress } from '../progress';
import { isTrainableVariation, roleNames } from '../repertoire';
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
  let previewGeneration = 0;
  let removePreviewKeyListener: (() => void) | null = null;

  const disposePreview = () => {
    previewGeneration += 1;
    removePreviewKeyListener?.();
    removePreviewKeyListener = null;
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
      const returnCourseId = filters.course === 'all' ? undefined : filters.course;
      openPreview(row, returnCourseId ?? null);
      void navigate({ name: 'browse', courseId: row.course.id, lineId: row.variation.id });
    }));
  };

  const openPreview = (row: Row, returnCourseId: Course['id'] | null = row.course.id) => {
    disposePreview();
    const generation = previewGeneration;
    engine.clearMemo();
    const positions = row.variation.positions;
    const idea = row.course.lessons[row.level].lessonIdea;
    const selectableColor = row.course.side === 'white' ? 'w' : 'b';
    let index = 0;
    let busy = false;
    let leaving = false;
    let displayFen: string | null = null;
    let animation: BoardAnimation | null = null;
    let boardEl: HTMLDivElement | null = null;
    let evalEl: HTMLElement | null = null;
    let evalScore: EvalScore | null = null;
    let evalFen: string | null = null;
    let evaluationToken = 0;
    const moveDuration = loadMoveDuration();

    const currentFen = () => displayFen ?? positions[Math.min(index, positions.length - 1)].fen;
    const isCompleted = () => index >= positions.length;
    const stillCurrent = (token: number, fen: string) => !leaving && generation === previewGeneration && token === evaluationToken && currentFen() === fen;

    const drawPreview = () => {
      if (generation !== previewGeneration || leaving) return;
      const completed = isCompleted();
      const position = positions[Math.min(index, positions.length - 1)];
      const fen = currentFen();
      const chess = new Chess(animation?.plan.fromFen ?? fen);
      const guide = !busy && !completed ? { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) } : null;
      const moveList = positions.map((entry, entryIndex) => `<li class="preview-move ${entryIndex === index ? 'is-current' : ''}"${entryIndex === index ? ' aria-current="step"' : ''}>${String(entryIndex + 1).padStart(2, '0')} ${escapeHtml(entry.expectedSan)}</li>`).join('');
      const boardState: BoardState = {
        chess,
        selected: null,
        side: row.course.side,
        guide,
        route: null,
        animation,
        dragging: false,
        settling: busy,
        interactive: false,
        selectableColor,
      };
      const status = busy ? 'Playing move' : completed ? 'Preview complete' : `${position.expectedSan} is the move`;
      const controls = completed
        ? `<button id="preview-prev" class="quiet-button"${index === 0 ? ' disabled' : ''}>Previous</button><button id="preview-restart">Restart Preview</button>`
        : `<button id="preview-prev" class="quiet-button"${index === 0 || busy ? ' disabled' : ''}>Previous</button><button id="preview-next"${busy ? ' disabled' : ''}>Next</button>`;
      const practice = isTrainableVariation(row.variation)
        ? '<button id="preview-practice" class="quiet-button">Practice This Line</button>'
        : '';
      const completeCopy = completed
        ? '<div class="preview-complete" role="status" aria-live="polite"><strong>Line Preview complete.</strong><span>You can restart the walkthrough or begin practice.</span></div>'
        : `<div class="preview-guide"><span class="explanation-mark">Current authored move</span><strong>${escapeHtml(position.expectedSan)}</strong><p>${escapeHtml(position.explanation)}</p></div>`;
      const nextMain = document.createRange().createContextualFragment(`<main class="app-shell line-preview-page"><div class="line-preview-shell">${topbarMarkup({ email, back: { id: 'preview-back', label: 'Browse' } })}<section class="line-preview-layout"><div class="line-preview-copy"><p class="eyebrow">Line Preview &middot; ${escapeHtml(row.course.name)} &middot; ${levelNames[row.level]}${completed ? '' : ` &middot; move ${index + 1} of ${positions.length}`}</p><span class="side-tag">${sideNames[row.course.side]}</span><h1>${escapeHtml(row.variation.title)}</h1><p class="lede">${escapeHtml(row.variation.summary)}</p><article class="lesson-idea"><div><p class="eyebrow">Lesson idea</p><h2>Anchor: ${escapeHtml(idea.anchorSan)}</h2><p>${escapeHtml(idea.plan)}</p></div><dl><div><dt>Opponent trigger</dt><dd>${escapeHtml(idea.opponentTrigger)}</dd></div><div><dt>Resulting plan</dt><dd>${escapeHtml(idea.resultingPlan)}</dd></div></dl></article>${completeCopy}<ol class="preview-moves" aria-label="Authored move guide">${moveList}</ol><div class="preview-actions" aria-busy="${busy}">${controls}${practice}</div><p class="preview-note">Preview only. Nothing here changes your progress.</p></div><div class="board-panel"><div class="eval-host"></div><div class="board-frame"></div><div class="board-caption" aria-live="polite"><span>${escapeHtml(status)}</span><span>${completed ? 'Complete' : `Move ${index + 1} of ${positions.length}`}</span></div></div></section></div></main>`).firstElementChild as HTMLElement;
      const panel = nextMain.querySelector<HTMLElement>('.board-panel');
      const evalHost = nextMain.querySelector<HTMLElement>('.eval-host');
      if (panel && evalHost) {
        if (!evalEl) evalEl = document.createRange().createContextualFragment(renderEvalBar(evalScore, engine.status)).firstElementChild as HTMLElement;
        evalHost.append(evalEl);
        updateEvalBar(panel, evalScore, engine.status);
        evalEl = panel.querySelector<HTMLElement>('.eval-bar, .eval-note');
      }
      const frame = nextMain.querySelector<HTMLDivElement>('.board-frame');
      if (frame) {
        if (!boardEl) boardEl = document.createRange().createContextualFragment(renderBoard(boardState)).firstElementChild as HTMLDivElement;
        frame.append(boardEl);
        updateBoard(boardEl, boardState);
      }
      app.append(nextMain);
      Array.from(app.children).forEach((child) => { if (child !== nextMain) child.remove(); });

      nextMain.querySelector<HTMLButtonElement>('#preview-back')?.addEventListener('click', () => {
        leaving = true;
        disposePreview();
        void navigate({ name: 'browse', ...(returnCourseId ? { courseId: returnCourseId } : {}) });
      });
      nextMain.querySelector<HTMLButtonElement>('#preview-prev')?.addEventListener('click', () => {
        if (busy || index <= 0) return;
        index -= 1;
        displayFen = null;
        evalFen = null;
        evalScore = null;
        evaluationToken += 1;
        drawPreview();
      });
      nextMain.querySelector<HTMLButtonElement>('#preview-next')?.addEventListener('click', () => void advance());
      nextMain.querySelector<HTMLButtonElement>('#preview-restart')?.addEventListener('click', () => {
        if (busy) return;
        index = 0;
        displayFen = null;
        evalFen = null;
        evalScore = null;
        evaluationToken += 1;
        drawPreview();
      });
      nextMain.querySelector<HTMLButtonElement>('#preview-practice')?.addEventListener('click', () => {
        if (!progressByCourse) return;
        leaving = true;
        disposePreview();
        void navigate({ name: 'practice', course: row.course, level: row.level, progress: progressByCourse[row.course.id], variationId: row.variation.id });
      });

      if (!busy && evalFen !== fen) {
        evalFen = fen;
        evalScore = null;
        const token = ++evaluationToken;
        const paint = (score: EvalScore | null) => {
          if (!stillCurrent(token, fen)) return;
          if (panel) updateEvalBar(panel, score, engine.status);
        };
        void engine.evaluate(fen, selectableColor, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? undefined : paint).then((score) => {
          if (!stillCurrent(token, fen)) return;
          if (score === null && engine.status !== 'unavailable') return;
          evalScore = score;
          paint(score);
        });
      }
    };

    const nextFrame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

    const playPhase = async (plan: NonNullable<ReturnType<typeof planLinePreviewAdvance>>['authored'], duration: number) => {
      animation = { plan, arrived: false, duration };
      drawPreview();
      if (duration === 0) {
        animation = null;
        displayFen = plan.afterFen;
        drawPreview();
        return;
      }
      await nextFrame();
      if (leaving || generation !== previewGeneration) return;
      animation.arrived = true;
      app.querySelectorAll<HTMLElement>('.animated-piece').forEach((piece) => piece.classList.add('is-arrived'));
      await wait(duration);
      if (leaving || generation !== previewGeneration) return;
      animation = null;
      displayFen = plan.afterFen;
      drawPreview();
    };

    const advance = async () => {
      if (busy || isCompleted()) return;
      const plan = planLinePreviewAdvance(positions, index);
      if (!plan) return;
      busy = true;
      displayFen = null;
      evalFen = null;
      evalScore = null;
      evaluationToken += 1;
      drawPreview();
      const duration = effectiveMoveDuration(moveDuration, window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const beats = moveBeats(moveDuration, false);
      await playPhase(plan.authored, duration);
      if (leaving || generation !== previewGeneration) return;
      if (plan.reply) {
        await wait(beats.beforeReply);
        if (leaving || generation !== previewGeneration) return;
        await playPhase(plan.reply, duration);
        if (leaving || generation !== previewGeneration) return;
        await wait(beats.afterReply);
      }
      if (leaving || generation !== previewGeneration) return;
      displayFen = plan.settledFen;
      index = plan.nextIndex ?? positions.length;
      animation = null;
      busy = false;
      drawPreview();
    };

    const onKey = (event: KeyboardEvent) => {
      if (!app.querySelector('.line-preview-page') || event.defaultPrevented) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        app.querySelector<HTMLButtonElement>('#preview-prev')?.click();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        app.querySelector<HTMLButtonElement>('#preview-next')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    removePreviewKeyListener = () => window.removeEventListener('keydown', onKey);
    drawPreview();
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
