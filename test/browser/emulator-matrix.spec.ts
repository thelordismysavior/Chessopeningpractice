import { expect, test, type Page } from '@playwright/test';
import { COURSES, type LevelKey } from '../../src/courses';
import { firstBranchPoint } from '../../src/lesson-runner';
import { expectNoOverflow } from './app-stubs';
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

async function completeLine(page: Page, level: LevelKey, useDrag = false): Promise<void> {
  const moves = COURSES[0].lessons[level].variations[0].positions.map((position) => position.expectedMove);
  const sequence = [...moves, ...moves];
  for (const [index, move] of sequence.entries()) {
    await playMove(page, move, useDrag && index === 0);
    if (index < sequence.length - 1) await expect(page.locator('#proceed')).toHaveCount(0);
  }
  const core = COURSES[0].lessons[level].variations.find((variation) => variation.kind === 'core');
  const branch = core && firstBranchPoint(COURSES[0].lessons[level], core);
  if (branch) await playMove(page, branch.position.expectedMove);
  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('#proceed')).toBeFocused();
}

async function proceed(page: Page): Promise<void> {
  await page.locator('#proceed').click();
  await expect(page.locator('.result-page')).toBeVisible();
  await expect(page.locator('#result-next-action')).toHaveCount(1);
  await page.locator('.wordmark').click();
  await expect(page.locator('.dashboard-intro')).toBeVisible();
}

test('emulator-backed Chromium journey keeps levels directly accessible', async ({ page }) => {
  test.setTimeout(300_000);
  await openDashboard(page, 1440);
  await expectNoOverflow(page);
  await expect(page.locator('.course-grid')).toBeVisible();

  const firstCourse = page.locator('.course-card').first();
  await expect(firstCourse.locator('.lesson-row').nth(1)).toBeEnabled();
  await expect(firstCourse.locator('.lesson-row').nth(2)).toBeEnabled();
  await firstCourse.locator('button[data-level="beginner"]').click();
  await expect(page.locator('.board')).toBeVisible();
  await expectNoOverflow(page);
  await expect(page.locator('.guide-overlay .route-arrow')).toHaveCSS('height', '6px');
  await completeLine(page, 'beginner');
  await proceed(page);

  await firstCourse.locator('button[data-level="intermediate"]').click();
  await completeLine(page, 'intermediate', true);
  await proceed(page);

  await firstCourse.locator('button[data-level="advanced"]').click();
  await completeLine(page, 'advanced');
  await proceed(page);
  await expect(page.locator('.course-count').first()).toHaveText('00 / 03');
  await expectNoOverflow(page);
});

test('emulator-backed save failure remains recoverable after the final move', async ({ page }) => {
  test.setTimeout(120_000);
  await openDashboard(page, 390);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  const moves = COURSES[0].lessons.beginner.variations[0].positions.map((position) => position.expectedMove);
  const sequence = [...moves, ...moves];
  for (const move of sequence.slice(0, -1)) await playMove(page, move);

  await page.waitForTimeout(300);
  await page.context().setOffline(true);
  await playMove(page, sequence.at(-1)!);
  const lesson = COURSES[0].lessons.beginner;
  const core = lesson.variations.find((variation) => variation.kind === 'core');
  const branch = core && firstBranchPoint(lesson, core);
  if (branch) await playMove(page, branch.position.expectedMove);

  await expect(page.locator('#proceed')).toBeVisible();
  await page.locator('#proceed').dispatchEvent('click');
  await expect(page.locator('#proceed')).toHaveText('Saving...');
  await expect(page.locator('#retry-save')).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#proceed')).toBeDisabled();
  await expect(page.locator('.summary-panel')).toContainText('Save progress before leaving the course.');
  await page.context().setOffline(false);
  await page.locator('#retry-save').click();
  await expect(page.locator('#proceed')).toBeEnabled();
});

test('Dashboard reset clears saved progress and preserves move duration', async ({ page }) => {
  await openDashboard(page, 390);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await completeLine(page, 'beginner');
  await page.locator('#back-dashboard').click();
  await expect(page.locator('.course-count').first()).toHaveText('00 / 03');

  await page.locator('#settings').click();
  await page.locator('#move-duration').fill('350');
  await page.locator('#move-duration').blur();
  await page.locator('#show-reset-progress').click();
  await page.locator('#confirm-reset-progress').click();

  await expect(page.locator('.dashboard-intro')).toBeVisible();
  await expect(page.locator('.course-count').first()).toHaveText('00 / 03');
  await expect(page.locator('.course-card').first().locator('.lesson-row').nth(1)).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem('chess-practice.move-duration'))).toBe('350');
});

test('emulator migration and concurrent saves retain timed progress across reload', async ({ page }) => {
  await openDashboard(page, 390);
  const courseId = COURSES[0].id;
  await page.evaluate(async (id) => {
    const bridgePath = '/test/browser/progress-bridge.ts';
    const { seedLegacyProgress } = await import(/* @vite-ignore */ bridgePath);
    await seedLegacyProgress(id, {
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      completedVariationIds: ['beginner-main'],
      practiceMs: 1234,
      positions: {
        legacyDue: { attempts: 4, corrects: 2, misses: 1, hints: 0, reviewStreak: 0, due: true },
        legacyCompleted: { attempts: 3, corrects: 3, misses: 0, hints: 0, reviewStreak: 0, due: false },
        untouched: { attempts: 0, corrects: 0, misses: 0, hints: 0, reviewStreak: 0, due: false },
      },
    });
  }, courseId);

  const migrated = await page.evaluate(async (id) => {
    const progressPath = '/src/progress.ts';
    const { loadProgress } = await import(/* @vite-ignore */ progressPath);
    const positions = (await loadProgress(id)).positions as Record<string, { intervalStage?: number; nextReviewAt?: number }>;
    return Object.fromEntries(Object.entries(positions).map(([positionId, position]) => [positionId, {
      intervalStage: position.intervalStage,
      nextReviewAt: position.nextReviewAt,
    }]));
  }, courseId);
  expect(migrated.legacyDue.intervalStage).toBe(0);
  expect(migrated.legacyDue.nextReviewAt).toBeLessThanOrEqual(Date.now());
  expect(migrated.legacyCompleted.intervalStage).toBe(0);

  await page.evaluate(async (id) => {
    const progressPath = '/src/progress.ts';
    const { saveProgress } = await import(/* @vite-ignore */ progressPath);
    const makeDelta = (attempts: number, stage: number) => ({
      completedLevels: [], unlockedLevel: 0, completedVariationIds: [], practiceMs: 10,
      positions: { legacyDue: { attempts, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false, intervalStage: stage, nextReviewAt: Date.now() + 14400000 } },
    });
    await Promise.all([saveProgress(id, makeDelta(1, 1)), saveProgress(id, makeDelta(2, 2))]);
  }, courseId);
  await page.reload();
  await expect(page.locator('.dashboard-intro')).toBeVisible();
  const reloaded = await page.evaluate(async (id) => {
    const progressPath = '/src/progress.ts';
    const { loadProgress } = await import(/* @vite-ignore */ progressPath);
    return (await loadProgress(id)).positions.legacyDue.attempts;
  }, courseId);
  expect(reloaded).toBe(7);
});
