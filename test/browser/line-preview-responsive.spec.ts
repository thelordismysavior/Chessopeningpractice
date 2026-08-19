import { expect, test, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';
import { expectNoOverflow, openDashboard, seedProgress } from './app-stubs';

const ENGINE_STUB = `
  let fen = '';
  onmessage = (event) => {
    const message = String(event.data);
    if (message === 'uci') postMessage('uciok');
    else if (message === 'isready') postMessage('readyok');
    else if (message.startsWith('position fen ')) fen = message.slice('position fen '.length).trim();
    else if (message.startsWith('go')) {
      const whiteToMove = fen.split(' ')[1] === 'w';
      postMessage('info depth 12 score cp ' + (whiteToMove ? 120 : -120));
      postMessage('bestmove e2e4');
    }
  };
`;

async function routeEngine(page: Page, source: string | null = ENGINE_STUB): Promise<void> {
  await page.route('**/engine/stockfish.js', (route) => source === null
    ? route.abort()
    : route.fulfill({ contentType: 'application/javascript', body: source }));
}

async function openDashboardWithEngine(page: Page, source: string | null = ENGINE_STUB): Promise<void> {
  await routeEngine(page, source);
  await openDashboard(page, 1440, 1000);
}

async function openBrowse(page: Page, source: string | null = ENGINE_STUB): Promise<void> {
  await openDashboardWithEngine(page, source);
  await page.locator('#browse-all').click();
}

async function openPreview(page: Page, source: string | null = ENGINE_STUB): Promise<void> {
  await openBrowse(page, source);
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
}

async function expectStablePreviewNodes(page: Page): Promise<void> {
  expect(await page.evaluate(() => {
    const state = globalThis as typeof globalThis & { __previewBoard: Element; __previewEval: Element };
    return state.__previewBoard === document.querySelector('.board') && state.__previewEval === document.querySelector('.eval-bar');
  })).toBe(true);
}

async function routeControlledEngine(page: Page): Promise<void> {
  await page.route('**/src/engine/engine-client.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      globalThis.__previewEngineRequests = [];
      export const engine = {
        status: 'ready',
        reset() {},
        warm() {},
        clearMemo() {},
        evaluate(fen, learnerColor) {
          return new Promise((resolve) => globalThis.__previewEngineRequests.push({ fen, learnerColor, resolve }));
        },
      };
    `,
  }));
}

async function previewEngineRequestCount(page: Page): Promise<number> {
  return page.evaluate(() => (globalThis as typeof globalThis & { __previewEngineRequests: unknown[] }).__previewEngineRequests.length);
}

async function resolvePreviewEngineRequest(page: Page, index: number, cp: number): Promise<void> {
  await page.evaluate(({ requestIndex, score }) => {
    const state = globalThis as typeof globalThis & {
      __previewEngineRequests: { resolve: (value: { kind: 'cp'; cp: number }) => void }[];
    };
    state.__previewEngineRequests[requestIndex].resolve({ kind: 'cp', cp: score });
  }, { requestIndex: index, score: cp });
}

async function readProgress(page: Page): Promise<string> {
  return page.evaluate(() => JSON.stringify([...globalThis.__progressByCourse.entries()]));
}

type PreviewGeometry = {
  layout: { left: number; right: number; top: number };
  copy: { left: number; right: number; bottom: number };
  board: { left: number; right: number; top: number; width: number };
  evalBar: { left: number; right: number; width: number } | null;
  controls: { left: number; right: number; top: number; bottom: number }[];
};

async function geometry(page: Page): Promise<PreviewGeometry> {
  return page.evaluate(() => {
    const box = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`Missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width };
    };
    const layout = box('.line-preview-layout');
    const copy = box('.line-preview-copy');
    const board = box('.line-preview-layout > .board-panel');
    const evalElement = document.querySelector<HTMLElement>('.eval-bar, .eval-note');
    const evalRect = evalElement?.getBoundingClientRect();
    return {
      layout,
      copy,
      board,
      evalBar: evalRect ? { left: evalRect.left, right: evalRect.right, width: evalRect.width } : null,
      controls: Array.from(document.querySelectorAll<HTMLButtonElement>('.preview-actions button')).map((button) => {
        const rect = button.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      }),
    };
  });
}

