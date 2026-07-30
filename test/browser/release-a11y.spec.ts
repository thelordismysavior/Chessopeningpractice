import { expect, test } from '@playwright/test';
import { installAppStubs } from './app-stubs';

const viewports = [
  { width: 390, height: 844 },
  { width: 820, height: 1180 },
  { width: 1440, height: 900 },
];

test('supported viewports keep controls reachable and the board accessible', async ({ page }) => {
  await installAppStubs(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    const heights = await page.locator('button:visible, input:visible, select:visible, summary:visible, a.button:visible, a.quiet-button:visible, a.course-card-link:visible').evaluateAll((controls) => controls.map((control) => control.getBoundingClientRect().height));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

    const headingLevels = await page.locator('h1, h2, h3').evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    expect(headingLevels[0]).toBe(1);
    expect(headingLevels.every((level, index) => index === 0 || level - headingLevels[index - 1] <= 1)).toBe(true);

    await page.locator('#continue-practice').focus();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');

    await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.board')).toHaveAttribute('aria-label', 'Chess board');
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[aria-live]')).not.toHaveCount(0);
    await expect(page.locator('.board-square')).toHaveCount(64);
    expect(await page.locator('.board-square[aria-label$=", empty"]').count()).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
