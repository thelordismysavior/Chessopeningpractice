import { expect, test } from '@playwright/test';
import { installAppStubs, startFirstCoursePractice } from './app-stubs';

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 600, height: 960 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];

const primaryRoutes = [
  '/#/course/jobava-london',
  '/#/browse',
  '/#/lines',
  '/#/review-queue',
  '/#/settings',
  '/#/sources',
  '/#/account',
];

test('supported viewports keep controls reachable and the board accessible', async ({ page }) => {
  await installAppStubs(page);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    for (const route of primaryRoutes) {
      await page.goto(route);
      await expect(page.getByRole('main')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }

    await page.goto('/');

    const heights = await page.locator('button:visible, input:visible, select:visible, summary:visible, a.button:visible, a.quiet-button:visible, a.course-card:visible').evaluateAll((controls) => controls.map((control) => control.getBoundingClientRect().height));
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(44);

    const headingLevels = await page.locator('h1, h2, h3').evaluateAll((headings) => headings.map((heading) => Number(heading.tagName.slice(1))));
    expect(headingLevels[0]).toBe(1);
    expect(headingLevels.every((level, index) => index === 0 || level - headingLevels[index - 1] <= 1)).toBe(true);

    await page.locator('#continue-practice').focus();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).not.toBe('none');

    await startFirstCoursePractice(page);
    await expect(page.locator('.board')).toBeVisible();
    await expect(page.locator('.board')).toHaveAttribute('aria-label', 'Chess board');
    await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('[aria-live]')).not.toHaveCount(0);
    await expect(page.locator('.board-square')).toHaveCount(64);
    expect(await page.locator('.board-square[aria-label$=", empty"]').count()).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
