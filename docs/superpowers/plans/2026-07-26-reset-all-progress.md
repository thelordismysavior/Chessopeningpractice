# Reset All Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the signed-in learner atomically clear all four courses from Dashboard settings while preserving the device-local move duration.

**Architecture:** Add one Firestore batch-delete function beside the existing progress persistence functions. Extend the existing native settings dialog with an optional Dashboard-only reset section, keeping practice settings unchanged and reloading the Dashboard after a successful reset.

**Tech Stack:** TypeScript, Vite, Firebase Authentication and Firestore, native HTML dialog, CSS, Vitest, Playwright, Firebase Emulator Suite

## Global Constraints

- Follow the approved spec at `.scratch/reset-all-progress/spec.md`.
- Reset all four course-progress documents in one atomic Firestore batch.
- Preserve move duration, authentication, course content, and the progress schema.
- Show reset controls only in Dashboard settings.
- Use an inline confirmation step with **Cancel** and **Reset progress**.
- Keep the dialog open with a retryable `role="alert"` message when reset fails.
- Add no dependency, component framework, service, backup, undo flow, or per-course reset.
- Preserve the existing visual language, focus styles, light and dark dialog themes, and 320 px layout support.
- Never use a ChatGPT 5.6 Terra subagent. Any implementation subagent must use `gpt-5.6-luna` with high effort; any review subagent must use `gpt-5.6-luna` with xhigh effort.

## File Map

- Create `test/progress-reset.test.ts`: verify the reset function builds one batch, deletes every supplied course document, commits once, and rejects signed-out calls.
- Modify `src/progress.ts`: export `resetAllProgress(courseIds: string[]): Promise<void>`.
- Modify `test/rules.test.ts`: verify the approved owner can delete their own progress and cannot delete another user's progress.
- Modify `test/browser/targeted-ui-repair.spec.ts`: extend the existing progress stub and verify confirmation, focus, success, failure, Dashboard-only visibility, and move-duration preservation.
- Modify `src/main.ts`: render and bind the optional reset controls, call the batch-delete function from the Dashboard, and reload progress on success.
- Modify `src/style.css`: style the separated destructive section and its light/dark/error states.
- Modify `test/browser/emulator-matrix.spec.ts`: verify the real Firebase path resets saved progress and preserves the device preference.

---

### Task 1: Atomic Progress Reset

**Files:**
- Create: `test/progress-reset.test.ts`
- Modify: `src/progress.ts:1-41`
- Modify: `test/rules.test.ts:1-35`

**Interfaces:**
- Consumes: `auth.currentUser`, `db`, Firestore `doc()` and `writeBatch()`.
- Produces: `resetAllProgress(courseIds: string[]): Promise<void>`.

- [ ] **Step 1: Write the failing unit test**

Create `test/progress-reset.test.ts`:

```ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  commit: vi.fn<() => Promise<void>>(),
  delete: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../src/firebase', () => ({ auth: mocks.auth, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: mocks.writeBatch,
}));

import { resetAllProgress } from '../src/progress';

describe('reset all progress', () => {
  beforeEach(() => {
    mocks.auth.currentUser = { uid: 'owner' };
    mocks.commit.mockReset().mockResolvedValue();
    mocks.delete.mockReset();
    mocks.writeBatch.mockReset().mockReturnValue({ delete: mocks.delete, commit: mocks.commit });
  });

  test('deletes every course in one committed batch', async () => {
    await resetAllProgress(['london', 'caro-kann']);

    expect(mocks.writeBatch).toHaveBeenCalledOnce();
    expect(mocks.delete.mock.calls).toEqual([
      ['users/owner/courses/london'],
      ['users/owner/courses/caro-kann'],
    ]);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  test('requires a signed-in learner', async () => {
    mocks.auth.currentUser = null;

    await expect(resetAllProgress(['london'])).rejects.toThrow('Sign in before resetting progress.');
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run:

```powershell
npx vitest run test/progress-reset.test.ts
```

Expected: FAIL because `resetAllProgress` is not exported by `src/progress.ts`.

- [ ] **Step 3: Implement the minimal batch-delete function**

In `src/progress.ts`, add `writeBatch` to the Firestore import:

```ts
import { doc, getDoc, runTransaction, writeBatch } from 'firebase/firestore';
```

Append:

```ts
export async function resetAllProgress(courseIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before resetting progress.');
  const batch = writeBatch(db);
  courseIds.forEach((courseId) => batch.delete(doc(db, 'users', user.uid, 'courses', courseId)));
  await batch.commit();
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run:

```powershell
npx vitest run test/progress-reset.test.ts
```

Expected: 2 tests PASS.

- [ ] **Step 5: Add deletion coverage to the Firestore rules test**

In `test/rules.test.ts`, add `deleteDoc` to the Firestore import:

```ts
import { deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
```

Add this test inside `describe('progress rules', ...)`:

```ts
test('owner deletes only their own progress', async () => {
  const owner = env.authenticatedContext('owner').firestore();
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/owner/courses/london'), { complete: true });
    await setDoc(doc(context.firestore(), 'users/other/courses/london'), { complete: true });
  });

  await assertSucceeds(deleteDoc(doc(owner, 'users/owner/courses/london')));
  await assertFails(deleteDoc(doc(owner, 'users/other/courses/london')));
});
```

- [ ] **Step 6: Run the persistence and rules checks**

Run:

```powershell
npx vitest run test/progress-reset.test.ts
npx firebase emulators:exec --only firestore "vitest run test/rules.test.ts"
bun run build
```

Expected: both Vitest commands PASS and the TypeScript/Vite build succeeds.

- [ ] **Step 7: Commit the persistence change**

```powershell
git add -- src/progress.ts test/progress-reset.test.ts test/rules.test.ts
git commit -m "feat: add atomic progress reset"
```

---

### Task 2: Dashboard Reset Controls

**Files:**
- Modify: `test/browser/targeted-ui-repair.spec.ts:1-128`
- Modify: `src/main.ts:9-48,94-135,287`
- Modify: `src/style.css:140-156`

**Interfaces:**
- Consumes: `resetAllProgress(courseIds: string[]): Promise<void>` from Task 1 and `COURSES`.
- Produces: `settingsDialogMarkup(duration: number, includeProgressReset?: boolean): string` and `bindSettings(onChange, resetProgress?)`.

- [ ] **Step 1: Extend the browser stub and write failing UI tests**

In the stub body in `installAppStubs()`, expose the map and add the reset export:

```js
globalThis.__progressByCourse = progressByCourse;
export async function resetAllProgress(courseIds) {
  if (globalThis.__failProgressReset) throw new Error('reset failed');
  courseIds.forEach((courseId) => progressByCourse.delete(courseId));
}
```

Add these tests to `test/browser/targeted-ui-repair.spec.ts`:

```ts
test('Dashboard settings confirm reset and preserve move duration', async ({ page }) => {
  await openDashboard(page);
  await page.evaluate((courseIds) => {
    const state = globalThis as typeof globalThis & { __progressByCourse: Map<string, object> };
    courseIds.forEach((courseId) => state.__progressByCourse.set(courseId, {
        completedLevels: ['beginner'],
        unlockedLevel: 1,
        attempts: 4,
        missedPositionIds: [],
        completedPositionIds: [],
        completedVariationIds: [],
        reviewHistory: [],
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
    state.__progressByCourse.set(courseId, { completedLevels: ['beginner'], unlockedLevel: 1 });
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
```

- [ ] **Step 2: Run the focused browser tests to verify they fail**

Run:

```powershell
npx playwright test test/browser/targeted-ui-repair.spec.ts --grep "reset"
```

Expected: FAIL because the settings dialog has no reset controls.

- [ ] **Step 3: Add optional reset markup**

In `src/main.ts`, import the reset function:

```ts
import { loadProgress, resetAllProgress, saveProgress, type CourseProgress } from './progress';
```

Replace `settingsDialogMarkup()` with:

```ts
function settingsDialogMarkup(duration: number, includeProgressReset = false): string {
  const reset = includeProgressReset
    ? `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course and start again from Beginner. Move duration stays unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" hidden><p>This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`
    : '';
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="settings-form"><p class="eyebrow">Device preference</p><h2 id="settings-title">Settings</h2><label for="move-duration">Move duration (ms)</label><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><p class="settings-help">Used for learner moves, opponent replies, captures, and castling.</p>${reset}<button value="close">Done</button></form></dialog>`;
}
```

- [ ] **Step 4: Bind confirmation, failure, focus, and retry behavior**

Change the `bindSettings` signature:

```ts
function bindSettings(onChange: (duration: number) => void, resetProgress?: () => Promise<void>): void {
```

After binding the move-duration `change` event, add:

```ts
  const showReset = app.querySelector<HTMLButtonElement>('#show-reset-progress');
  const confirmation = app.querySelector<HTMLElement>('#reset-progress-confirmation');
  const cancelReset = app.querySelector<HTMLButtonElement>('#cancel-reset-progress');
  const confirmReset = app.querySelector<HTMLButtonElement>('#confirm-reset-progress');
  const resetError = app.querySelector<HTMLElement>('#reset-progress-error');
  if (!resetProgress || !showReset || !confirmation || !cancelReset || !confirmReset || !resetError) return;

  showReset.addEventListener('click', () => {
    showReset.hidden = true;
    confirmation.hidden = false;
    confirmReset.focus();
  });
  cancelReset.addEventListener('click', () => {
    confirmation.hidden = true;
    showReset.hidden = false;
    resetError.hidden = true;
    showReset.focus();
  });
  confirmReset.addEventListener('click', async () => {
    cancelReset.disabled = true;
    confirmReset.disabled = true;
    resetError.hidden = true;
    try {
      await resetProgress();
      dialog.close();
      await renderDashboard(signedInEmail);
    } catch {
      resetError.hidden = false;
      cancelReset.disabled = false;
      confirmReset.disabled = false;
      confirmReset.focus();
    }
  });
```

Enable reset only in `renderDashboard()`:

```ts
${settingsDialogMarkup(loadMoveDuration(), true)}
```

Bind the approved course list:

```ts
bindSettings(
  () => undefined,
  () => resetAllProgress(COURSES.map((course) => course.id)),
);
```

Leave the practice call unchanged:

```ts
${settingsDialogMarkup(moveDuration)}
```

- [ ] **Step 5: Style the existing dialog states**

Add near the existing settings rules in `src/style.css`:

```css
.reset-progress { display: grid; gap: .65rem; margin-top: .5rem; padding-top: 1rem; border-top: 1px solid #cfc9bd; }
.reset-progress h3, .reset-progress p { margin: 0; }
.reset-progress h3 { font-size: .9rem; }
.reset-progress p { color: #657078; font-size: .78rem; }
.reset-confirmation { display: grid; gap: .65rem; }
.reset-confirmation[hidden], #show-reset-progress[hidden], #reset-progress-error[hidden] { display: none; }
.settings-actions { display: flex; flex-wrap: wrap; gap: .5rem; }
.settings-form .danger-button { background: #a4473e; color: #fbf7ef; }
.settings-form .settings-actions .quiet-button { background: transparent; color: #657078; }
#reset-progress-error { color: #a4473e; font-weight: 700; }
```

Extend the existing dark-mode block:

```css
.reset-progress { border-color: #49565e; }
.reset-progress p { color: #aeb7b9; }
.settings-form .settings-actions .quiet-button { color: #d8d1c4; }
#reset-progress-error { color: #e09a91; }
```

- [ ] **Step 6: Run the focused UI checks**

Run:

```powershell
npx playwright test test/browser/targeted-ui-repair.spec.ts --grep "reset"
bun run build
```

Expected: both reset tests PASS and the build succeeds.

- [ ] **Step 7: Commit the Dashboard UI**

```powershell
git add -- src/main.ts src/style.css test/browser/targeted-ui-repair.spec.ts
git commit -m "feat: reset progress from Dashboard settings"
```

---

### Task 3: Real Firebase Journey and Release Verification

**Files:**
- Modify: `test/browser/emulator-matrix.spec.ts:1-120`

**Interfaces:**
- Consumes: the Dashboard reset flow and real `resetAllProgress()` from Tasks 1 and 2.
- Produces: emulator-backed regression coverage for saved progress and device-preference preservation.

- [ ] **Step 1: Write the failing emulator journey**

Add to `test/browser/emulator-matrix.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the real Firebase journey**

Run:

```powershell
bun run test:browser -- --grep "Dashboard reset"
```

Expected: PASS against the Auth and Firestore emulators.

- [ ] **Step 3: Run the complete verification suite**

Run:

```powershell
bun run test:emulators
bun run build
bun run test:browser
bun run release:check
git diff --check
git status --short
```

Expected:

- Unit tests PASS.
- Build and release checks PASS.
- All Playwright emulator and stubbed journeys PASS.
- `git diff --check` prints no errors.
- `git status --short` lists only the implementation-plan file if it has not already been committed.

- [ ] **Step 4: Commit the emulator coverage**

```powershell
git add -- test/browser/emulator-matrix.spec.ts docs/superpowers/plans/2026-07-26-reset-all-progress.md
git commit -m "test: verify progress reset journey"
```
