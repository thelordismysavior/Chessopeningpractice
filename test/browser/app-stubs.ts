import { expect, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';
import { firstBranchPoint } from '../../src/lesson-runner';

declare global {
  // eslint-disable-next-line no-var
  var __progressByCourse: Map<string, unknown>;
  // eslint-disable-next-line no-var
  var __seedProgress: [string, unknown][];
  // eslint-disable-next-line no-var
  var __saveFailuresRemaining: number;
  // eslint-disable-next-line no-var
  var __authUser: { email: string; uid: string } | null;
  // eslint-disable-next-line no-var
  var __authCalls: { signIn: number; signUp: number; sendReset: number; signOut: number };
  // eslint-disable-next-line no-var
  var __signOutFailuresRemaining: number;
}

export type AuthStubOptions = {
  initialUser?: { email: string; uid?: string } | null;
  signInCode?: string;
  signInDelayMs?: number;
  signUpCode?: string;
  signUpUid?: string;
  signUpNotifiesBeforeResolve?: boolean;
  resetCode?: string;
  signOutCode?: string;
  signOutFailures?: number;
};

export async function installAppStubs(page: Page, options: AuthStubOptions = {}): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('chess-practice.move-duration', '0');
  });
  await page.addInitScript((authOptions) => {
    globalThis.__authUser = authOptions.initialUser === null
      ? null
      : { email: authOptions.initialUser?.email ?? 'test@example.com', uid: authOptions.initialUser?.uid ?? 'test-owner' };
    globalThis.__authCalls = { signIn: 0, signUp: 0, sendReset: 0, signOut: 0 };
    globalThis.__signOutFailuresRemaining = authOptions.signOutFailures ?? 0;
    (globalThis as typeof globalThis & { __authOptions: AuthStubOptions }).__authOptions = authOptions;
  }, options);
  await page.route('**/src/firebase.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const state = globalThis;
      const fail = (code) => { throw Object.assign(new Error(code), { code }); };
      const notify = () => state.__authCallback?.(state.__authUser);
      export const signInWithEmail = async () => {
        state.__authCalls.signIn += 1;
        if (state.__authOptions.signInCode) fail(state.__authOptions.signInCode);
        if (state.__authOptions.signInDelayMs) await new Promise((resolve) => setTimeout(resolve, state.__authOptions.signInDelayMs));
        state.__authUser = { email: 'test@example.com', uid: 'test-owner' };
        notify();
        return { user: state.__authUser };
      };
      export const signUpWithEmail = async () => {
        state.__authCalls.signUp += 1;
        if (state.__authOptions.signUpCode) fail(state.__authOptions.signUpCode);
        const user = { email: 'test@example.com', uid: state.__authOptions.signUpUid ?? 'pending-owner' };
        if (state.__authOptions.signUpNotifiesBeforeResolve) {
          state.__authUser = user;
          notify();
        }
        return { user };
      };
      export const sendReset = async () => {
        state.__authCalls.sendReset += 1;
        if (state.__authOptions.resetCode) fail(state.__authOptions.resetCode);
      };
      export const signOutUser = async () => {
        state.__authCalls.signOut += 1;
        if (state.__signOutFailuresRemaining > 0) {
          state.__signOutFailuresRemaining -= 1;
          fail(state.__authOptions.signOutCode ?? 'auth/network-request-failed');
        }
        state.__authUser = null;
        notify();
      };
      export const watchUser = (callback) => {
        state.__authCallback = callback;
        queueMicrotask(() => callback(state.__authUser));
        return () => { if (state.__authCallback === callback) state.__authCallback = undefined; };
      };
    `,
  }));
  await page.route('**/src/progress.ts*', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `
      const progressByCourse = new Map();
      globalThis.__progressByCourse = progressByCourse;
      for (const [id, value] of (globalThis.__seedProgress ?? [])) progressByCourse.set(id, value);
      const emptyRecord = () => ({ attempts: 0, corrects: 0, misses: 0, hints: 0, reviewStreak: 0, due: false });
      const reviewIntervals = [14400000, 86400000, 259200000, 604800000, 1209600000, 2592000000, 7776000000, 15552000000];
      const reviewAt = (stage, now = Date.now()) => now + reviewIntervals[Math.min(reviewIntervals.length - 1, Math.max(0, Math.trunc(stage)))];
      const isDue = (record, now = Date.now()) => Boolean(record && (typeof record.nextReviewAt === 'number' ? record.nextReviewAt <= now : record.due));
      const emptyProgress = () => ({ completedLevels: [], unlockedLevel: 0, completedVariationIds: [], positions: {}, practiceMs: 0 });
      const migrateProgress = (stored, now = Date.now()) => {
        if (!stored) return emptyProgress();
        const positions = {};
        for (const [id, value] of Object.entries(stored.positions ?? {})) {
          const record = { ...value };
          const learned = record.attempts > 0 || record.corrects > 0 || record.misses > 0 || record.due;
          positions[id] = record.intervalStage !== undefined || 'nextReviewAt' in record || !learned
            ? record
            : { ...record, intervalStage: 0, nextReviewAt: record.due ? now : reviewAt(0, now) };
        }
        for (const id of stored.completedPositionIds ?? []) {
          const before = positions[id] ?? emptyRecord();
          positions[id] = { ...before, attempts: Math.max(before.attempts, 1), corrects: Math.max(before.corrects, 1), due: false, intervalStage: before.intervalStage ?? 0, nextReviewAt: before.nextReviewAt ?? reviewAt(0, now) };
        }
        for (const id of stored.missedPositionIds ?? []) {
          const before = positions[id] ?? emptyRecord();
          positions[id] = { ...before, attempts: Math.max(before.attempts, 1), misses: Math.max(before.misses, 1), reviewStreak: 0, due: true, intervalStage: 0, nextReviewAt: now };
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
          if ('intervalStage' in record || 'nextReviewAt' in record) {
            delta.intervalStage = record.intervalStage ?? 0;
            delta.nextReviewAt = record.nextReviewAt ?? null;
          }
          const changed = delta.attempts !== 0 || delta.corrects !== 0 || delta.misses !== 0 || delta.hints !== 0
            || before.reviewStreak !== record.reviewStreak || before.due !== record.due
            || before.intervalStage !== record.intervalStage || before.nextReviewAt !== record.nextReviewAt;
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
            const merged = {
              attempts: before.attempts + entry.attempts,
            corrects: before.corrects + entry.corrects,
            misses: before.misses + entry.misses,
            hints: before.hints + entry.hints,
            reviewStreak: entry.reviewStreak,
              due: entry.due,
            };
            if ('intervalStage' in entry || 'nextReviewAt' in entry || 'intervalStage' in before || 'nextReviewAt' in before) {
              merged.intervalStage = entry.intervalStage ?? before.intervalStage ?? 0;
              merged.nextReviewAt = 'nextReviewAt' in entry ? entry.nextReviewAt ?? null : before.nextReviewAt ?? null;
            }
            positions[id] = merged;
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
        if ((globalThis.__saveFailuresRemaining ?? 0) > 0) {
          globalThis.__saveFailuresRemaining -= 1;
          throw new Error('save failed');
        }
        const stored = migrateProgress(progressByCourse.get(courseId));
        progressByCourse.set(courseId, mergeProgress(stored, delta));
      }
      export async function resetAllProgress(courseIds) {
        courseIds.forEach((courseId) => progressByCourse.delete(courseId));
      }
    `,
  }));
}

export async function expectNoOverflow(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

export async function openDashboard(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await installAppStubs(page);
  await page.goto('/');
  await expect(page.locator('.dashboard-intro')).toBeVisible();
}

export async function startFirstCoursePractice(page: Page, level: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<void> {
  await page.locator('.course-card').first().click();
  await page.locator(`[data-start-level="${level}"]`).click();
  await expect(page.locator('.practice-shell')).toBeVisible();
}

export async function playMove(page: Page, move: string): Promise<void> {
  const from = page.locator(`[data-square="${move.slice(0, 2)}"]`);
  const to = page.locator(`[data-square="${move.slice(2, 4)}"]`);
  await expect(from).toBeVisible();
  await from.click();
  await to.click();
  await expect(page.locator('.board')).toHaveAttribute('aria-busy', 'false');
}

export function lineMoves(level: 'beginner' | 'intermediate' = 'beginner'): string[][] {
  return COURSES[0].lessons[level].variations.map((variation) => variation.positions.map((position) => position.expectedMove));
}

export async function playLineTwice(page: Page, moves: string[]): Promise<void> {
  for (const move of moves) await playMove(page, move);
  for (const move of moves) await playMove(page, move);
}

export async function playLessonClean(page: Page, level: 'beginner' | 'intermediate' = 'beginner'): Promise<void> {
  const [moves] = lineMoves(level);
  if (moves) {
    for (const move of moves.slice(0, -1)) await playMove(page, move);
    await page.getByRole('tab', { name: 'Drill', exact: true }).click();
    await playMove(page, moves.at(-1)!);
    for (const move of moves) await playMove(page, move);
    const lesson = COURSES[0].lessons[level];
    const core = lesson.variations.find((variation) => variation.kind === 'core');
    const branch = core ? firstBranchPoint(lesson, core) : null;
    if (branch) await playMove(page, branch.position.expectedMove);
  }
}

export function wrongLegalMove(expected: string): string {
  if (expected === 'd2d4') return 'e2e4';
  if (expected === 'b1c3') return 'g1f3';
  if (expected === 'c1f4') return 'g1f3';
  return expected === 'e2e3' ? 'e2e4' : 'a2a3';
}

export async function seedProgress(page: Page, courseId: string, progress: unknown): Promise<void> {
  await page.addInitScript(([id, value]) => {
    globalThis.__seedProgress = globalThis.__seedProgress ?? [];
    globalThis.__seedProgress.push([id, value]);
  }, [courseId, progress] as const);
  await page.evaluate(([id, value]) => {
    globalThis.__seedProgress = globalThis.__seedProgress ?? [];
    globalThis.__seedProgress.push([id, value]);
    globalThis.__progressByCourse?.set(id, value);
  }, [courseId, progress] as const);
}
