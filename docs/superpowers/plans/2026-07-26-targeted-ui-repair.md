# Targeted UI Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair stale boards between practice lines, restore pointer clicks, and provide a visible Proceed flow into newly unlocked lessons while preserving the current app design.

**Architecture:** Keep the existing vanilla TypeScript renderer, `PracticeSession`, Firebase persistence, and stylesheet. Add one pure FEN-settlement helper to the existing transition module, then make minimal changes in `main.ts` and `style.css`. Do not introduce a router, UI framework, state library, or runtime dependency.

**Tech Stack:** TypeScript 5.8, Vite 7, Vitest 3, `chess.js`, Firebase Auth and Firestore, native DOM and Pointer Events, CSS.

## Global Constraints

- Preserve the existing warm neutral palette, terracotta accent, typography, card treatment, and chess board.
- Show Proceed only after the entire lesson is complete.
- Beginner proceeds to Intermediate, Intermediate proceeds to Advanced, and Advanced proceeds to the dashboard.
- Do not add a Proceed step between variations.
- Preserve dragging, keyboard input, progress, retries, reviews, move animation, reduced motion, and queued saves.
- Do not change course content, lesson order, URLs, navigation labels, authentication, Firestore rules, or the progress schema.
- Add no runtime dependency, router, component framework, state library, or DOM test environment.
- Preserve all unrelated working-tree changes. In particular, do not stage or revert the existing `app.appendChild(liftEl)` change in `src/main.ts`.
- Stage only plan-owned hunks from `src/main.ts` and inspect `git diff --cached` before every commit.

## File Map

- Modify `src/transition-plans.ts`: choose the stable FEN after a learner move, optional opponent reply, or variation boundary.
- Modify `test/guided-move-interactions.test.ts`: protect the variation-boundary FEN decision.
- Modify `src/main.ts`: consume the settlement helper, delay pointer capture until dragging, reset scroll on screen changes, render completion state, and route Proceed.
- Modify `src/style.css`: style Proceed, compact mobile controls and footers, and quiet the move guide.
- No production file is created.

---

### Task 1: Settle the board on the next practice line

**Files:**

- Modify: `src/transition-plans.ts:63-71`
- Modify: `test/guided-move-interactions.test.ts:11,59-85`
- Modify: `src/main.ts:13,411-426`

**Interfaces:**

- Consumes: learner move `afterFen`, optional opponent reply `afterFen`, and optional next snapshot position `fen`.
- Produces: `settleDisplayFen(learnerAfterFen: string, replyAfterFen: string | null, nextPositionFen: string | null): string`.

- [ ] **Step 1: Add the failing transition regression**

Update the transition import:

```ts
import { planFenTransition, planMoveTransition, settleDisplayFen } from '../src/transition-plans';
```

Add this test inside `describe('move transition plans', ...)`:

```ts
test('settles on the next line start when no reply joins the positions', () => {
  const learner = lesson.variations[0].positions.at(-1)!;
  const nextLine = lesson.variations[1].positions[0];
  const learnerPlan = planMoveTransition(learner.fen, learner.expectedMove)!;
  const reply = planFenTransition(learnerPlan.afterFen, nextLine.fen);

  expect(reply).toBeNull();
  expect(settleDisplayFen(learnerPlan.afterFen, reply?.afterFen ?? null, nextLine.fen)).toBe(nextLine.fen);
  expect(settleDisplayFen(learnerPlan.afterFen, null, null)).toBe(learnerPlan.afterFen);
});
```

- [ ] **Step 2: Run the test and confirm the missing export**

Run:

```powershell
npx vitest run test/guided-move-interactions.test.ts
```

Expected: FAIL because `settleDisplayFen` is not exported.

- [ ] **Step 3: Add the minimum pure settlement helper**

Append to `src/transition-plans.ts`:

