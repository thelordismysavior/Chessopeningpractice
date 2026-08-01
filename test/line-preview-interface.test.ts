import { Window } from 'happy-dom';
import { describe, expect, test, vi } from 'vitest';
import { COURSES, LEVELS } from '../src/courses';
import { renderBoard, renderEvalBar, updateBoard, updateEvalBar } from '../src/board-view';
import { effectiveMoveDuration, moveBeats } from '../src/move-settings';
import { createLinePreview, type LinePreviewDependencies, type LinePreviewIntent } from '../src/line-preview';

const course = COURSES[0];
const level = LEVELS[0];
const trainableLine = course.lessons[level].variations[0];
const referenceLine = COURSES[1].lessons[level].variations.find((variation) => variation.kind === 'reference')!;

type TestWindow = InstanceType<typeof Window>;
type ControlledWindow = LinePreviewDependencies['window'] & { flushFrame: () => boolean; flushTimer: () => boolean; hasPendingFrame: () => boolean; hasPendingTimer: () => boolean };

function installDom(): { window: TestWindow; host: HTMLDivElement } {
  const window = new Window({ url: 'http://localhost/#/browse' }) as unknown as TestWindow;
  const host = window.document.createElement('div') as unknown as HTMLDivElement;
  window.document.body.append(host as never);
  Object.assign(globalThis, {
    window: window as unknown as LinePreviewDependencies['window'],
    document: window.document,
    Element: window.Element,
    HTMLElement: window.HTMLElement,
  });
  return { window, host };
}

function controlledWindow(window: TestWindow): ControlledWindow {
  let nextId = 0;
  const frames = new Map<number, () => void>();
  const timers = new Map<number, () => void>();
  return {
    addEventListener: window.addEventListener.bind(window) as unknown as ControlledWindow['addEventListener'],
    removeEventListener: window.removeEventListener.bind(window) as unknown as ControlledWindow['removeEventListener'],
    requestAnimationFrame: (callback) => {
      const id = ++nextId;
      frames.set(id, () => callback(0));
      return id;
    },
    cancelAnimationFrame: (id) => { frames.delete(id); },
    setTimeout: (callback) => {
      const id = ++nextId;
      timers.set(id, () => (typeof callback === 'function' ? callback() : undefined));
      return id;
    },
    clearTimeout: (id: number) => { timers.delete(id); },
    hasPendingFrame: () => frames.size > 0,
    hasPendingTimer: () => timers.size > 0,
    flushFrame: () => {
      const next = frames.entries().next();
      if (next.done) return false;
      const [id, task] = next.value;
      frames.delete(id);
      task();
      return true;
    },
    flushTimer: () => {
      const next = timers.entries().next();
      if (next.done) return false;
      const [id, task] = next.value;
      timers.delete(id);
      task();
      return true;
    },
  };
}

function dependencies(window: TestWindow, engine: LinePreviewDependencies['engine'], topbarCalls: object[], previewWindow: LinePreviewDependencies['window'] = window as unknown as LinePreviewDependencies['window']): LinePreviewDependencies {
  return {
    engine,
    topbarMarkup: (options) => {
      topbarCalls.push(options);
      return `<header class="topbar"><button id="${options.back.id}">${options.back.label}</button></header>`;
    },
    renderBoard,
    updateBoard,
    renderEvalBar,
    updateEvalBar,
    escapeHtml: (value) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character),
    levelNames: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    sideNames: { white: 'W / WHITE', black: 'B / BLACK' },
    loadMoveDuration: () => 0,
    effectiveMoveDuration,
    moveBeats,
    reducedMotion: () => false,
    window: previewWindow,
  };
}

function enterPreview(line = trainableLine, practiceAvailable = true, selectedCourse = course) {
  const { window, host } = installDom();
  const engine = {
    status: 'ready' as const,
    reset: vi.fn(),
    warm: vi.fn(),
    clearMemo: vi.fn(),
    evaluate: vi.fn().mockResolvedValue({ kind: 'cp' as const, cp: 18 }),
  };
  const topbarCalls: object[] = [];
  const intents: LinePreviewIntent[] = [];
  const controller = createLinePreview(host, dependencies(window, engine, topbarCalls));
  const dispose = controller.enter({ course: selectedCourse, level, line, practiceAvailable, onIntent: (intent) => intents.push(intent) });
  return { window, host, engine, topbarCalls, intents, controller, dispose };
}

function waitForAdvance(window: TestWindow, host: HTMLDivElement): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      if (host.querySelector('.preview-move.is-current')?.textContent?.startsWith('02 ')) {
        resolve();
        return;
      }
      attempts += 1;
      if (attempts > 100) {
        reject(new Error('Line Preview did not settle on the second authored position.'));
        return;
      }
      window.setTimeout(check, 0);
    };
    check();
  });
}

