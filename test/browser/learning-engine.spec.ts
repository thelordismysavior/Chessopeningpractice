import { expect, test, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';

const VIEWPORTS = [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
] as const;

async function installAppStubs(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('chess-practice.move-duration', '0');
  });
  await page.route('**/src/firebase.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      export const signIn = async () => undefined;
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
        const stored = migrateProgress(progressByCourse.get(courseId));
        progressByCourse.set(courseId, mergeProgress(stored, delta));
      }
      export async function resetAllProgress(courseIds) {
        courseIds.forEach((courseId) => progressByCourse.delete(courseId));
      }
    `,
  }));
}

async function openDashboard(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await installAppStubs(page);
  await page.goto('/');
  await expect(page.locator('.dashboard-intro')).toBeVisible();
}

async function playMove(page: Page, move: string): Promise<void> {
  const from = page.locator(`[data-square="${move.slice(0, 2)}"]`);
  const to = page.locator(`[data-square="${move.slice(2, 4)}"]`);
  await expect(from).toBeVisible();
  await from.click();
  await to.click();
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
}

function lineMoves(level: 'beginner' | 'intermediate' = 'beginner'): string[][] {
  return COURSES[0].lessons[level].variations.map((variation) => variation.positions.map((position) => position.expectedMove));
}

async function playLineTwice(page: Page, moves: string[]): Promise<void> {
  for (const move of moves) await playMove(page, move);
  for (const move of moves) await playMove(page, move);
}

async function playLessonClean(page: Page, level: 'beginner' | 'intermediate' = 'beginner'): Promise<void> {
  for (const moves of lineMoves(level)) await playLineTwice(page, moves);
}

function wrongLegalMove(expected: string): string {
  if (expected === 'd2d4') return 'e2e4';
  if (expected === 'b1c3') return 'g1f3';
  if (expected === 'c1f4') return 'g1f3';
  return expected === 'e2e3' ? 'e2e4' : 'a2a3';
}

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test('teach shows the guide, recall withholds it, and Show me reveals without spending budget', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);
      const [firstLine] = lineMoves();
      await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

      await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Learn the line');
      await expect(page.locator('.guide-overlay .route-arrow')).toBeVisible();
      await expect(page.locator('#show-hint')).toHaveCount(0);

      for (const move of firstLine) await playMove(page, move);

      await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Recall');
      await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
      await expect(page.locator('#show-hint')).toBeVisible();
      await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);

      await page.locator('#show-hint').click();
      await expect(page.locator('.guide-overlay .route-arrow')).toBeVisible();
      await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);
    });

    test('one mistake spends one slot and still banks; two mistakes restart recall', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);
      const [firstLine, secondLine] = lineMoves();
      await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

      for (const move of firstLine) await playMove(page, move);
      await playMove(page, wrongLegalMove(firstLine[0]));
      await expect(page.locator('.budget-slot.is-spent')).toHaveCount(1);
      await playMove(page, firstLine[0]);
      for (const move of firstLine.slice(1)) await playMove(page, move);

      await expect(page.locator('.line-handoff')).toContainText(COURSES[0].lessons.beginner.variations[0].title);
      await expect(page.locator('.line-handoff')).toContainText(COURSES[0].lessons.beginner.variations[1].title);
      await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Learn the line');
      await expect(page.locator(`[data-square="${secondLine[0].slice(0, 2)}"]`)).toBeEnabled();

      for (const move of secondLine) await playMove(page, move);
      await playMove(page, wrongLegalMove(secondLine[0]));
      await playMove(page, secondLine[0]);
      await playMove(page, wrongLegalMove(secondLine[1]));
      await playMove(page, secondLine[1]);
      for (const move of secondLine.slice(2)) await playMove(page, move);

      await expect(page.locator('.lesson-copy > .eyebrow')).toContainText('Recall');
      await expect(page.locator('.budget-slot.is-spent')).toHaveCount(0);
      await expect(page.locator('.guide-overlay .route-arrow')).toHaveCount(0);
    });

    test('summary, review clear streak, and Proceed route to Intermediate', async ({ page }) => {
      await openDashboard(page, viewport.width, viewport.height);
      const lines = lineMoves();
      const firstLine = lines[0];
      await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();

      for (const move of firstLine) await playMove(page, move);
      await playMove(page, wrongLegalMove(firstLine[0]));
      await playMove(page, firstLine[0]);
      for (const move of firstLine.slice(1)) await playMove(page, move);

      for (const moves of lines.slice(1)) await playLineTwice(page, moves);

      await expect(page.locator('.summary-panel')).toBeVisible();
      await expect(page.locator('.summary-panel')).toContainText('Lines banked');
      await expect(page.locator('.summary-panel')).toContainText('Hints used');
      await expect(page.locator('.summary-panel')).toContainText('Time');
      await expect(page.locator('.summary-panel')).toContainText('Course mastery');
      await expect(page.locator('#review-now')).toBeVisible();

      await page.locator('#back-dashboard').click();
      await expect(page.locator('.review-link').first()).toBeVisible();

      await page.locator('.review-link').first().click();
      const reviewMove = firstLine[0];
      await playMove(page, reviewMove);
      await page.locator('#back-after-complete').click();
      await expect(page.locator('.review-link').first()).toBeVisible();

      await page.locator('.review-link').first().click();
      await playMove(page, reviewMove);
      await page.locator('#back-after-complete').click();
      await expect(page.locator('.course-card').first().locator('.review-link')).toHaveCount(0);
      await expect(page.locator('.course-card').first().locator('button[data-level="intermediate"]')).toBeEnabled();
    });
  });
}

test('Proceed still routes Beginner to Intermediate after a clean lesson', async ({ page }) => {
  await openDashboard(page, 1440, 1000);
  await page.locator('.course-card').first().locator('button[data-level="beginner"]').click();
  await playLessonClean(page);
  await expect(page.locator('.summary-panel')).toBeVisible();
  await expect(page.locator('#review-now')).toHaveCount(0);
  await page.locator('#proceed').click();
  await expect(page.locator('.line-title')).toHaveText(COURSES[0].lessons.intermediate.variations[0].title);
});
