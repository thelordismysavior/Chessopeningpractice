import { expect, test, type Page } from '@playwright/test';
import { COURSES, LEVELS } from '../../src/courses';
import { expectNoOverflow, lineMoves, openDashboard, playMove, seedProgress, startFirstCoursePractice, wrongLegalMove } from './app-stubs';

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

const ENGINE_STUB = `
  let fen = '';
  onmessage = (event) => {
    const message = String(event.data);
    if (message === 'uci') postMessage('uciok');
    else if (message === 'isready') postMessage('readyok');
    else if (message.startsWith('position fen ')) fen = message.slice('position fen '.length).trim();
    else if (message.startsWith('go')) {
      const parts = fen.split(' ');
      const whiteToMove = parts[1] === 'w';
      postMessage('info depth 12 score cp ' + (whiteToMove ? 120 : -120));
      postMessage('bestmove e2e4');
    }
  };
`;

async function stubEngine(page: Page): Promise<void> {
  await page.route('**/engine/stockfish.js', (route) => route.fulfill({ contentType: 'application/javascript', body: ENGINE_STUB }));
}

async function stubControlledEngine(page: Page): Promise<void> {
  await page.route('**/src/engine/engine-client.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      globalThis.__engineRequests = [];
      export const engine = {
        status: 'ready',
        reset() {},
        warm() {},
        clearMemo() {},
        evaluate(fen, learnerColor) {
          return new Promise((resolve) => globalThis.__engineRequests.push({ fen, learnerColor, resolve }));
        },
      };
    `,
  }));
}

async function engineRequestCount(page: Page): Promise<number> {
  return page.evaluate(() => (
    (globalThis as typeof globalThis & { __engineRequests: unknown[] }).__engineRequests.length
  ));
}

async function resolveEngineRequest(page: Page, index: number, cp: number): Promise<void> {
  await page.evaluate(({ requestIndex, score }) => {
    const state = globalThis as typeof globalThis & {
      __engineRequests: { resolve: (value: { kind: 'cp'; cp: number }) => void }[];
    };
    state.__engineRequests[requestIndex].resolve({ kind: 'cp', cp: score });
  }, { requestIndex: index, score: cp });
}

async function blockEngine(page: Page): Promise<void> {
  await page.route('**/engine/stockfish.js', (route) => route.abort());
}

function completedProgress(courseIndex: number) {
  const course = COURSES[courseIndex];
  return {
    completedLevels: [...LEVELS],
    unlockedLevel: LEVELS.length - 1,
    completedVariationIds: LEVELS.flatMap((level) => course.lessons[level].variations.map((variation) => variation.id)),
    positions: {},
    practiceMs: 0,
  };
}

function bankedProgress(courseIndex: number, dueInFirstLine: boolean) {
  const course = COURSES[courseIndex];
  const [first, second] = course.lessons.beginner.variations;
  const positions: Record<string, unknown> = {};
  if (dueInFirstLine) positions[first.positions[0].id] = { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true };
  return {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [first.id, second.id],
    positions,
    practiceMs: 0,
  };
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test('course and overall progress count banked lines even when one is due', async ({ page }) => {
      await stubEngine(page);
      await openDashboard(page, viewport.width, viewport.height);
      await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
      await page.reload();

      const card = page.locator('.course-card').first();
      await expect(card.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '13');
      await expect(card).toContainText('13% banked');
      await expect(page.locator('.mastery-figure strong')).toHaveText('3%');
      await expect(page.locator('.mastery-figure .progress-label')).toContainText('2 of 70 lines');
      await expect(page.locator('.mastery-figure [role="progressbar"]')).toHaveAttribute('aria-valuenow', '3');
      await expect(page.locator('#review-queue')).toContainText('Review 1 position');
    });

    test('the review entry is absent with nothing due, and the queue shows its empty state', async ({ page }) => {
      await stubEngine(page);
      await openDashboard(page, viewport.width, viewport.height);
      await expect(page.locator('#review-queue')).toHaveCount(0);
      await expect(page.locator('.mastery-figure strong')).toHaveText('0%');
    });

    test('the queue lists groups in course then level order and Review all runs them back to back', async ({ page }) => {
      await stubEngine(page);
      await openDashboard(page, viewport.width, viewport.height);
      await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
      await seedProgress(page, COURSES[1].id, bankedProgress(1, true));
      await page.reload();

      await page.locator('#review-queue').click();
      await expect(page.locator('.queue-row')).toHaveCount(2);
      await expect(page.locator('.queue-row').first()).toContainText(COURSES[0].name);
      await expect(page.locator('.queue-row').nth(1)).toContainText(COURSES[1].name);

      await page.locator('#review-all').click();
      await playMove(page, COURSES[0].lessons.beginner.variations[0].positions[0].expectedMove);
      await expect(page.locator('#next-group')).toContainText(COURSES[1].name);
      await page.locator('#next-group').click();
      await expect(page.locator('.line-handoff')).toContainText(COURSES[1].name);

      await playMove(page, COURSES[1].lessons.beginner.variations[0].positions[0].expectedMove);
      await page.locator('#back-to-queue').click();
      await expect(page.locator('.queue-row')).toHaveCount(0);
      await expect(page.locator('.queue-empty')).toBeVisible();
    });
  });
}

test('a failed Review all save blocks the next group until retry succeeds', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
  await seedProgress(page, COURSES[1].id, bankedProgress(1, true));
  await page.reload();

  await page.locator('#review-queue').click();
  await page.locator('#review-all').click();
  const position = COURSES[0].lessons.beginner.variations[0].positions[0];
  await page.evaluate(() => { globalThis.__saveFailuresRemaining = 1; });
  await playMove(page, position.expectedMove);
  await expect.poll(() => page.evaluate(({ courseId, positionId }) => {
    const progress = globalThis.__progressByCourse.get(courseId) as { positions: Record<string, { reviewStreak: number }> };
    return progress.positions[positionId].reviewStreak;
  }, { courseId: COURSES[0].id, positionId: position.id })).toBe(0);
  await expect(page.locator('#retry-save')).toBeVisible();
  await page.locator('#retry-save').click();
  await expect(page.locator('#retry-save')).toHaveCount(0);
  await expect.poll(() => page.evaluate(({ courseId, positionId }) => {
    const progress = globalThis.__progressByCourse.get(courseId) as { positions: Record<string, { due: boolean }> };
    return progress.positions[positionId].due;
  }, { courseId: COURSES[0].id, positionId: position.id })).toBe(false);
  await page.locator('#next-group').click();
  await expect(page.locator('.line-handoff')).toContainText(COURSES[1].name);
});

test('the browse index filters the repertoire', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
  await page.reload();

  await page.locator('#browse-all').click();
  await expect(page.locator('.browse-row')).toHaveCount(72);
  await page.locator(`[data-course-filter="${COURSES[0].id}"]`).click();
  await expect(page.locator('.browse-row')).toHaveCount(15);
  await page.locator('[data-state-filter="mastered"]').click();
  await expect(page.locator('.browse-row')).toHaveCount(1);
});

test('banked line rows enter one-line Recall directly', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await seedProgress(page, COURSES[0].id, bankedProgress(0, false));
  await page.reload();

  await page.goto('/#/lines');
  await page.locator('.lines-section').filter({ hasText: 'Banked and mastered' }).locator('.line-selection-row').first().click();
  await expect(page.locator('.practice-shell')).toBeVisible();
  await expect(page.locator('.practice-meta > .eyebrow')).toContainText('Recall');
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
});

test('a wrong move shows its cost without blocking input', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await startFirstCoursePractice(page);
  for (const move of firstLine) await playMove(page, move);

  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.feedback-incorrect')).toContainText('Expected:');
  await expect(page.locator('.move-cost')).toContainText('is the line.');
  await playMove(page, firstLine[0]);
  await expect(page.locator('.move-cost')).toHaveCount(0);
});

test('an older wrong-move evaluation cannot replace the latest cost', async ({ page }) => {
  await stubControlledEngine(page);
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await startFirstCoursePractice(page);
  for (const move of firstLine) await playMove(page, move);

  await page.evaluate(() => {
    (globalThis as typeof globalThis & { __engineRequests: unknown[] }).__engineRequests = [];
  });
  const firstWrong = wrongLegalMove(firstLine[0]);
  const latestWrong = firstWrong === 'a2a3' ? 'h2h3' : 'a2a3';
  const latestSan = latestWrong === 'a2a3' ? 'a3' : 'h3';
  await playMove(page, firstWrong);
  await playMove(page, latestWrong);
  await expect.poll(() => engineRequestCount(page)).toBe(2);

  await resolveEngineRequest(page, 1, 0);
  await expect.poll(() => engineRequestCount(page)).toBe(3);
  await resolveEngineRequest(page, 2, 200);
  await expect(page.locator('.move-cost')).toContainText(latestSan);

  await resolveEngineRequest(page, 0, 0);
  await page.waitForTimeout(50);
  expect(await engineRequestCount(page)).toBe(3);
  await expect(page.locator('.move-cost')).toContainText(latestSan);
});

test('practice works with the engine asset blocked', async ({ page }) => {
  await blockEngine(page);
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await startFirstCoursePractice(page);
  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.feedback-incorrect')).toContainText('Expected:');
  await expect(page.locator('.move-cost')).toHaveCount(0);
});

test('a phone viewport never scrolls sideways, from an empty dashboard to a finished course', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 390, 844);
  await expect(page.locator('.course-grid')).toBeVisible();
  await expectNoOverflow(page);

  await startFirstCoursePractice(page);
  await expect(page.locator('.board')).toBeVisible();
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCSS('height', '6px');
  await expectNoOverflow(page);

  await page.locator('#back-dashboard').click();
  await expect(page.locator('.course-page')).toBeVisible();
  await page.locator('#back-dashboard').click();
  await seedProgress(page, COURSES[0].id, completedProgress(0));
  await page.reload();
  await expect(page.locator('.course-count').first()).toHaveText('03 / 03');
  await expectNoOverflow(page);
});

test('Account and Settings are addressable and share device preference ownership', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('#account').click();
  await expect(page.locator('.account-page')).toBeVisible();
  await expect(page.locator('.account-identity')).toContainText('test@example.com');

  await page.locator('#settings-link-card').click();
  await expect(page.locator('.settings-page')).toBeVisible();
  await expect(page.locator('.settings-glossary')).toContainText('Move Beat');
  await expect(page.locator('.settings-glossary')).toContainText('Tempo Cut');
  await page.locator('#move-duration').fill('350');
  await page.locator('#move-duration').blur();
  await expect(page.locator('#settings-saved')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('chess-practice.move-duration'))).toBe('350');

  await page.goto('/#/account');
  await expect(page.locator('.account-page')).toBeVisible();
  await page.locator('#show-reset-progress').click();
  await page.locator('#confirm-reset-progress').click();
  await expect(page.locator('.account-page')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('chess-practice.move-duration'))).toBe('350');
});

test('Course, Lines, and search stay honest', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);

  await page.locator('.course-card').first().click();
  await expect(page.locator('.course-page')).toBeVisible();
  await expect(page.locator('.lesson-idea')).toContainText('Opponent trigger');
  await expect(page.locator('[data-start-level="advanced"]')).toBeEnabled();
  await page.locator('[data-start-level="advanced"]').click();
  await expect(page.locator('.practice-shell')).toBeVisible();
  await page.goto(`/#/course/${COURSES[0].id}`);
  await expect(page.locator('.course-page')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.course-line-row').first().locator('.line-role')).toBeVisible();
  await expect(page.locator('.course-line-row').first().locator('.line-status')).toBeVisible();
  await expectNoOverflow(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#course-line-sort').selectOption('category');
  await expect(page.locator('.line-role').first()).toBeVisible();
  await page.locator('.course-line-row').first().click();
  await expect(page.locator('.practice-shell')).toBeVisible();

  await page.goto('/#/lines');
  await expect(page.locator('.lines-page')).toBeVisible();
  await page.goto('/#/browse');
  await page.locator('#browse-search').fill('Meet 3...c5');
  await expect(page.locator('.browse-row')).toHaveCount(4);
  await expect(page.locator('.browse-row').filter({ hasText: 'Reference' })).toHaveCount(1);
  await page.locator('#browse-search').fill('not-a-real-opening');
  await expect(page.locator('.browse-empty')).toContainText('No lines match');
  await page.locator('#browse-search').fill('Meet 3...c5');
  await expect(page.locator('.browse-row').filter({ hasText: 'Reference' })).toBeVisible();
});