function expectControlsInViewport(controls: PreviewGeometry['controls'], width: number): void {
  for (const control of controls) {
    expect(control.left).toBeGreaterThanOrEqual(0);
    expect(control.right).toBeLessThanOrEqual(width);
  }
}

test('Line Preview keeps its board-led composition across the supported widths', async ({ page }) => {
  await openPreview(page);

  await expect(page.locator('.line-preview-page')).toContainText('Lesson idea');
  await expect(page.locator('.preview-guide')).toContainText('Current authored move');
  await expect(page.locator('.preview-guide')).toContainText(COURSES[0].lessons.beginner.variations[0].positions[0].explanation);
  await expect(page.locator('.board')).toHaveAttribute('role', 'group');
  await expect(page.locator('.board-square')).toHaveCount(64);
  await expect(page.locator('.preview-moves')).toHaveAttribute('aria-label', 'Authored move guide');

  const wide = await geometry(page);
  expect(wide.board.width).toBeLessThanOrEqual(521);
  expect(wide.copy.right).toBeLessThanOrEqual(wide.board.left + 1);
  expect(wide.evalBar?.width).toBeCloseTo(wide.board.width, 0);
  expectControlsInViewport(wide.controls, 1440);
  await expectNoOverflow(page);

  await page.setViewportSize({ width: 768, height: 1024 });
  const tablet = await geometry(page);
  expect(tablet.copy.right).toBeLessThanOrEqual(tablet.board.left + 1);
  expect(tablet.board.width).toBeGreaterThanOrEqual(300);
  expect(tablet.evalBar?.width).toBeCloseTo(tablet.board.width, 0);
  expectControlsInViewport(tablet.controls, 768);
  await expectNoOverflow(page);

  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 844 }]) {
    await page.setViewportSize(viewport);
    const narrow = await geometry(page);
    expect(narrow.copy.bottom).toBeLessThanOrEqual(narrow.board.top + 1);
    expect(narrow.board.left).toBeGreaterThanOrEqual(0);
    expect(narrow.board.right).toBeLessThanOrEqual(viewport.width);
    expect(narrow.board.width).toBeLessThanOrEqual(viewport.width - 36);
    expect(narrow.evalBar?.width).toBeCloseTo(narrow.board.width, 0);
    expectControlsInViewport(narrow.controls, viewport.width);
    await expectNoOverflow(page);
  }
});

test('Line Preview keeps keyboard focus through navigation and completion', async ({ page }) => {
  await openPreview(page);
  await page.locator('#preview-next').focus();
  await page.locator('#preview-next').click();
  await expect(page.locator('#preview-next')).toBeFocused();

  const variation = COURSES[0].lessons.beginner.variations[0];
  for (let index = 1; index < variation.positions.length; index += 1) {
    await page.locator('#preview-next').click();
  }
  await expect(page.locator('.preview-complete')).toBeVisible();
  await expect(page.locator('#preview-restart')).toBeFocused();
  await expectNoOverflow(page);
});

test('Line Preview keeps the board and Eval Bar nodes stable through the walkthrough', async ({ page }) => {
  await openPreview(page);
  await expect(page.locator('.eval-bar')).toBeVisible();
  await page.locator('.line-preview-shell').evaluate((shell) => {
    const state = globalThis as typeof globalThis & { __previewBoard: Element; __previewEval: Element };
    state.__previewBoard = shell.querySelector('.board')!;
    state.__previewEval = shell.querySelector('.eval-bar')!;
  });

  const variation = COURSES[0].lessons.beginner.variations[0];
  for (let index = 0; index < variation.positions.length; index += 1) {
    await page.locator('#preview-next').click();
    if (index < variation.positions.length - 1) {
      await expect(page.locator('.preview-move.is-current')).toHaveText(new RegExp(`^${String(index + 2).padStart(2, '0')} `));
    }
  }
  await expect(page.locator('.preview-complete')).toBeVisible();
  await expectStablePreviewNodes(page);

  await page.locator('#preview-restart').click();
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^01 /);
  await expectStablePreviewNodes(page);
});

