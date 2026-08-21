import { expect, test } from '@playwright/test';
import { expectNoOverflow, lineMoves, openDashboard, playMove, startFirstCoursePractice } from './app-stubs';

test('a move redraw preserves the viewport position', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await startFirstCoursePractice(page);

  const scrollBeforeMove = await page.evaluate(() => window.scrollY);
  await playMove(page, lineMoves()[0][0]);
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBeforeMove);
});

test('LINE/64 practice keeps a larger board fixed beside the lesson on desktop', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await startFirstCoursePractice(page);
  await expect(page.locator('.eval-bar')).toBeVisible();

  const geometry = await page.evaluate(() => {
    const boardColumn = document.querySelector<HTMLElement>('.practice-board-column')!.getBoundingClientRect();
    const copyColumn = document.querySelector<HTMLElement>('.practice-copy-column')!.getBoundingClientRect();
    const board = document.querySelector<HTMLElement>('.board')!.getBoundingClientRect();
    const mode = document.querySelector<HTMLElement>('.mode-switch')!.getBoundingClientRect();
    return {
      boardColumnLeft: boardColumn.left,
      boardWidth: board.width,
      boardBottom: board.bottom,
      copyColumnLeft: copyColumn.left,
      modeLeft: mode.left,
    };
  });

  expect(Math.abs(geometry.modeLeft - geometry.boardColumnLeft)).toBeLessThanOrEqual(1);
  expect(geometry.copyColumnLeft).toBeGreaterThan(geometry.boardColumnLeft + geometry.boardWidth);
  expect(geometry.boardWidth).toBeGreaterThan(650);
  expect(geometry.boardWidth).toBeLessThanOrEqual(680);
  expect(geometry.boardBottom).toBeLessThanOrEqual(1000);

  await page.setViewportSize({ width: 1024, height: 768 });
  const shortDesktop = await page.evaluate(() => {
    const board = document.querySelector<HTMLElement>('.board')!.getBoundingClientRect();
    const copy = document.querySelector<HTMLElement>('.practice-copy-column')!.getBoundingClientRect();
    return { boardLeft: board.left, boardWidth: board.width, boardBottom: board.bottom, copyLeft: copy.left };
  });
  expect(shortDesktop.copyLeft).toBeGreaterThan(shortDesktop.boardLeft);
  expect(shortDesktop.boardWidth).toBeLessThan(geometry.boardWidth);
  expect(shortDesktop.boardBottom).toBeLessThanOrEqual(768);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoOverflow(page);
  const mobileOrder = await page.evaluate(() => {
    const meta = document.querySelector<HTMLElement>('.practice-meta')!.getBoundingClientRect();
    const mode = document.querySelector<HTMLElement>('.mode-switch')!.getBoundingClientRect();
    const board = document.querySelector<HTMLElement>('.board-panel')!.getBoundingClientRect();
    const copy = document.querySelector<HTMLElement>('.lesson-copy')!.getBoundingClientRect();
    return { metaBottom: meta.bottom, modeTop: mode.top, modeBottom: mode.bottom, boardTop: board.top, boardBottom: board.bottom, copyTop: copy.top };
  });
  expect(mobileOrder.modeTop).toBeGreaterThan(mobileOrder.metaBottom);
  expect(mobileOrder.boardTop).toBeGreaterThan(mobileOrder.modeBottom);
  expect(mobileOrder.copyTop).toBeGreaterThan(mobileOrder.boardBottom);
  await expect(page.getByRole('tab', { name: 'Learn', exact: true })).toHaveAttribute('aria-selected', 'true');
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