```ts
export function settleDisplayFen(learnerAfterFen: string, replyAfterFen: string | null, nextPositionFen: string | null): string {
  return replyAfterFen ?? nextPositionFen ?? learnerAfterFen;
}
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
npx vitest run test/guided-move-interactions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Use the helper after every completed move sequence**

Update the import in `src/main.ts`:

```ts
import { planFenTransition, planMoveTransition, settleDisplayFen, type MoveTransition } from './transition-plans';
```

Replace the final `displayFen` assignment in `playSequence`:

```ts
displayFen = settleDisplayFen(
  learnerPlan.afterFen,
  replyPlan?.afterFen ?? null,
  session.snapshot.position?.fen ?? null,
);
```

This keeps normal opponent replies unchanged, selects the next variation's starting FEN at a line boundary, and keeps the learner's final FEN when the lesson is complete.

- [ ] **Step 6: Run focused tests and the production build**

Run:

```powershell
npx vitest run test/guided-move-interactions.test.ts test/practice-session.test.ts
npm run build
```

Expected: both test files and the build pass.

- [ ] **Step 7: Commit only plan-owned hunks**

```powershell
git add src/transition-plans.ts test/guided-move-interactions.test.ts
git add -p src/main.ts
git diff --cached -- src/main.ts
git commit -m "fix: settle board on next practice line"
```

When staging `src/main.ts`, include only the import and `displayFen` changes. Exclude the pre-existing drag-lift parent change.

---

### Task 2: Restore click input and reset only top-level screen scroll

**Files:**

- Modify: `src/main.ts:20-25,46-88,219-326`
- Test: existing `test/guided-move-interactions.test.ts`

**Interfaces:**

- Consumes: existing pointer threshold and screen render functions.
- Produces: normal square clicks that reach button handlers, captured pointer movement only after drag promotion, and `resetPageScroll(): void`.

- [ ] **Step 1: Record the failing browser behavior**

Start the app and open a practice board in Chromium. Press and release `d2` without crossing the drag threshold.

Expected before the fix:

```text
d2 aria-pressed remains "false"
keyboard Enter on d2 changes aria-pressed to "true"
```

Also navigate from a scrolled dashboard into practice.

Expected before the fix:

```text
window.scrollY remains above 0
```

- [ ] **Step 2: Add one screen-transition scroll helper**

Add after `signedInEmail`:

```ts
function resetPageScroll(): void {
  window.scrollTo(0, 0);
}
```

Call `resetPageScroll()` once at the start of:

```ts
renderSignedOut
renderAuthError
renderSources
renderDashboard
startPractice
```

Do not call it from `draw()`.

- [ ] **Step 3: Capture the pointer only after drag promotion**

Remove this line from the `pointerdown` handler:

```ts
board.setPointerCapture(event.pointerId);
```

In `pointermove`, add it after the origin square and piece are validated:

```ts
if (!originButton || !boardPiece) return;
board.setPointerCapture(event.pointerId);
pointerMoved = true;
```

Keep the existing capture release in `finishPointer`.

- [ ] **Step 4: Run the existing input tests**

Run:

```powershell
npx vitest run test/guided-move-interactions.test.ts
```

Expected: PASS.

- [ ] **Step 5: Repeat the browser checks**

Verify:

```text
click d2 -> d2 aria-pressed is "true"
click d4 -> the move submits
drag d2 to d4 -> the lift appears and the move submits
dashboard to practice -> window.scrollY is 0
selecting or moving a piece inside practice -> scroll is not reset
```

- [ ] **Step 6: Commit only plan-owned hunks**

```powershell
git add -p src/main.ts
git diff --cached -- src/main.ts
git commit -m "fix: restore board clicks and screen scroll"
```

Exclude the pre-existing drag-lift parent change from the staged diff.

---

### Task 3: Add the final lesson Proceed flow

**Files:**

- Modify: `src/main.ts:219-278,411-477`
- Modify: `src/style.css:20,80-88`
- Test: existing `test/practice-session.test.ts`

**Interfaces:**

- Consumes: `LEVELS`, `levelNames`, `pendingSave`, `liveProgress`, `saveError`, `startPractice`, and `renderDashboard`.
- Produces: one focused `#proceed` action after lesson completion and `proceedAfterLesson(): Promise<void>`.

- [ ] **Step 1: Confirm session completion and unlock behavior remains green**

Run:

```powershell
npx vitest run test/practice-session.test.ts test/progress-state.test.ts
```

Expected: PASS, including all-three-variations completion and sequential unlocking.

- [ ] **Step 2: Derive the next lesson once per practice screen**

After `selectableColor` in `startPractice`, add:

```ts
const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
```

- [ ] **Step 3: Render completion only after the final animation**

Inside `draw()`, after reading `snapshot`, add:

