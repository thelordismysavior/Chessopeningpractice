import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { openDashboard } from './app-stubs';

const captureDir = process.env.LINE64_CAPTURE_DIR;

async function capture(page: Page, name: string): Promise<void> {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, name), fullPage: true });
}

test('LINE/64 desktop shell and Drill launcher honor the visual contract', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await openDashboard(page, 1440, 900);
  await expect(page.getByRole('heading', { name: /Recall the line/ })).toBeVisible();
  await expect(page.locator('.desktop-nav')).toBeVisible();
  await expect(page.locator('.bottom-nav')).toBeHidden();
  await expect(page.locator('body')).toHaveCSS('background-color', 'oklch(0.15 0.012 255)');
  await capture(page, 'line64-home-1440x900.png');

  await page.locator('[data-nav="drill"]:visible').click();
  await expect(page.locator('.drill-heading')).toBeVisible();
  await expect(page.locator('.drill-grid .lesson-row.is-locked').first()).toBeDisabled();
  await capture(page, 'line64-drill-1440x900.png');
  expect(consoleErrors).toEqual([]);
});

test('LINE/64 mobile practice stays board-first and overflow-free', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await openDashboard(page, 390, 844);
  await expect(page.locator('.bottom-nav')).toBeVisible();
  await expect(page.locator('.desktop-nav')).toBeHidden();
  await capture(page, 'line64-home-390x844.png');

  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await expect(page.locator('.practice-layout')).toHaveCSS('grid-template-columns', /[0-9.]+px/);
  await expect(page.locator('.board')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await capture(page, 'line64-practice-390x844.png');

  await page.locator('#settings').click();
  await expect(page.locator('#settings-dialog')).toHaveAttribute('open', '');
  await capture(page, 'line64-settings-390x844.png');
  expect(consoleErrors).toEqual([]);
});