test('Line Preview supports direct routes, browser Back, Browse context, and practice handoff', async ({ page }) => {
  await openBrowse(page);
  const course = COURSES[0];
  const variation = course.lessons.beginner.variations[0];

  await page.locator(`[data-course-filter="${course.id}"]`).click();
  await expect(page.locator('.browse-row')).toHaveCount(15);
  await page.locator('.browse-row').first().click();
  await expect(page).toHaveURL(new RegExp(`#\\/browse\\/${course.id}\\/${variation.id}$`));
  await expect(page.locator('.line-preview-page')).toBeVisible();

  await page.locator('#preview-back').click();
  await expect(page).toHaveURL(new RegExp(`#\\/browse\\/${course.id}$`));
  await expect(page.locator('.browse-page')).toBeVisible();
  await expect(page.locator(`[data-course-filter="${course.id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.browse-row')).toHaveCount(15);

  await page.goto(`/#/browse/${course.id}/${variation.id}`);
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`#\\/browse\\/${course.id}$`));
  await expect(page.locator('.browse-page')).toBeVisible();

  await page.goto(`/#/browse/${course.id}/${variation.id}`);
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('h1')).toHaveText(variation.title);
  const beforePractice = await readProgress(page);
  await page.locator('#preview-practice').click();
  await expect(page.locator('.practice-shell')).toBeVisible();
  await expect(page.locator('.line-title')).toHaveText(variation.title);
  await expect(page).toHaveURL(new RegExp(`#\\/practice\\/${course.id}\\/beginner\\?line=${variation.id}$`));
  await expect(readProgress(page)).resolves.toBe(beforePractice);

  await page.goto(`/#/course/${course.id}`);
  await page.locator('.course-line-row').first().click();
  await expect(page.locator('.practice-shell')).toBeVisible();

  const referenceCourse = COURSES.find((candidate) => candidate.lessons.beginner.variations.some((entry) => entry.kind === 'reference'))!;
  await page.goto(`/#/course/${referenceCourse.id}`);
  await page.locator('.course-line-row:has(.role-reference)').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('#preview-practice')).toHaveCount(0);
});

test('Browse sends banked and mastered lines to the same progress-neutral Line Preview', async ({ page }) => {
  await openDashboardWithEngine(page);
  const course = COURSES[0];
  const [banked, mastered] = course.lessons.beginner.variations;
  await seedProgress(page, course.id, {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [banked.id, mastered.id],
    positions: {
      [banked.positions[0].id]: { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true },
    },
    practiceMs: 0,
  });
  await page.reload();
  await page.goto('/#/browse');
  await page.locator(`[data-course-filter="${course.id}"]`).click();

  await page.locator('[data-state-filter="banked"]').click();
  await expect(page.locator('.browse-row')).toHaveCount(1);
  await page.locator('.browse-row').click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('h1')).toHaveText(banked.title);
  await page.locator('#preview-back').click();

  await page.locator('[data-state-filter="mastered"]').click();
  await expect(page.locator('.browse-row')).toHaveCount(1);
  await page.locator('.browse-row').click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('h1')).toHaveText(mastered.title);
});

test('Line Preview completion, restart, and exit remain progress-neutral', async ({ page }) => {
  await openPreview(page);
  const before = await readProgress(page);
  const variation = COURSES[0].lessons.beginner.variations[0];
  for (let index = 0; index < variation.positions.length; index += 1) {
    await page.locator('#preview-next').click();
  }
  await expect(page.locator('.preview-complete')).toBeVisible();
  await expect(readProgress(page)).resolves.toBe(before);

  await page.locator('#preview-restart').click();
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^01 /);
  await expect(readProgress(page)).resolves.toBe(before);

  await page.locator('#preview-back').click();
  await expect(page.locator('.browse-page')).toBeVisible();
  await expect(readProgress(page)).resolves.toBe(before);
});

