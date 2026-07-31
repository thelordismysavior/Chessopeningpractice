import { expect, test } from '@playwright/test';
import { installAppStubs } from './app-stubs';

test('signed-in entry is LINE/64 Home with a useful Continue action', async ({ page }) => {
  await installAppStubs(page);
  await page.goto('/');

  await expect(page.locator('.dashboard-intro')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Keep the line close.' })).toBeVisible();
  await expect(page.getByText('LINE/64', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue practice' })).toBeVisible();
  await expect(page.locator('.course-card')).toHaveCount(4);
  await expect(page).toHaveURL(/#\/home$/);
});

test('hash navigation supports parameters, browser Back, refresh, and safe fallback', async ({ page }) => {
  await installAppStubs(page);
  await page.goto('/');
  await expect(page.locator('.dashboard-intro')).toBeVisible();

  await page.locator('#browse-all').click();
  await expect(page).toHaveURL(/#\/browse$/);
  await expect(page.locator('.browse-page')).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.dashboard-intro')).toBeVisible();

  await page.reload();
  await expect(page.locator('.dashboard-intro')).toBeVisible();

  await page.goto('/#/browse/jobava-london/beginner-main');
  await expect(page).toHaveURL(/#\/browse\/jobava-london\/beginner-main$/);
  await expect(page.locator('.line-concept')).toBeVisible();
  await page.locator('#study-line').click();
  await expect(page.locator('.walker')).toBeVisible();

  await page.goto('/#/not-a-real-surface');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.dashboard-intro')).toBeVisible();
});

test('Result without a current tab summary returns Home', async ({ page }) => {
  await installAppStubs(page);
  await page.goto('/');
  await page.evaluate(() => sessionStorage.removeItem('chess-practice.latest-result'));
  await page.goto('/#/result');
  await expect(page).toHaveURL(/#\/home$/);
  await expect(page.locator('.dashboard-intro')).toBeVisible();
});
