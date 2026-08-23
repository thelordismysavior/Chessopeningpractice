import { Window } from 'happy-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { COURSES, LEVELS } from '../src/courses';
import { boardPerspectiveForSide, renderBoard, renderEvalBar, updateBoard, updateEvalBar } from '../src/board-view';
import { effectiveMoveDuration, moveBeats } from '../src/move-settings';
import { createLinePreview, disposeActiveLinePreview, type LinePreviewDependencies, type LinePreviewIntent } from '../src/line-preview';

const course = COURSES[0];
const level = LEVELS[0];
const trainableLine = course.lessons[level].variations[0];
const referenceLine = COURSES[1].lessons[level].variations.find((variation) => variation.kind === 'reference')!;

type TestWindow = InstanceType<typeof Window>;
type ControlledWindow = LinePreviewDependencies['timing']['window'] & {
  flushFrame: () => boolean;
  flushTimer: () => boolean;
  hasPendingFrame: () => boolean;
  hasPendingTimer: () => boolean;
  pendingTimerDelays: () => number[];
};

function installDom(): { window: TestWindow; host: HTMLDivElement } {
  const window = new Window({ url: 'http://localhost/#/browse' }) as unknown as TestWindow;
  const host = window.document.createElement('div') as unknown as HTMLDivElement;
  window.document.body.append(host as never);
  Object.assign(globalThis, {
    window: window as unknown as LinePreviewDependencies['timing']['window'],
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
  const timerDelays = new Map<number, number>();
  return {
    addEventListener: window.addEventListener.bind(window) as unknown as ControlledWindow['addEventListener'],
    removeEventListener: window.removeEventListener.bind(window) as unknown as ControlledWindow['removeEventListener'],
    requestAnimationFrame: (callback) => {
      const id = ++nextId;
      frames.set(id, () => callback(0));
      return id;
    },
    cancelAnimationFrame: (id) => { frames.delete(id); },
    setTimeout: (callback, milliseconds) => {
      const id = ++nextId;
      timers.set(id, () => (typeof callback === 'function' ? callback() : undefined));
      timerDelays.set(id, milliseconds ?? 0);
      return id;
    },
    clearTimeout: (id: number) => { timers.delete(id); timerDelays.delete(id); },
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
      timerDelays.delete(id);
      task();
      return true;
    },
    pendingTimerDelays: () => [...timerDelays.values()],
  };
}

function dependencies(window: TestWindow, engine: LinePreviewDependencies['engine'], topbarCalls: object[], timingWindow: LinePreviewDependencies['timing']['window'] = window as unknown as LinePreviewDependencies['timing']['window'], options: { duration?: number; reducedMotion?: boolean; beats?: { beforeReply: number; afterReply: number } } = {}): LinePreviewDependencies {
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
    timing: {
      loadMoveDuration: () => options.duration ?? 0,
      effectiveMoveDuration: (storedDuration, reducedMotion) => effectiveMoveDuration(storedDuration, options.reducedMotion ?? reducedMotion),
      moveBeats: () => options.beats ?? moveBeats(options.duration ?? 0, false),
      reducedMotion: () => options.reducedMotion ?? false,
      window: timingWindow,
    },
  };
}

function createTestEngine(score: unknown = null): LinePreviewDependencies['engine'] {
  return {
    status: 'ready' as const,
    reset: vi.fn(),
    warm: vi.fn(),
    clearMemo: vi.fn(),
    evaluate: vi.fn().mockResolvedValue(score),
  };
}

function enterPreview(line = trainableLine, practiceAvailable = true, selectedCourse = course) {
  const { window, host } = installDom();
  const engine = createTestEngine({ kind: 'cp', cp: 18 });
  const topbarCalls: object[] = [];
  const intents: LinePreviewIntent[] = [];
  const controller = createLinePreview(host, dependencies(window, engine, topbarCalls));
  const dispose = controller.enter({ course: selectedCourse, level, line, practiceAvailable, onIntent: (intent) => intents.push(intent) });
  return { window, host, engine, topbarCalls, intents, controller, dispose };
}

async function flushMicrotasks(count = 1): Promise<void> {
  for (let index = 0; index < count; index += 1) await Promise.resolve();
}