test('Line Preview shows authored and reply movement, locks settling, and supports Previous and arrows', async ({ page }) => {
  await openBrowse(page);
  await page.evaluate(() => localStorage.setItem('chess-practice.move-duration', '350'));
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();

  await page.locator('#preview-next').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.preview-actions')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('#preview-next')).toBeDisabled();
  await expect(page.locator('#preview-prev')).toBeDisabled();
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^02 /);
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: 'd4, white pawn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'd5, black pawn', exact: true })).toBeVisible();

  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^01 /);
  await expect(page.getByRole('button', { name: 'd4, empty', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'd5, empty', exact: true })).toBeVisible();
});

test('Line Preview reduced motion settles the authored sequence without sliding pieces', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openBrowse(page);
  await page.evaluate(() => localStorage.setItem('chess-practice.move-duration', '350'));
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await page.locator('#preview-next').click();

  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^02 /);
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.animated-piece')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'd4, white pawn', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'd5, black pawn', exact: true })).toBeVisible();
});

test('A disposed Line Preview evaluation cannot repaint the Practice Eval Bar', async ({ page }) => {
  await routeControlledEngine(page);
  await openBrowse(page);
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect.poll(() => previewEngineRequestCount(page)).toBe(1);

  await page.locator('#preview-back').click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect.poll(() => previewEngineRequestCount(page)).toBe(2);

  await page.locator('#preview-practice').click();
  await expect(page.locator('.practice-shell')).toBeVisible();
  await resolvePreviewEngineRequest(page, 0, 900);
  await expect(page.locator('.eval-value')).toHaveText('--');
});

test('Reference Line Preview remains progress-neutral and offers no Practice handoff', async ({ page }) => {
  await openBrowse(page);
  const course = COURSES.find((candidate) => candidate.lessons.beginner.variations.some((variation) => variation.kind === 'reference'))!;
  const reference = course.lessons.beginner.variations.find((variation) => variation.kind === 'reference')!;
  await page.locator(`[data-course-filter="${course.id}"]`).click();
  await page.locator('#browse-search').fill(reference.title);
  await expect(page.locator('.browse-row').filter({ hasText: reference.title })).toHaveCount(3);
  await page.locator('.browse-row').filter({ hasText: reference.title }).first().click();
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('#preview-practice')).toHaveCount(0);

  const before = await readProgress(page);
  await page.locator('#preview-next').click();
  await expect(page.locator('.preview-move.is-current')).toHaveText(/^02 /);
  expect(await readProgress(page)).toBe(before);
});

test('Line Preview presents the engine-unavailable state without losing the board', async ({ page }) => {
  await openPreview(page, null);
  await expect(page.locator('.eval-note')).toHaveText('Engine unavailable');
  await expect(page.locator('.eval-bar')).toHaveCount(0);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.board-square')).toHaveCount(64);
});

test('Line Preview keeps Eval Bar orientation on the learner side', async ({ page }) => {
  await openDashboardWithEngine(page);
  const white = COURSES.find((course) => course.side === 'white')!;
  const black = COURSES.find((course) => course.side === 'black')!;

  await page.goto(`/#/browse/${white.id}/${white.lessons.beginner.variations[0].id}`);
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('.side-tag')).toHaveText('W / WHITE');
  await expect(page.locator('.eval-value')).toHaveText('+1.2');

  await page.goto(`/#/browse/${black.id}/${black.lessons.beginner.variations[0].id}`);
  await expect(page.locator('.line-preview-page')).toBeVisible();
  await expect(page.locator('.side-tag')).toHaveText('B / BLACK');
  await expect(page.locator('.eval-value')).toHaveText('-1.2');
});
