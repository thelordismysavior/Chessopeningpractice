import { expect, test, type Page } from '@playwright/test';
import { COURSES, type LevelKey } from '../../src/courses';
import { resetEmulatorProgress, TEST_ACCOUNT } from './emulator';

test.describe.configure({ mode: 'serial' });

test.beforeEach(async () => {
  await resetEmulatorProgress();
});

async function openDashboard(page: Page, width: number): Promise<void> {
  await page.setViewportSize({ width, height: 844 });
  await page.addInitScript(() => localStorage.setItem('chess-practice.move-duration', '0'));
  await page.goto('/');
  await page.evaluate(async ({ email, password }) => {
    const modulePath = '/test/browser/auth-bridge.ts';
    const { signInForBrowserTest } = await import(/* @vite-ignore */ modulePath);
    await signInForBrowserTest(email, password);
  }, TEST_ACCOUNT);
  await expect(page.locator('.dashboard-intro')).toBeVisible();
}

async function expectNoOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function playMove(page: Page, move: string, drag = false): Promise<void> {
  const from = page.locator(`[data-square="${move.slice(0, 2)}"]`);
  const to = page.locator(`[data-square="${move.slice(2, 4)}"]`);
  if (drag) await from.dragTo(to);
  else {
    await from.click();
    await to.click();
  }
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
}

async function completeLevel(page: Page, level: LevelKey, useDrag = false): Promise<void> {
  const sequence = COURSES[0].lessons[level].variations.flatMap((variation) => {
    const moves = variation.positions.map((position) => position.expectedMove);
    return [...moves, ...moves];
  });
  for (const [index, move] of sequence.entries()) {
    await playMove(page, move, useDrag && index === 0);
    if (index < sequence.length - 1) await expect(page.locator('#proceed')).toHaveCount(0);
  }
  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('#proceed')).toBeFocused();
}

async function proceed(page: Page): Promise<void> {
  await page.locator('#proceed').click();
}

for (const [viewport, width] of [['desktop', 1440], ['mobile', 390]] as const) {
  test(`emulator-backed Chromium journey covers ${viewport} progression`, async ({ page }) => {
    test.setTimeout(300_000);
    await openDashboard(page, width);
    await expectNoOverflow(page);
    await expect(page.locator('.course-grid')).toBeVisible();

    const firstCourse = page.locator('.course-card').first();
    await expect(firstCourse.locator('.lesson-row').nth(1)).toBeDisabled();
    await expect(firstCourse.locator('.lesson-row').nth(2)).toBeDisabled();
    await firstCourse.locator('button[data-level="beginner"]').click();
    await expect(page.locator('.board')).toBeVisible();
    await expectNoOverflow(page);
    await expect(page.locator('.guide-overlay .route-arrow')).toHaveCSS('height', '6px');
    await completeLevel(page, 'beginner');
    await proceed(page);
    await expect(page.locator('.line-title')).toBeVisible();

    await completeLevel(page, 'intermediate', true);
    await proceed(page);
    await expect(page.locator('.line-title')).toBeVisible();

    await completeLevel(page, 'advanced');
    await proceed(page);
    await expect(page.locator('.dashboard-intro')).toBeVisible();
    await expect(page.locator('.course-count').first()).toHaveText('03 / 03');
    await expectNoOverflow(page);
  });
}

test('emulator-backed save failure remains recoverable after the final move', async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboard(page, 390);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  const lines = COURSES[0].lessons.beginner.variations.map((variation) => variation.positions.map((position) => position.expectedMove));
  const sequence = lines.flatMap((moves) => [...moves, ...moves]);
  for (const move of sequence.slice(0, -1)) await playMove(page, move);

  await page.waitForTimeout(300);
  await page.context().setOffline(true);
  await playMove(page, sequence.at(-1)!);

  await expect(page.locator('#proceed')).toBeVisible();
  await page.locator('#proceed').dispatchEvent('click');
  await expect(page.locator('#proceed')).toHaveText('Saving...');
  await expect(page.locator('#retry-save')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#proceed')).toBeDisabled();
  await expect(page.locator('.summary-panel')).toContainText('Save progress to unlock Intermediate.');
  await page.context().setOffline(false);
  await page.locator('#retry-save').click();
  await expect(page.locator('#proceed')).toBeEnabled();
});

test('Dashboard reset clears saved progress and preserves move duration', async ({ page }) => {
  await openDashboard(page, 390);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await completeLevel(page, 'beginner');
  await page.locator('#back-dashboard').click();
  await expect(page.locator('.course-count').first()).toHaveText('01 / 03');

  await page.locator('#settings').click();
  await page.locator('#move-duration').fill('350');
  await page.locator('#move-duration').blur();
  await page.locator('#show-reset-progress').click();
  await page.locator('#confirm-reset-progress').click();

  await expect(page.locator('.dashboard-intro')).toBeVisible();
  await expect(page.locator('.course-count').first()).toHaveText('00 / 03');
  await expect(page.locator('.course-card').first().locator('.lesson-row').nth(1)).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('chess-practice.move-duration'))).toBe('350');
});
