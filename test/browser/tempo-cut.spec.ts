import { expect, test } from '@playwright/test';
import { installAppStubs } from './app-stubs';
import { COURSES } from '../../src/courses';

test.describe('Tempo Cut', () => {
  test('pressing a settled learner piece cuts the sequence and selects it', async ({ page }) => {
    await installAppStubs(page);
    await page.addInitScript(() => localStorage.setItem('chess-practice.move-duration', '2000'));
    await page.goto('/');
    await expect(page.locator('.dashboard-intro')).toBeVisible();
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

    const move = COURSES[0].lessons.beginner.variations[0].positions[0].expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await page.locator('[data-square="a2"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[data-square="a2"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('pressing an empty square does not cut the sequence', async ({ page }) => {
    await installAppStubs(page);
    await page.addInitScript(() => localStorage.setItem('chess-practice.move-duration', '2000'));
    await page.goto('/');
    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    const move = COURSES[0].lessons.beginner.variations[0].positions[0].expectedMove;
    await page.locator(`[data-square="${move.slice(0, 2)}"]`).click();
    await page.locator(`[data-square="${move.slice(2, 4)}"]`).click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
    await page.locator('[data-square="a4"]').click();
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'true');
  });
});