describe('Line Preview interface', () => {
  afterEach(() => disposeActiveLinePreview());

  test('maps the repertoire side to the matching board perspective', () => {
    expect(boardPerspectiveForSide('white')).toEqual({ side: 'white', selectableColor: 'w' });
    expect(boardPerspectiveForSide('black')).toEqual({ side: 'black', selectableColor: 'b' });
  });

  test('owns the complete progress-neutral surface at the first authored position', () => {
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
    expect(engine.reset).toHaveBeenCalledTimes(1);
    expect(engine.warm).toHaveBeenCalledTimes(1);
    expect(engine.clearMemo).toHaveBeenCalledTimes(1);
  });

  test('plays the authored move and connecting reply through deterministic frames and beats', async () => {
    const { window, host } = installDom();
    const clock = controlledWindow(window);
    const engine = createTestEngine();
    const controller = createLinePreview(host, dependencies(window, engine, [], clock, { duration: 200, beats: { beforeReply: 120, afterReply: 150 } }));
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
    expect(host.querySelector('.preview-actions')?.getAttribute('aria-busy')).toBe('true');
    expect(host.querySelector('#preview-next')?.hasAttribute('disabled')).toBe(true);
    expect(host.querySelector('#preview-prev')?.hasAttribute('disabled')).toBe(true);
    expect(host.querySelector('.animated-piece')).not.toBeNull();
    expect(clock.hasPendingFrame()).toBe(true);

    expect(clock.flushFrame()).toBe(true);
    await flushMicrotasks();
    expect(host.querySelector('.animated-piece')?.classList.contains('is-arrived')).toBe(true);
    expect(clock.pendingTimerDelays()).toEqual([200]);

    expect(clock.flushTimer()).toBe(true);
    await flushMicrotasks();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
    expect(host.querySelector<HTMLButtonElement>('[data-square="d4"]')?.getAttribute('aria-label')).toBe('d4, white pawn');
    expect(clock.pendingTimerDelays()).toEqual([120]);

    expect(clock.flushTimer()).toBe(true);
    await flushMicrotasks();
    expect(host.querySelector('.animated-piece')).not.toBeNull();
    expect(clock.hasPendingFrame()).toBe(true);

    expect(clock.flushFrame()).toBe(true);
    await flushMicrotasks();
    expect(clock.pendingTimerDelays()).toEqual([200]);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);

    expect(clock.flushTimer()).toBe(true);
    await flushMicrotasks();
    expect(host.querySelector<HTMLButtonElement>('[data-square="d5"]')?.getAttribute('aria-label')).toBe('d5, black pawn');
    expect(clock.pendingTimerDelays()).toEqual([150]);

    expect(clock.flushTimer()).toBe(true);
    await flushMicrotasks();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
    expect(host.querySelector('.preview-actions')?.getAttribute('aria-busy')).toBe('false');
    expect(host.querySelector('#preview-next')?.hasAttribute('disabled')).toBe(false);
  });

  test('ignores overlapping forward and reverse commands while settling', async () => {
    const { window, host } = installDom();
    const clock = controlledWindow(window);
    const engine = createTestEngine();
    createLinePreview(host, dependencies(window, engine, [], clock, { duration: 200, beats: { beforeReply: 120, afterReply: 150 } })).enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    host.querySelector<HTMLButtonElement>('#preview-prev')!.click();
    expect(clock.hasPendingFrame()).toBe(true);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);

    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(clock.hasPendingFrame()).toBe(true);
  });

  test('reduced motion suppresses animation while retaining Move Beats', async () => {
    const { window, host } = installDom();
    const clock = controlledWindow(window);
    const engine = createTestEngine();
    createLinePreview(host, dependencies(window, engine, [], clock, { duration: 350, reducedMotion: true, beats: { beforeReply: 120, afterReply: 150 } })).enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    await flushMicrotasks();
    expect(clock.hasPendingFrame()).toBe(false);
    expect(host.querySelector('.animated-piece')).toBeNull();
    expect(host.querySelector('.preview-actions')?.getAttribute('aria-busy')).toBe('true');
    expect(clock.pendingTimerDelays()).toEqual([120]);

    clock.flushTimer();
    await flushMicrotasks();
    expect(clock.hasPendingFrame()).toBe(false);
    expect(host.querySelector('.animated-piece')).toBeNull();
    expect(clock.pendingTimerDelays()).toEqual([150]);

    clock.flushTimer();
    await flushMicrotasks();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
    expect(host.querySelector('.preview-actions')?.getAttribute('aria-busy')).toBe('false');
  });

  test('zero duration suppresses animation and Move Beats', async () => {
    const { window, host } = installDom();
    const clock = controlledWindow(window);
    const engine = createTestEngine();
    createLinePreview(host, dependencies(window, engine, [], clock, { duration: 0, beats: { beforeReply: 0, afterReply: 0 } })).enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });

    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    await flushMicrotasks(8);
    expect(clock.hasPendingFrame()).toBe(false);
    expect(clock.hasPendingTimer()).toBe(false);
    expect(host.querySelector('.animated-piece')).toBeNull();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
    expect(host.querySelector('.preview-actions')?.getAttribute('aria-busy')).toBe('false');
  });

  test('does not offer Practice for a reference line', () => {
    const { host, intents } = enterPreview(referenceLine, true, COURSES[1]);

    expect(host.querySelector('#preview-practice')).toBeNull();
    expect(host.querySelector('.preview-note')?.textContent).toContain('Nothing here changes your progress.');
    expect(intents).toEqual([]);
  });

  test('disposes before emitting one semantic intent', () => {
    const { window, host, controller } = enterPreview();
    const intents: LinePreviewIntent[] = [];
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: (intent) => intents.push(intent) });

    const back = host.querySelector<HTMLButtonElement>('#preview-back')!;
    back.click();
    back.click();
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));

    expect(intents).toEqual([{ type: 'back' }]);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
  });

  test('disposes before emitting Practice and ignores a second click', () => {
    const { window, host } = installDom();
    const engine = createTestEngine();
    const intents: LinePreviewIntent[] = [];
    const controller = createLinePreview(host, dependencies(window, engine, []));
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: (intent) => {
      intents.push(intent);
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    } });

    const practice = host.querySelector<HTMLButtonElement>('#preview-practice')!;
    practice.click();
    practice.click();

    expect(intents).toEqual([{ type: 'practice' }]);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
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
    await flushMicrotasks(4);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);

    disposeSecond();
    disposeSecond();
    host.querySelector<HTMLButtonElement>('#preview-prev')?.click();
    window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
  });

  test('keeps a newer entry alive when an older controller is disposed', async () => {
    const first = enterPreview();
    const secondHost = first.window.document.createElement('div') as unknown as HTMLDivElement;
    first.window.document.body.append(secondHost as never);
    const secondController = createLinePreview(secondHost, dependencies(first.window, createTestEngine(), []));
    secondController.enter({ course: COURSES[1], level, line: referenceLine, practiceAvailable: false, onIntent: () => undefined });

    first.controller.dispose();
    first.window.dispatchEvent(new first.window.KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await flushMicrotasks(4);

    expect(secondHost.querySelector('h1')?.textContent).toContain(referenceLine.title);
    expect(secondHost.querySelector('.preview-move.is-current')?.textContent).toMatch(/^02 /);
  });

  test('does not restore focus from a superseded host into the active entry', () => {
    const first = enterPreview();
    const firstNext = first.host.querySelector<HTMLButtonElement>('#preview-next')!;
    firstNext.focus();

    const secondHost = first.window.document.createElement('div') as unknown as HTMLDivElement;
    first.window.document.body.append(secondHost as never);
    const secondController = createLinePreview(secondHost, dependencies(first.window, createTestEngine(), []));
    secondController.enter({ course: COURSES[1], level, line: referenceLine, practiceAvailable: false, onIntent: () => undefined });

    expect(secondHost.querySelector<HTMLButtonElement>('#preview-next')).not.toBe(first.window.document.activeElement);
  });

  test('plays the last authored move before showing completion, then moves focus from Next to Restart', async () => {
    const { window, host } = installDom();
    const clock = controlledWindow(window);
    const engine = createTestEngine();
    const controller = createLinePreview(host, dependencies(window, engine, [], clock, { duration: 0, beats: { beforeReply: 0, afterReply: 0 } }));
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });

    for (let index = 0; index < trainableLine.positions.length - 1; index += 1) {
      host.querySelector<HTMLButtonElement>('#preview-next')!.focus();
      host.querySelector<HTMLButtonElement>('#preview-next')!.click();
      await flushMicrotasks(4);
    }
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^09 /);

    host.querySelector<HTMLButtonElement>('#preview-next')!.focus();
    host.querySelector<HTMLButtonElement>('#preview-next')!.click();
    expect(host.querySelector('.preview-complete')).toBeNull();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^09 /);
    await flushMicrotasks(4);
    expect(host.querySelector('.preview-complete')).not.toBeNull();
    expect(host.querySelector<HTMLButtonElement>('#preview-restart')).toBe(window.document.activeElement);

    host.querySelector<HTMLButtonElement>('#preview-prev')!.click();
    expect(host.querySelector('.preview-complete')).toBeNull();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^09 /);
    host.querySelector<HTMLButtonElement>('#preview-next')?.click();
    await flushMicrotasks(4);
    expect(host.querySelector('.preview-complete')).not.toBeNull();

    host.querySelector<HTMLButtonElement>('#preview-restart')!.click();
    expect(host.querySelector('.preview-complete')).toBeNull();
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
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
    const baseDependencies = dependencies(window, engine, [], previewWindow);
    const dependenciesForTiming: LinePreviewDependencies = {
      ...baseDependencies,
      timing: {
        ...baseDependencies.timing,
        loadMoveDuration: () => moveDuration,
        effectiveMoveDuration: (storedDuration) => storedDuration,
        moveBeats: () => moveDuration === 0 ? { beforeReply: 0, afterReply: 0 } : { beforeReply: 100, afterReply: 100 },
      },
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
    expect(previewWindow.hasPendingTimer()).toBe(false);
    controller.dispose();
    expect(previewWindow.flushTimer()).toBe(false);
    expect(host.querySelector('.preview-move.is-current')?.textContent).toMatch(/^01 /);
  });

  test('rejects a stale score from a previous position after replacement', async () => {
    const { window, host } = installDom();
    const requests: { progress?: (score: { kind: 'cp'; cp: number }) => void; resolve: (score: { kind: 'cp'; cp: number }) => void }[] = [];
    const engine = {
      status: 'ready' as const,
      reset: vi.fn(),
      warm: vi.fn(),
      clearMemo: vi.fn(),
      evaluate: vi.fn((_fen: string, _color: 'w' | 'b', progress?: (score: { kind: 'cp'; cp: number }) => void) => new Promise<{ kind: 'cp'; cp: number }>((resolve) => {
        requests.push({ progress, resolve });
      })),
    };
    const controller = createLinePreview(host, dependencies(window, engine, []));
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });
    controller.enter({ course: COURSES[1], level, line: referenceLine, practiceAvailable: false, onIntent: () => undefined });

    requests[0].progress?.({ kind: 'cp', cp: 900 });
    requests[0].resolve({ kind: 'cp', cp: 900 });
    await flushMicrotasks(3);
    expect(host.querySelector('.eval-value')?.textContent).toBe('--');

    requests[1].progress?.({ kind: 'cp', cp: 100 });
    requests[1].resolve({ kind: 'cp', cp: 100 });
    await flushMicrotasks(3);
    expect(host.querySelector('.eval-value')?.textContent).toBe('+1.0');
  });

  test('renders the existing unavailable Eval Bar state when evaluation fails', async () => {
    const { window, host } = installDom();
    let unavailable = false;
    const engine = {
      get status() { return unavailable ? 'unavailable' as const : 'ready' as const; },
      reset: vi.fn(),
      warm: vi.fn(),
      clearMemo: vi.fn(),
      evaluate: vi.fn(async () => {
        unavailable = true;
        return null;
      }),
    };
    const controller = createLinePreview(host, dependencies(window, engine, []));
    controller.enter({ course, level, line: trainableLine, practiceAvailable: true, onIntent: () => undefined });
    await flushMicrotasks(3);

    expect(host.querySelector('.eval-note')?.textContent).toBe('Engine unavailable');
    expect(host.querySelector('.eval-bar')).toBeNull();
  });
});
