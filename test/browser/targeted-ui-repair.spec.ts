import { expect, test, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';

type LessonData = { lines: string[][]; nextTitle: string };

async function installAppStubs(page: Page, failCompleteSave = false): Promise<void> {
  await page.addInitScript((fail) => {
    localStorage.setItem('chess-practice.move-duration', '0');
    (globalThis as typeof globalThis & { __failCompleteSave?: boolean }).__failCompleteSave = fail;
  }, failCompleteSave);
  await page.route('**/src/firebase.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const signInWithEmail = async () => undefined;
      export const signOutUser = async () => undefined;
      export const watchUser = (callback) => { queueMicrotask(() => callback({ email: 'test@example.com' })); return () => undefined; };
    `,
  }));
  await page.route('**/src/progress.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const progressByCourse = new Map();
      globalThis.__progressByCourse = progressByCourse;
      const emptyRecord = () => ({ attempts: 0, corrects: 0, misses: 0, hints: 0, reviewStreak: 0, due: false });
      const emptyProgress = () => ({ completedLevels: [], unlockedLevel: 0, completedVariationIds: [], positions: {}, practiceMs: 0 });
      const migrateProgress = (stored) => {
        if (!stored) return emptyProgress();
        if (stored.positions && !stored.completedPositionIds && !stored.missedPositionIds) {
          return {
            completedLevels: stored.completedLevels ?? [],
            unlockedLevel: stored.unlockedLevel ?? 0,
            completedVariationIds: stored.completedVariationIds ?? [],
            positions: { ...(stored.positions ?? {}) },
            practiceMs: stored.practiceMs ?? 0,
          };
        }
        const positions = { ...(stored.positions ?? {}) };
        for (const id of stored.completedPositionIds ?? []) {
          positions[id] = { ...emptyRecord(), ...positions[id], attempts: 1, corrects: 1 };
        }
        for (const id of stored.missedPositionIds ?? []) {
          const before = positions[id] ?? emptyRecord();
          positions[id] = { ...before, attempts: Math.max(before.attempts, 1), corrects: 0, misses: 1, reviewStreak: 0, due: true };
        }
        return {
          completedLevels: stored.completedLevels ?? [],
          unlockedLevel: stored.unlockedLevel ?? 0,
          completedVariationIds: stored.completedVariationIds ?? [],
          positions,
          practiceMs: stored.practiceMs ?? 0,
        };
      };
      export function diffProgress(saved, current) {
        const positions = {};
        for (const [id, record] of Object.entries(current.positions)) {
          const before = saved.positions[id] ?? emptyRecord();
          const delta = {
            attempts: record.attempts - before.attempts,
            corrects: record.corrects - before.corrects,
            misses: record.misses - before.misses,
            hints: record.hints - before.hints,
            reviewStreak: record.reviewStreak,
            due: record.due,
          };
          const changed = delta.attempts !== 0 || delta.corrects !== 0 || delta.misses !== 0 || delta.hints !== 0
            || before.reviewStreak !== record.reviewStreak || before.due !== record.due;
          if (changed) positions[id] = delta;
        }
        return {
          completedLevels: current.completedLevels,
          unlockedLevel: current.unlockedLevel,
          completedVariationIds: current.completedVariationIds,
          practiceMs: current.practiceMs - saved.practiceMs,
          positions,
        };
      }
      export function mergeProgress(stored, delta) {
        const positions = { ...stored.positions };
        for (const [id, entry] of Object.entries(delta.positions)) {
          const before = positions[id] ?? emptyRecord();
          positions[id] = {
            attempts: before.attempts + entry.attempts,
            corrects: before.corrects + entry.corrects,
            misses: before.misses + entry.misses,
            hints: before.hints + entry.hints,
            reviewStreak: entry.reviewStreak,
            due: entry.due,
          };
        }
        return {
          completedLevels: [...new Set([...stored.completedLevels, ...delta.completedLevels])],
          unlockedLevel: Math.max(stored.unlockedLevel, delta.unlockedLevel),
          completedVariationIds: [...new Set([...stored.completedVariationIds, ...delta.completedVariationIds])],
          positions,
          practiceMs: stored.practiceMs + delta.practiceMs,
        };
      }
      export async function loadProgress(courseId) {
        return migrateProgress(progressByCourse.get(courseId));
      }
      export async function saveProgress(courseId, delta) {
        if (globalThis.__failCompleteSave && delta.completedLevels.includes('beginner')) throw new Error('save failed');
        const stored = migrateProgress(progressByCourse.get(courseId));
        progressByCourse.set(courseId, mergeProgress(stored, delta));
      }
      export async function resetAllProgress(courseIds) {
        if (globalThis.__failProgressReset) throw new Error('reset failed');
        courseIds.forEach((courseId) => progressByCourse.delete(courseId));
      }
    `,
  }));
}

async function openDashboard(page: Page, failCompleteSave = false): Promise<void> {
  await installAppStubs(page, failCompleteSave);
  await page.goto('/');
  await expect(page.locator('.dashboard-intro')).toBeVisible();
}

function lessonData(level: 'beginner' | 'intermediate' = 'beginner'): LessonData {
  const lesson = COURSES[0].lessons[level];
  return {
    lines: lesson.variations.map((variation) => variation.positions.map((position) => position.expectedMove)),
    nextTitle: COURSES[0].lessons.intermediate.variations[0].title,
  };
}

