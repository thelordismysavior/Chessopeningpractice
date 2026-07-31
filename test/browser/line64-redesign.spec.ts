import { expect, test } from '@playwright/test';
import { expectNoOverflow, openDashboard } from './app-stubs';

test('LINE/64 practice keeps the board in the focused reading rail', async ({ page }) => {
  await openDashboard(page, 1440, 900);
  await page.locator('.course-card').first().click();
  await page.locator('[data-start-level="beginner"]').click();
  await expect(page.locator('.eval-bar')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const layout = document.querySelector<HTMLElement>('.practice-layout')!.getBoundingClientRect();
    const copy = document.querySelector<HTMLElement>('.lesson-copy')!.getBoundingClientRect();
    const board = document.querySelector<HTMLElement>('.board-panel')!.getBoundingClientRect();
    const evalBar = document.querySelector<HTMLElement>('.eval-bar')!.getBoundingClientRect();
    return { layoutWidth: layout.width, copyLeft: copy.left, boardLeft: board.left, boardTop: board.top, copyBottom: copy.bottom, evalWidth: evalBar.width, evalHeight: evalBar.height };
  });

  expect(geometry.layoutWidth).toBeLessThanOrEqual(652);
  expect(Math.abs(geometry.copyLeft - geometry.boardLeft)).toBeLessThanOrEqual(1);
  expect(geometry.boardTop).toBeGreaterThan(geometry.copyBottom);
  expect(geometry.evalWidth).toBeGreaterThan(geometry.evalHeight);
  await expect(page.locator('.guide-overlay .route-origin, .guide-overlay .route-target')).toHaveCount(2);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow(page);
  await expect(page.locator('.mode-switch')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Learn', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: 'Drill', exact: true })).toHaveAttribute('aria-selected', 'false');
  await page.getByRole('tab', { name: 'Drill', exact: true }).click();
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
});

test('Home Courses are single links and shared navigation stays sparse', async ({ page }) => {
  await openDashboard(page, 1440, 900);

  await expect(page.locator('.course-card')).toHaveCount(4);
  await expect(page.locator('.course-card').first()).toHaveAttribute('href', /#\/course\/jobava-london$/);
  await expect(page.locator('.course-card button')).toHaveCount(0);
  await expect(page.locator('#courses-nav')).toHaveText('Courses');
  await expect(page.locator('.topbar .account-email, .topbar #sign-out')).toHaveCount(0);
});
