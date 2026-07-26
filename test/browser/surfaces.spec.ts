import { expect, test, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';
import { lineMoves, openDashboard, playMove, seedProgress, wrongLegalMove } from './app-stubs';

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

async function blockEngine(page: Page): Promise<void> {
  await page.route('**/engine/stockfish.js', (route) => route.abort());
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
    test('mastery figure agrees with the meters, and a due line is banked not mastered', async ({ page }) => {
      await stubEngine(page);
      await openDashboard(page, viewport.width, viewport.height);
      await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
      await page.reload();

      const card = page.locator('.course-card').first();
      const row = card.locator('button[data-level="beginner"]');
      await expect(row.locator('.meter-segment.is-mastered')).toHaveCount(1);
      await expect(row.locator('.meter-segment.is-banked')).toHaveCount(1);
      await expect(row.locator('.meter-segment.is-untouched')).toHaveCount(1);
      await expect(page.locator('.mastery-figure strong')).toHaveText(`${Math.round(1 / 36 * 100)}%`);
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
      await expect(page.locator('.queue-row')).toHaveCount(2);
      await expect(page.locator('.queue-row').first()).toContainText('1 position due');
    });
  });
}

test('the browse index filters, and the walker steps without touching progress', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await seedProgress(page, COURSES[0].id, bankedProgress(0, true));
  await page.reload();

  await page.locator('#browse').click();
  await expect(page.locator('.browse-row')).toHaveCount(36);
  await page.locator(`[data-course-filter="${COURSES[0].id}"]`).click();
  await expect(page.locator('.browse-row')).toHaveCount(9);
  await page.locator('[data-state-filter="mastered"]').click();
  await expect(page.locator('.browse-row')).toHaveCount(1);

  await page.locator('[data-state-filter="all"]').click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.walker')).toBeVisible();
  await expect(page.locator('.walker-move.is-current')).toHaveText(/^01 /);
  await page.locator('#walker-next').click();
  await expect(page.locator('.walker-move.is-current')).toHaveText(/^02 /);
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('.walker-move.is-current')).toHaveText(/^01 /);
  await expect(page.locator('#walker-prev')).toBeDisabled();
  await expect(page.locator('.board-square').first()).toBeDisabled();

  const before = await page.evaluate(() => JSON.stringify([...globalThis.__progressByCourse.entries()]));
  await page.locator('#walker-next').click();
  await page.locator('#walker-back').click();
  await expect(page.evaluate(() => JSON.stringify([...globalThis.__progressByCourse.entries()]))).resolves.toBe(before);
});

test('a locked line opens in the walker without a practice action', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await page.locator('#browse').click();
  await page.locator(`[data-course-filter="${COURSES[0].id}"]`).click();
  await page.locator('.browse-row').last().click();
  await expect(page.locator('.walker')).toBeVisible();
  await expect(page.locator('#walker-practice')).toHaveCount(0);
});

test('the bar reads from the learner side in a white and a black course', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  const white = COURSES.find((course) => course.side === 'white')!;
  const black = COURSES.find((course) => course.side === 'black')!;

  await page.locator('#browse').click();
  await page.locator(`[data-course-filter="${white.id}"]`).click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.side-tag')).toHaveText('W / WHITE');
  await expect(page.locator('.eval-value')).toHaveText('+1.20');

  await page.locator('#walker-back').click();
  await expect(page.locator('.browse-page')).toBeVisible();
  await page.locator(`[data-course-filter="${black.id}"]`).click();
  await expect(page.locator('.browse-row').first()).toContainText(black.name);
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.side-tag')).toHaveText('B / BLACK');
  await expect(page.locator('.eval-value')).toHaveText('-1.20');
});

test('a wrong move shows its cost without blocking input', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  for (const move of firstLine) await playMove(page, move);

  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.feedback-incorrect')).toContainText('Expected:');
  await expect(page.locator('.move-cost')).toContainText('is the line.');
  await playMove(page, firstLine[0]);
  await expect(page.locator('.move-cost')).toHaveCount(0);
});

test('every screen works with the engine asset blocked', async ({ page }) => {
  await blockEngine(page);
  await openDashboard(page, 1440, 1000);
  await page.locator('#browse').click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.eval-note')).toHaveText('Engine unavailable');
  await expect(page.locator('.eval-bar')).toHaveCount(0);

  await page.locator('#walker-back').click();
  await page.locator('#back-dashboard').click();
  const [firstLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.feedback-incorrect')).toContainText('Expected:');
  await expect(page.locator('.move-cost')).toHaveCount(0);
});

test('the bar is vertical on a wide viewport and horizontal on a narrow one', async ({ page }) => {
  await stubEngine(page);
  await openDashboard(page, 1440, 1000);
  await page.locator('#browse').click();
  await page.locator('.browse-row').first().click();
  await expect(page.locator('.eval-value')).toHaveText('+1.20');
  const wide = await page.locator('.eval-bar').boundingBox();
  expect(wide!.height).toBeGreaterThan(wide!.width);

  await page.setViewportSize({ width: 390, height: 844 });
  const narrow = await page.locator('.eval-bar').boundingBox();
  expect(narrow!.width).toBeGreaterThan(narrow!.height);
});
