import { expect, test } from '@playwright/test';
import { COURSES } from '../../src/courses';
import {
  lineMoves,
  openDashboard,
  playLessonClean,
  playLineTwice,
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

test('one mistake spends one slot and still banks; two mistakes restart recall', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  const [firstLine, secondLine] = lineMoves();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await expect(page.locator('.budget-slot.is-spent')).toHaveCount(1);
  await playMove(page, firstLine[0]);
  for (const move of firstLine.slice(1)) await playMove(page, move);

  await expect(page.locator('.line-handoff')).toContainText(COURSES[0].lessons.beginner.variations[0].title);
  await expect(page.locator('.line-handoff')).toContainText(COURSES[0].lessons.beginner.variations[1].title);
  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Learn the line');
  await expect(page.locator(`[data-square="${secondLine[0].slice(0, 2)}"]`)).toBeEnabled();

  for (const move of secondLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(secondLine[0]));
  await playMove(page, secondLine[0]);
  await playMove(page, wrongLegalMove(secondLine[1]));
  await playMove(page, secondLine[1]);
  for (const move of secondLine.slice(2)) await playMove(page, move);

  await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Recall');
  await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
});

test('summary, review clear streak, and Proceed route to Intermediate', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  const lines = lineMoves();
  const firstLine = lines[0];
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

  for (const move of firstLine) await playMove(page, move);
  await playMove(page, wrongLegalMove(firstLine[0]));
  await playMove(page, firstLine[0]);
  for (const move of firstLine.slice(1)) await playMove(page, move);

  for (const moves of lines.slice(1)) await playLineTwice(page, moves);

  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('.summary-panel')).toContainText('Lines banked');
  await expect(page.locator('.summary-panel')).toContainText('Hints used');
  await expect(page.locator('.summary-panel')).toContainText('Time');
  await expect(page.locator('.summary-panel')).toContainText('Course mastery');
  await expect(page.locator('#review-now')).toBeVisible();

  await page.locator('#back-dashboard').click();
  await expect(page.locator('#review-queue')).toBeVisible();

  await page.locator('#review-queue').click();
  await page.locator('.queue-row button').first().click();
  const reviewMove = firstLine[0];
  await playMove(page, reviewMove);
  await playMove(page, reviewMove);
  await page.locator('#back-after-complete').click();
  await expect(page.locator('#review-queue')).toHaveCount(0);
  await expect(page.locator('.course-card').first().locator('button[data-level="intermediate"]')).toBeEnabled();
});

test('Proceed still routes Beginner to Intermediate after a clean lesson', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playLessonClean(page);
  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('#review-now')).toHaveCount(0);
  await page.locator('#proceed').click();
  await expect(page.locator('.line-title')).toHaveText(COURSES[0].lessons.intermediate.variations[0].title);
});