describe('Line Preview interface', () => {
  test('owns the complete progress-neutral surface at the first authored position', async () => {
    const { host, engine, topbarCalls } = enterPreview();

    expect(host.querySelector('.line-preview-page')).not.toBeNull();
    expect(host.querySelector('.line-preview-shell')).not.toBeNull();
    expect(host.querySelector('.topbar')).not.toBeNull();
    expect(host.querySelector('.line-preview-copy')?.textContent).toContain(trainableLine.summary);
    expect(host.querySelector('.lesson-idea')?.textContent).toContain('Opponent trigger');
    expect(host.querySelector('.preview-guide')?.textContent).toContain(trainableLine.positions[0].expectedSan);
    expect(host.querySelector('.board')).not.toBeNull();
    expect(host.querySelector('.eval-bar')).not.toBeNull();
    expect(host.querySelector('.preview-note')?.textContent).toContain('Nothing here changes your progress.');
    expect(host.querySelector('#preview-prev')?.hasAttribute('disabled')).toBe(true);
    expect(host.querySelector('#preview-next')?.hasAttribute('disabled')).toBe(false);
    expect(topbarCalls).toEqual([{ back: { id: 'preview-back', label: 'Browse' } }]);
    expect(engine.clearMemo).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });

  test('navigates manually and emits semantic Back and Practice intents', async () => {
    const { window, host, intents } = enterPreview();

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    await waitForAdvance(window, host);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
    expect(host.querySelector('#preview-prev')?.hasAttribute('disabled')).toBe(false);

    host.querySelector<HTMLButtonElement>('#preview-practice')!.click();
    expect(intents).toEqual([{ type: 'practice' }]);

    const back = host.querySelector<HTMLButtonElement>('#preview-back')!;
    back.click();
    expect(intents).toEqual([{ type: 'practice' }]);

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
  });

  test('does not offer Practice for a reference line', () => {
    const { host, intents } = enterPreview(referenceLine, true, COURSES[1]);

    expect(host.querySelector('#preview-practice')).toBeNull();
    expect(host.querySelector('.preview-note')?.textContent).toContain('Nothing here changes your progress.');
    expect(intents).toEqual([]);
  });

  test('validates before replacing a valid active session', () => {
    const { host, controller } = enterPreview();
    const invalidLine = { ...trainableLine, positions: [] };
    const invalidCourse = {
      ...course,
      lessons: {
        ...course.lessons,
        [level]: { ...course.lessons[level], variations: [invalidLine, ...course.lessons[level].variations] },
      },
    };

    expect(() => controller.enter({ course: invalidCourse, level, line: invalidLine, practiceAvailable: true, onIntent: () => undefined })).toThrow('at least one authored position');
    expect(host.querySelector('h1')?.textContent).toContain(trainableLine.title);
  });

  test('keeps a newer entry alive when an older disposer is called', async () => {
    const { window, host, controller, dispose: disposeFirst } = enterPreview();
    const disposeSecond = controller.enter({
      course: COURSES[1],
      level,
      line: referenceLine,
      practiceAvailable: false,
      onIntent: () => undefined,
    });

    disposeFirst();
    expect(host.querySelector('h1')?.textContent).toContain(referenceLine.title);
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await waitForAdvance(window, host);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);

    disposeSecond();
    disposeSecond();
    host.querySelector<HTMLButtonElement>('#preview-prev')?.click();
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
  });

  test('makes animation, Move Beat, and engine work inert after disposal', async () => {
    const { window, host } = installDom();
    const previewWindow = controlledWindow(window);
    let resolveEvaluation: (score: { kind: 'cp'; cp: number }) => void = () => undefined;
    const engine = {
      status: 'ready' as const,
      reset: vi.fn(),
      warm: vi.fn(),
      clearMemo: vi.fn(),
      evaluate: vi.fn(() => new Promise<{ kind: 'cp'; cp: number }>((resolve) => { resolveEvaluation = resolve; })),
    };
    let moveDuration = 200;
    const dependenciesForTiming = {
      ...dependencies(window, engine, [], previewWindow),
      loadMoveDuration: () => moveDuration,
      effectiveMoveDuration: (storedDuration: number) => storedDuration,
      moveBeats: () => ({ beforeReply: 100, afterReply: 100 }),
    };
    const controller = createLinePreview(host, dependenciesForTiming);
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });
    const initialEvalText = host.querySelector('.eval-bar')?.textContent;

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    expect(previewWindow.hasPendingFrame()).toBe(true);
    controller.dispose();
    expect(previewWindow.flushFrame()).toBe(false);
    resolveEvaluation({ kind: 'cp', cp: 18 });
    await Promise.resolve();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
    expect(host.querySelector('.eval-bar')?.textContent).toBe(initialEvalText);

    moveDuration = 0;
    engine.evaluate.mockResolvedValue({ kind: 'cp', cp: 18 });
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });
    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(previewWindow.hasPendingTimer()).toBe(true);
    controller.dispose();
    expect(previewWindow.flushTimer()).toBe(false);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
  });
});
