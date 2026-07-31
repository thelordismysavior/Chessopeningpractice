import { LEVELS, type Course, type LevelKey, type Variation } from '../courses';
import { loadProgress, type CourseProgress } from '../progress';
import { courseRepertoireLines, isTrainableVariation, lineStatusLabel, roleNames, sortRepertoireLines, type LineSort, type RepertoireLine } from '../repertoire';
import { app, escapeHtml, levelNames, resetPageScroll, sideNames, topbarMarkup } from './shell';
import type { Navigate, Screen } from './navigation';

function lineRow(line: RepertoireLine): string {
  const { variation } = line;
  const status = lineStatusLabel(line);
  const action = line.state === 'reference' ? 'Study' : line.state === 'untouched' ? 'Preview' : 'Practice';
  return `<button class="course-line-row" data-line-id="${escapeHtml(variation.id)}"><span class="course-line-main"><strong>${escapeHtml(variation.title)}</strong><small>${escapeHtml(variation.summary)}</small></span><span class="line-role role-${variation.kind}">${roleNames[variation.kind]}</span><span class="line-status is-${line.state}">${status}</span><span class="course-line-action">${action} &rarr;</span></button>`;
}

function levelStart(course: Course, level: LevelKey): Variation | undefined {
  return course.lessons[level].variations.find((variation) => variation.kind === 'core')
    ?? course.lessons[level].variations.find(isTrainableVariation);
}

export async function renderCourse(navigate: Navigate, email: string | null, screen: Extract<Screen, { name: 'course' }>): Promise<void> {
  const { course } = screen;
  let progress: CourseProgress = screen.progress;
  let sort: LineSort = 'recommended';
  resetPageScroll();

  try {
    progress = await loadProgress(course.id);
  } catch {
    // The route already has the latest progress; keep the course readable on failure.
  }

  const render = () => {
    const lines = sortRepertoireLines(courseRepertoireLines(course, progress), sort);
    const bankedCount = lines.filter((line) => line.state === 'banked' || line.state === 'mastered').length;
    const lessonIdea = course.lessons.beginner.lessonIdea;
    const levelSections = LEVELS.map((level) => {
      const levelLines = lines.filter((line) => line.level === level);
      const start = levelStart(course, level);
      const idea = course.lessons[level].lessonIdea;
      return `<section class="course-level" data-level="${level}"><div class="course-level-heading"><div><span class="eyebrow">Level ${LEVELS.indexOf(level) + 1}</span><h3>${levelNames[level]}</h3><p>${escapeHtml(course.lessons[level].summary)}</p></div>${start ? `<button class="quiet-button" data-start-level="${level}">Start lesson</button>` : ''}</div><div class="level-lesson-idea"><strong>Lesson idea &middot; anchor ${escapeHtml(idea.anchorSan)}</strong><span>${escapeHtml(idea.plan)}</span><span><b>Trigger:</b> ${escapeHtml(idea.opponentTrigger)}</span><span><b>Then:</b> ${escapeHtml(idea.resultingPlan)}</span></div><div class="course-lines" role="list">${levelLines.map(lineRow).join('')}</div></section>`;
    }).join('');
    app.innerHTML = `<main class="app-shell course-page-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' }, links: [{ id: 'lines', label: 'Lines' }, { id: 'browse', label: 'Browse' }, { id: 'sources', label: 'Sources' }] })}<section class="course-page"><header class="course-hero"><div><p class="eyebrow">Course &middot; ${escapeHtml(course.eco)}</p><h1>${escapeHtml(course.name)}</h1><p class="lede">${escapeHtml(course.promise)}</p><p class="course-description">${escapeHtml(course.description)}</p></div><div class="course-hero-meta"><span class="side-tag">${sideNames[course.side]}</span><code>${escapeHtml(course.coreLine)}</code></div></header><section class="lesson-idea" aria-labelledby="lesson-idea-title"><div><p class="eyebrow">Lesson idea</p><h2 id="lesson-idea-title">Start from ${escapeHtml(lessonIdea.anchorSan)}.</h2><p>${escapeHtml(lessonIdea.plan)}</p></div><dl><div><dt>Opponent trigger</dt><dd>${escapeHtml(lessonIdea.opponentTrigger)}</dd></div><div><dt>Resulting plan</dt><dd>${escapeHtml(lessonIdea.resultingPlan)}</dd></div></dl></section><section class="course-levels"><div class="toolbar"><div><span class="state">${course.name.toUpperCase()}</span><h2>Named lines.</h2></div><label class="sort-control">Sort <select id="course-line-sort"><option value="recommended"${sort === 'recommended' ? ' selected' : ''}>Recommended</option><option value="level"${sort === 'level' ? ' selected' : ''}>Level</option><option value="category"${sort === 'category' ? ' selected' : ''}>Category</option><option value="status"${sort === 'status' ? ' selected' : ''}>Status</option><option value="name"${sort === 'name' ? ' selected' : ''}>Name</option></select></label></div><p class="course-sort-note">Core, alternative, and punish lines are trainable. Reference lines are for Study and never enter review.</p>${levelSections}</section></section></main>`;
    app.querySelector('.course-hero .eyebrow')?.replaceChildren(`Course · ${course.name}`);
    app.querySelector('.course-hero')?.insertAdjacentHTML('afterend', `<p class="course-summary">${lines.length} lines in this Course · ${bankedCount} banked</p>`);
    app.querySelector('#back-dashboard')?.addEventListener('click', () => void navigate({ name: 'dashboard' }));
    app.querySelector('#browse')?.addEventListener('click', () => void navigate({ name: 'browse', courseId: course.id }));
    app.querySelectorAll<HTMLButtonElement>('[data-start-level]').forEach((button) => button.addEventListener('click', () => {
      const level = button.dataset.startLevel as LevelKey;
      const variation = levelStart(course, level);
      if (variation) void navigate({ name: 'practice', course, level, progress, variationId: variation.id });
    }));
    app.querySelector<HTMLSelectElement>('#course-line-sort')?.addEventListener('change', (event) => {
      sort = (event.target as HTMLSelectElement).value as LineSort;
      render();
    });
    app.querySelectorAll<HTMLButtonElement>('[data-line-id]').forEach((button) => button.addEventListener('click', () => {
      const line = lines.find((candidate) => candidate.variation.id === button.dataset.lineId);
      if (!line) return;
      if (line.state === 'reference' || line.state === 'untouched') {
        void navigate({ name: 'browse', courseId: course.id, lineId: line.variation.id, study: line.state === 'reference' });
        return;
      }
      void navigate({ name: 'practice', course, level: line.level, progress, variationId: line.variation.id });
    }));
  };

  render();
}