```ts
const lessonComplete = snapshot.lessonComplete && !sequenceActive;
const completionMessage = nextLevel
  ? `${levelNames[level]} complete. ${levelNames[nextLevel]} unlocked.`
  : `${levelNames[level]} complete. Course complete.`;
```

Build the feedback markup before the page template:

```ts
const feedbackMarkup = lessonComplete
  ? `<div class="feedback feedback-complete" role="status" aria-live="polite"><strong>${completionMessage}</strong></div>`
  : feedback
    ? `<div class="feedback feedback-${feedback.kind}"><strong>${escapeHtml(feedback.message)}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${escapeHtml(feedback.expectedSan)}</span>` : ''}</div>`
    : `<p class="move-hint">Select a ${course.side} piece, then select its destination.</p>`;
```

Build the full action markup so completion does not retain a duplicate Exit Lesson action:

```ts
const actionMarkup = snapshot.status === 'needs-clean-run'
  ? '<button id="restart-run">Replay this line</button><button id="exit-practice" class="quiet-button">Exit lesson</button>'
  : lessonComplete
    ? '<button id="proceed">Proceed</button>'
    : snapshot.status === 'complete'
      ? '<button id="back-after-complete">Back to dashboard</button>'
      : '<button id="exit-practice" class="quiet-button">Exit lesson</button>';
```

Use `${feedbackMarkup}` and `${actionMarkup}` in the practice template.

- [ ] **Step 4: Focus Proceed after completion**

Replace the current square-focus restoration with:

```ts
if (lessonComplete) {
  window.requestAnimationFrame(() => app.querySelector<HTMLButtonElement>('#proceed')?.focus());
} else if (focusedSquare && !busy) {
  window.requestAnimationFrame(() => app.querySelector<HTMLButtonElement>(`[data-square="${focusedSquare}"]`)?.focus());
}
```

Make the Exit Lesson binding optional because it is absent on completion:

```ts
document.querySelector('#exit-practice')?.addEventListener('click', () => void leavePractice());
```

Bind Proceed:

```ts
document.querySelector('#proceed')?.addEventListener('click', () => void proceedAfterLesson());
```

- [ ] **Step 5: Wait for saving, then open the correct destination**

Add beside `leavePractice`:

```ts
const proceedAfterLesson = async () => {
  if (leaving) return;
  leaving = true;
  const button = app.querySelector<HTMLButtonElement>('#proceed');
  if (button) {
    button.disabled = true;
    button.textContent = 'Saving...';
  }
  try {
    await pendingSave;
    if (nextLevel) await startPractice(course, nextLevel, liveProgress);
    else await renderDashboard(signedInEmail);
  } catch {
    leaving = false;
    saveError = true;
    draw();
  }
};
```

The first click disables the action, a failed save redraws the completion state with Retry Save, and successful saves pass updated progress into the unlocked lesson.

- [ ] **Step 6: Give Proceed the existing primary treatment**

Extend the primary button selector:

```css
.auth-page button, .error-page button, #restart-run, #proceed, #back-after-complete {
  margin-top: 1.5rem;
  padding: .9rem 1.15rem;
  border-radius: 999px;
  background: #b05b34;
  color: white;
  font-weight: 750;
}

#proceed:disabled {
  cursor: wait;
  opacity: .7;
}
```

- [ ] **Step 7: Run session tests and build**

Run:

```powershell
npx vitest run test/practice-session.test.ts test/progress-state.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 8: Verify completion in the browser**

With move duration set to `0`, drag through all three Beginner variations.

Verify:

```text
line 1 completion -> line 2 starts immediately, no Proceed
line 2 completion -> line 3 starts immediately, no Proceed
line 3 completion -> completion message and Proceed appear
Proceed receives focus and is visible on mobile
Proceed displays "Saving..." while pending
Proceed opens Intermediate after the save
Advanced completion Proceed returns to the dashboard
review completion still offers Back to dashboard
stopping the Firestore emulator before the final move leaves completion visible with Retry Save
```

- [ ] **Step 9: Commit only plan-owned hunks**

```powershell
git add src/style.css
git add -p src/main.ts
git diff --cached
git commit -m "feat: proceed to unlocked lesson"
```

Exclude the pre-existing drag-lift parent change from the staged diff.

---

### Task 4: Repair narrow-screen wrapping and quiet the move guide

**Files:**

- Modify: `src/style.css:24-30,46-67,87,127-131,173-182`

