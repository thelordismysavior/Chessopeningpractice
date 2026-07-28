import { expect, type Page } from '@playwright/test';
import { COURSES } from '../../src/courses';

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
}

export type AuthStubOptions = {
  initialUser?: { email: string; uid?: string } | null;
  signInCode?: string;
  signInDelayMs?: number;
  signUpCode?: string;
  signUpUid?: string;
  resetCode?: string;
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
        return { user: { email: 'test@example.com', uid: state.__authOptions.signUpUid ?? 'pending-owner' } };
      };
      export const sendReset = async () => {
        state.__authCalls.sendReset += 1;
        if (state.__authOptions.resetCode) fail(state.__authOptions.resetCode);
      };
      export const signOutUser = async () => {
        state.__authCalls.signOut += 1;
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

export async function openDashboard(page: Page, width: number, height: number): Promise<void> {
  await page.setViewportSize({ width, height });
  await installAppStubs(page);
  await page.goto('/');
  await expect(page.locator('.dashboard-intro')).toBeVisible();
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
  for (const moves of lineMoves(level)) await playLineTwice(page, moves);
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
