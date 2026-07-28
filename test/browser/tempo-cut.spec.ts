import { expect, test, type Page } from '@playwright/test';
import { installAppStubs, playMove } from './app-stubs';
import { COURSES } from '../../src/courses';

const MOVE_DURATION = 2000;

async function setMoveDuration(page: Page): Promise<void> {
  await page.locator('#settings').click();
  await page.locator('#move-duration').fill(String(MOVE_DURATION));
  await page.locator('#move-duration').dispatchEvent('change');
  await page.locator('#settings-dialog button[value="close"]').click();
}

test.describe('Tempo Cut', () => {
  test('pressing a settled learner piece during teach cuts and selects it once', async ({ page }) => {
    await installAppStubs(page);
    await page.addInitScript((duration) => localStorage.setItem('chess-practice.move-duration', String(duration)), MOVE_DURATION);
    await page.goto('/');
    await expect(page.locator('.dashboard-intro')).toBeVisible();
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Learn the line');

    const move = COURSES[0].lessons.beginner.variations[0].positions[0].expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(MOVE_DURATION + 150);
    await page.locator('[data-square="a2"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-square="a2"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('cutting saves the same scored position as a full-tempo run', async ({ page, context }) => {
    await installAppStubs(page);
    await page.addInitScript((duration) => localStorage.setItem('chess-practice.move-duration', String(duration)), MOVE_DURATION);
    await page.goto('/');
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    const position = COURSES[0].lessons.beginner.variations[0].positions[0];
    const move = position.expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(MOVE_DURATION + 150);
    await page.locator('[data-square="a2"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect.poll(() => page.evaluate(
      ({ courseId, positionId }) => (globalThis.__progressByCourse.get(courseId) as { positions?: Record<string, unknown> } | undefined)?.positions?.[positionId],
      { courseId: COURSES[0].id, positionId: position.id },
    )).toBeTruthy();
    const cutRecord = await page.evaluate(
      ({ courseId, positionId }) => (globalThis.__progressByCourse.get(courseId) as { positions: Record<string, unknown> }).positions[positionId],
      { courseId: COURSES[0].id, positionId: position.id },
    );

    const fullPage = await context.newPage();
    await installAppStubs(fullPage);
    await fullPage.addInitScript((duration) => localStorage.setItem('chess-practice.move-duration', String(duration)), MOVE_DURATION);
    await fullPage.goto('/');
    await fullPage.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    await fullPage.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await fullPage.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(fullPage.locator('.board')).toHaveAttribute('aria-busy', 'false', { timeout: 7000 });
    const fullRecord = await fullPage.evaluate(
      ({ courseId, positionId }) => (globalThis.__progressByCourse.get(courseId) as { positions: Record<string, unknown> }).positions[positionId],
      { courseId: COURSES[0].id, positionId: position.id },
    );
    expect(cutRecord).toEqual(fullRecord);
  });

  test('pressing an empty square does not cut the sequence', async ({ page }) => {
    await installAppStubs(page);
    await page.addInitScript((duration) => localStorage.setItem('chess-practice.move-duration', String(duration)), MOVE_DURATION);
    await page.goto('/');
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    const move = COURSES[0].lessons.beginner.variations[0].positions[0].expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await page.waitForTimeout(MOVE_DURATION + 150);
    await page.locator('[data-square="a4"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
  });

  test('a Tempo Cut is available during recall', async ({ page }) => {
    await installAppStubs(page);
    await page.goto('/');
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    const line = COURSES[0].lessons.beginner.variations[0].positions;
    for (const position of line) await playMove(page, position.expectedMove);
    await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Recall');
    await setMoveDuration(page);

    const move = line[0].expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await page.waitForTimeout(MOVE_DURATION + 150);
    await page.locator('[data-square="a2"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-square="a2"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('a learner piece captured by the reply cannot be selected from its ghost', async ({ page }) => {
    await installAppStubs(page);
    await page.goto('/');
    const course = COURSES.find((entry) => entry.id === 'classical-sicilian')!;
    await page.locator('[data-course="classical-sicilian"][data-level="beginner"]').click();
    const line = course.lessons.beginner.variations[0].positions;
    await playMove(page, line[0].expectedMove);
    await playMove(page, line[1].expectedMove);
    await setMoveDuration(page);

    const capturePosition = line[2];
    await page.locator(`[data-square="${capturePosition.expectedMove.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${capturePosition.expectedMove.slice(2, 4)}"]`).click();
    await page.waitForTimeout(MOVE_DURATION + 150);
    await page.locator('[data-square="d4"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await expect(page.locator('[data-square="d4"]')).toHaveAttribute('aria-pressed', 'false');
  });
});