**Interfaces:**

- Consumes: existing `.topbar`, `.account`, `.practice-meta`, `.course-count`, `.course-footer`, `.practice-actions`, and `.guide-overlay` classes.
- Produces: single-line controls and counts, stacked narrow footers, wrapping action safety, and a quieter guide arrow.

- [ ] **Step 1: Record current narrow-screen defects**

At `390x844`, capture the dashboard and practice screen.

Expected before the change:

```text
Sign out can wrap
00 / 03 can wrap
card footer content crowds one row
practice actions have no wrap fallback
guide arrow is visually heavier than the pieces need
```

- [ ] **Step 2: Prevent control and count wrapping**

Add:

```css
.quiet-button, .back-button, .course-count { white-space: nowrap; }
.course-count { flex: 0 0 auto; }
.practice-actions { flex-wrap: wrap; }
```

- [ ] **Step 3: Reduce the guide's visual weight**

Replace the guide rule with:

```css
.guide-overlay .route-arrow {
  height: 6px;
  background: #5f8664;
  opacity: .78;
}
```

Do not change the red feedback route.

- [ ] **Step 4: Compact the mobile topbar and stack card footers**

Inside `@media (max-width: 520px)`, add:

```css
.topbar { gap: .35rem; }
.account, .practice-meta { gap: .25rem; }
.quiet-button, .back-button { padding-inline: .4rem; }
.practice-meta .side-tag { margin-bottom: 0; }
.course-footer { align-items: flex-start; flex-direction: column; }
.review-links { justify-content: flex-start; }
```

- [ ] **Step 5: Verify desktop and mobile layout**

At `1440x1000`, verify the dashboard remains two columns and the practice board remains aligned with the lesson copy.

At `390x844`, verify:

```text
topbar controls stay on one line
course counts stay on one line
card footer content does not collide
practice actions wrap if needed
no horizontal document overflow
guide remains directional and sits below pieces
```

- [ ] **Step 6: Run the build**

Run:

```powershell
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/style.css
git diff --cached
git commit -m "fix: compact mobile practice UI"
```

---

### Task 5: Run the complete regression gate

**Files:**

- Verify only: `src/main.ts`, `src/style.css`, `src/transition-plans.ts`
- Verify only: `test/guided-move-interactions.test.ts`

**Interfaces:**

- Consumes: the completed implementation from Tasks 1-4.
- Produces: build, test, emulator, and browser evidence ready for handoff.

- [ ] **Step 1: Inspect the final diff for scope**

Run:

```powershell
git status --short
git diff HEAD~4 -- src/main.ts src/style.css src/transition-plans.ts test/guided-move-interactions.test.ts
```

Verify no unrelated deletions, generated logs, environment files, or the pre-existing drag-lift parent change were included in implementation commits.

- [ ] **Step 2: Run pure tests**

Run:

```powershell
npx vitest run --exclude test/rules.test.ts --exclude test/auth.test.ts
```

Expected: all pure tests pass.

- [ ] **Step 3: Run the production build**

Run:

```powershell
npm run build
```

Expected: TypeScript passes and Vite creates `dist`.

- [ ] **Step 4: Run Firebase integration tests**

Run:

```powershell
npm run test:emulators
```

Expected: Auth, Firestore rules, and all other tests pass under the emulators.

- [ ] **Step 5: Run the final Chromium matrix**

Use the Auth and Firestore emulators with a provider account matching `VITE_APPROVED_EMAIL`. Seed `config/access.approvedUid` with that emulator account's UID, then verify at `1440x1000` and `390x844`:

```text
click-to-move works
drag-to-move works
line boundaries reset the board
no Proceed exists between lines
lesson completion is announced
Proceed waits for saving
Beginner opens Intermediate
Intermediate opens Advanced
Advanced returns to dashboard
save failure remains recoverable
completion focus is visible on mobile
topbars, counts, footers, and actions do not overflow
the guide is quieter than feedback
```

For the save-failure check, stop the Firestore emulator immediately before the final move, complete the move, and confirm the rejected write redraws the same completion screen with Retry Save instead of navigating.

- [ ] **Step 6: Confirm the working tree preserves user changes**

Run:

```powershell
git status --short
```

Expected: the user's pre-existing deletions, log files, and unstaged `src/main.ts` drag-lift change remain untouched unless the user separately asks to include them.
