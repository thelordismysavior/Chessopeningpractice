import { expect, test } from '@playwright/test';
import {
  lineMoves,
  openDashboard,
  playLessonClean,
  playMove,
  wrongLegalMove,
} from './app-stubs';

test('teach shows the guide, recall withholds it, and Show me reveals without spending budget', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Learn the line');
  await expect(page.locator('.guide-overlay .route-arrow')).toBeVisible();
  await expect(page.locator('#show-hint')).toHaveCount(0);

  for (const move of firstLine) await playMove(page, move);

  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Recall');
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
  await expect(page.locator('#show-hint')).toBeVisible();
  await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);

  await page.locator('#show-hint').click();
  await expect(page.locator('.guide-overlay .route-arrow')).toBeVisible();
  await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);
});

test('keeps the Board and Eval Bar nodes through a move redraw', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await expect(page.locator('.board')).toBeVisible();
  await page.evaluate(() => {
    const state = globalThis as typeof globalThis & { __practiceRefs: { board: Element | null; evalBar: Element | null } };
    state.__practiceRefs = { board: document.querySelector('.board'), evalBar: document.querySelector('.eval-bar, .eval-note') };
  });
  await playMove(page, lineMoves()[0][0]);
  const refs = await page.evaluate(() => {
    const state = globalThis as typeof globalThis & { __practiceRefs: { board: Element | null; evalBar: Element | null } };
    return {
      board: state.__practiceRefs.board === document.querySelector('.board'),
      evalBar: state.__practiceRefs.evalBar === document.querySelector('.eval-bar, .eval-note'),
    };
  });
  expect(refs.board).toBe(true);
  expect(refs.evalBar).toBe(true);
});

test('one mistake spends one slot and completes the selected line', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.budget-slot.is-spent')).toHaveCount(1);
  await playMove(page, firstLine[0]);
  for (const move of firstLine.slice(1)) await playMove(page, move);

  await expect(page.locator('.summary-panel')).toBeVisible();
});

test('summary, timed queue, and Proceed route to Intermediate', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  const [firstLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await playMove(page, firstLine[0]);
  for (const move of firstLine.slice(1)) await playMove(page, move);

  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('.summary-panel')).toContainText('Lines banked');
  await expect(page.locator('.summary-panel')).toContainText('Hints used');
  await expect(page.locator('.summary-panel')).toContainText('Time');
  await expect(page.locator('.summary-panel')).toContainText('Course mastery');
  await expect(page.locator('#review-now')).toBeVisible();

  await page.locator('#back-dashboard').click();
  await expect(page.locator('#review-queue')).toHaveCount(0);
  await page.locator('#queue-nav').click();
  await expect(page.locator('.queue-empty')).toBeVisible();
  await expect(page.locator('.queue-upcoming-row')).toBeVisible();
  await page.locator('#back-dashboard').click();
  await expect(page.locator('#review-queue')).toHaveCount(0);
  await expect(page.locator('.course-card').first().locator('button[data-level="intermediate"]')).toBeEnabled();
});

test('Proceed returns to the dashboard after a clean one-line lesson', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playLessonClean(page);
  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('#review-now')).toHaveCount(0);
  await page.locator('#proceed').click();
  await expect(page.locator('.dashboard-intro')).toBeVisible();
});