async function playMove(page: Page, move: string, mode: 'click' | 'drag' = 'click'): Promise<void> {
  const from = page.locator(`[data-square="${move.slice(0, 2)}"]`);
  const to = page.locator(`[data-square="${move.slice(2, 4)}"]`);
  await expect(from).toBeVisible();
  if (mode === 'drag') await from.dragTo(to);
  else {
    await from.click();
    await to.click();
  }
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
}

async function playLesson(page: Page, lines: string[][]): Promise<void> {
  for (const moves of lines) {
    for (const move of moves) await playMove(page, move);
    for (const move of moves) await playMove(page, move);
  }
}

test('click and drag moves work in Chromium', async ({ page }) => {
  await openDashboard(page);
  const data = lessonData();
  const firstMove = data.lines[0][0];

  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  const origin = page.locator(`[data-square="${firstMove.slice(0, 2)}"]`);
  await expect(origin).toHaveAttribute('aria-pressed', 'false');
  await origin.click();
  await expect(page.locator(`[data-square="${firstMove.slice(0, 2)}"]`)).toHaveAttribute('aria-pressed', 'true');
  await page.locator(`[data-square="${firstMove.slice(2, 4)}"]`).click();
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');

  await page.locator('.back-button').click();
  await expect(page.locator('.dashboard-intro')).toBeVisible();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playMove(page, firstMove, 'drag');
});

test('drag lift is owned by the app render tree', async ({ page }) => {
  await openDashboard(page);
  const firstMove = lessonData().lines[0][0];
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  const origin = page.locator(`[data-square="${firstMove.slice(0, 2)}"]`);
  const box = await origin.boundingBox();
  if (!box) throw new Error('Origin square has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width, box.y + box.height / 2);

  await expect(page.locator('#app > .drag-lift')).toHaveCount(1);
  await page.mouse.up();
});

test('completion focus is stable and Proceed opens the next lesson', async ({ page }) => {
  await openDashboard(page);
  const data = lessonData();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playLesson(page, data.lines);

  await expect(page.locator('#proceed')).toBeVisible();
  await expect(page.locator('#proceed')).toBeFocused();
  await page.locator('#proceed').click();
  await expect(page.locator('.line-title')).toHaveText(data.nextTitle);
});

test('save failure keeps completion recoverable without stealing focus', async ({ page }) => {
  await openDashboard(page, true);
  const data = lessonData();
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playLesson(page, data.lines);

  await expect(page.locator('#retry-save')).toBeVisible();
  await expect(page.locator('#proceed')).toBeDisabled();
  await expect(page.locator('.summary-panel')).toContainText('Save progress to unlock Intermediate.');
  await page.locator('#retry-save').focus();
  await page.locator('#retry-save').click();
  await expect(page.locator('#proceed')).not.toBeFocused();

  await page.evaluate(() => { (globalThis as typeof globalThis & { __failCompleteSave?: boolean }).__failCompleteSave = false; });
  await page.locator('#retry-save').click();
  await expect(page.locator('#proceed')).toBeEnabled();
});

test('dashboard and practice stay within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openDashboard(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await expect(page.locator('.board')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Dashboard settings confirm reset and preserve move duration', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate((courseIds) => {
    const state = globalThis as typeof globalThis & { __progressByCourse: Map<string, object> };
    courseIds.forEach((courseId) => state.__progressByCourse.set(courseId, {
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      completedVariationIds: [],
      positions: {},
      practiceMs: 0,
    }));
  }, COURSES.map((course) => course.id));

  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await page.locator('#settings').click();
  await expect(page.locator('#show-reset-progress')).toHaveCount(0);
  await page.locator('#settings-dialog').getByRole('button', { name: 'Done' }).click();
  await page.locator('#back-dashboard').click();
  await expect(page.locator('.course-count')).toHaveText(['01 / 03', '01 / 03', '01 / 03', '01 / 03']);

  await page.locator('#settings').click();
  await page.locator('#show-reset-progress').click();
  await expect(page.locator('#confirm-reset-progress')).toBeFocused();
  await page.locator('#confirm-reset-progress').click();

  await expect(page.locator('.dashboard-intro')).toBeVisible();
  await expect(page.locator('.course-count')).toHaveText(['00 / 03', '00 / 03', '00 / 03', '00 / 03']);
  await expect(page.locator('.lesson-row').nth(1)).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('chess-practice.move-duration'))).toBe('0');
});

test('failed reset stays open and can be retried', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate((courseId) => {
    const state = globalThis as typeof globalThis & {
      __failProgressReset?: boolean;
      __progressByCourse: Map<string, object>;
    };
    state.__failProgressReset = true;
    state.__progressByCourse.set(courseId, { completedLevels: ['beginner'], unlockedLevel: 1, completedVariationIds: [], positions: {}, practiceMs: 0 });
  }, COURSES[0].id);

  await page.locator('#settings').click();
  await page.locator('#show-reset-progress').click();
  await page.locator('#confirm-reset-progress').click();

  await expect(page.locator('#settings-dialog')).toHaveAttribute('open', '');
  await expect(page.locator('#reset-progress-error')).toBeVisible();
  await expect(page.locator('#confirm-reset-progress')).toBeEnabled();
  expect(await page.evaluate((courseId) => {
    const state = globalThis as typeof globalThis & { __progressByCourse: Map<string, object> };
    return state.__progressByCourse.has(courseId);
  }, COURSES[0].id)).toBe(true);

  await page.evaluate(() => {
    (globalThis as typeof globalThis & { __failProgressReset?: boolean }).__failProgressReset = false;
  });
  await page.locator('#confirm-reset-progress').click();
  await expect(page.locator('.dashboard-intro')).toBeVisible();
});
