# Board Tempo Cut and Live Eval Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a learner end the remaining tempo by reaching for the board, shorten the default tempo, and turn the Eval Bar from a single late number into a reading that converges in front of the learner — without changing what is played, scored, or saved.

**Architecture:** Keep the vanilla TypeScript renderer, `LessonRunner`, Firebase persistence, and stylesheet. Push every new decision into a pure function in an existing module (`board-input.ts`, `eval-scale.ts`, `move-settings.ts`) so it can be tested without a DOM, then wire it in `practice.ts`, `browse.ts`, and `board-view.ts`. The board becomes the one part of the screen that renders in place; see `docs/adr/0002-only-the-board-renders-in-place.md`.

**Tech Stack:** TypeScript 5.8, Vite 7, Vitest 3, Playwright 1.55, `chess.js`, Firebase Auth and Firestore, native DOM, Web Workers, Pointer Events, CSS.

**Design:** `docs/superpowers/specs/2026-07-28-board-tempo-and-eval-bar.md`

## Global Constraints

- Add no runtime dependency, router, component framework, state library, or virtual DOM.
- Do not change course content, lesson order, progress schema, Firestore rules, authentication, or navigation.
- Opponent replies stay curated. The engine never chooses a move.
- Preserve the warm neutral palette, terracotta accent, typography, card treatment, and board.
- Preserve dragging, keyboard input, hints, mistake budget, review scheduling, queued saves, and the save-failure path.
- The board must keep reporting `aria-busy="true"` while settling. Three browser helpers (`test/browser/app-stubs.ts`, `test/browser/emulator-matrix.spec.ts`, `test/browser/targeted-ui-repair.spec.ts`) use `aria-busy="false"` to detect the end of a move.
- Use `CONTEXT.md` vocabulary in names, tests, and commits: Tempo Cut, Move Beat, Move Animation, Eval Bar, Provisional Score, Settled Score, Drill Phase.
- Do not commit `browser-timing.log`, `firestore-debug.log`, or `test-results/`.

## File Map

- Modify `src/move-settings.ts`: retuned Move Beat constants.
- Modify `src/engine/eval-scale.ts`: depth-aware info parsing, provisional depth gate, one-decimal labels.
- Modify `src/engine/engine-client.ts`: Provisional Score callback, `warm()`.
- Modify `src/board-input.ts`: the pure Tempo Cut decision.
- Modify `src/board-view.ts`: settling/disabled split, in-place board updater, in-place Eval Bar updater.
- Modify `src/screens/practice.ts`: cancellable sequence, Tempo Cut wiring, persistent board, delegated listeners, streamed bar.
- Modify `src/screens/browse.ts`: warm on entry, streamed bar.
- Modify `src/style.css`: shortened Eval Bar glide.
- Modify `test/guided-move-interactions.test.ts`, `test/eval-scale.test.ts`, `test/engine-client.test.ts`.
- Create `test/browser/tempo-cut.spec.ts`.

## Task Order

Tasks 1 to 3 are independent of the board work and land first because they are self-contained. Task 4 (in-place board) and Task 5 (Tempo Cut) rewrite the same input-handling code and must land in that order.

---

### Task 1: Retune the Move Beats

**Files:**

- Modify: `src/move-settings.ts:7-9`
- Modify: `test/guided-move-interactions.test.ts:132-147`

**Interfaces:**

- Consumes: the stored move duration preference and the teaching flag.
- Produces: unchanged `moveBeats(storedDuration, teaching): MoveBeats`, new durations.

- [ ] **Step 1: Update the beat tests to the agreed durations**

In `describe('move beats', ...)`:

```ts
test('teaching holds the reply longer than recall', () => {
  expect(moveBeats(200, true)).toEqual({ beforeReply: 120, afterReply: 300 });
  expect(moveBeats(200, false)).toEqual({ beforeReply: 120, afterReply: 150 });
});
```

And in the reduced-motion test:

```ts
expect(moveBeats(450, false).beforeReply).toBe(120);
```

Leave the zero-duration test unchanged: a zero preference still means no tempo at all.

- [ ] **Step 2: Run the test and confirm it fails**

```powershell
npx vitest run test/guided-move-interactions.test.ts
```

Expected: FAIL on the two beat assertions.

- [ ] **Step 3: Retune the constants**

In `src/move-settings.ts`:

```ts
export const MOVE_BEAT_BEFORE_REPLY = 120;
export const MOVE_BEAT_AFTER_REPLY = 150;
export const MOVE_BEAT_AFTER_REPLY_TEACHING = 300;
```

- [ ] **Step 4: Run the test and the build**

```powershell
npx vitest run test/guided-move-interactions.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/move-settings.ts test/guided-move-interactions.test.ts
git diff --cached
git commit -m "feat: shorten move beats"
```

---

### Task 2: Publish Provisional Scores from the engine

**Files:**

- Modify: `src/engine/eval-scale.ts:1-18,37-42`
- Modify: `src/engine/engine-client.ts:23-24,52-70,110-126`
- Modify: `test/eval-scale.test.ts:69-80`
- Modify: `test/engine-client.test.ts`

**Interfaces:**

- Consumes: raw UCI `info` lines.
- Produces: `parseInfo(line): { depth: number; score: EvalScore } | null`, `PROVISIONAL_MIN_DEPTH`, `evaluate(fen, learnerColor, onProgress?)`, `warm(): void`.

- [ ] **Step 1: Add failing tests for depth parsing and one-decimal labels**

In `test/eval-scale.test.ts`, import `parseInfo` and `PROVISIONAL_MIN_DEPTH`, then add:

```ts
describe('parseInfo', () => {
  test('reads the search depth alongside the score', () => {
    expect(parseInfo('info depth 12 seldepth 18 score cp -37 nodes 1000 pv e2e4')).toEqual({ depth: 12, score: cp(-37) });
  });

  test('does not mistake seldepth for depth', () => {
    expect(parseInfo('info seldepth 30 depth 9 score cp 12')).toEqual({ depth: 9, score: cp(12) });
  });

  test('returns null when the line carries no score', () => {
    expect(parseInfo('info depth 1 currmove e2e4')).toBeNull();
  });

  test('gates provisional readings above the noisy opening depths', () => {
    expect(PROVISIONAL_MIN_DEPTH).toBeGreaterThanOrEqual(6);
  });
});
```

Update the label test to one decimal:

```ts
test('formats pawns with a sign and one decimal', () => {
  expect(evalLabel(cp(42))).toBe('+0.4');
  expect(evalLabel(cp(-130))).toBe('-1.3');
  expect(evalLabel(cp(0))).toBe('0.0');
});
```

- [ ] **Step 2: Run and confirm failure**

```powershell
npx vitest run test/eval-scale.test.ts
```

Expected: FAIL on the missing exports and the label format.

- [ ] **Step 3: Add depth parsing and shorten the label**

In `src/engine/eval-scale.ts`:

```ts
/** Depths 1-5 swing by half a pawn inside the first 15ms; the bar starts here instead. */
export const PROVISIONAL_MIN_DEPTH = 6;

export type EngineInfo = { depth: number; score: EvalScore };

export function parseInfo(line: string): EngineInfo | null {
  const score = parseScore(line);
  if (!score) return null;
  const depth = /\bdepth (\d+)/.exec(line);
  return depth ? { depth: Number(depth[1]), score } : null;
}
```

The `\b` matters: an `info` line reports `seldepth` too, and a bare `depth (\d+)` can read the wrong number.

Change `evalLabel` to `toFixed(1)`.

- [ ] **Step 4: Add a failing engine client test for streaming**

In `test/engine-client.test.ts`, following the existing fake-worker pattern, add a test that:

- calls `evaluate(START, 'w', onProgress)`,
- completes the handshake,
- feeds one `info depth 3` line and asserts `onProgress` was not called,
- feeds one `info depth 10` line and asserts `onProgress` received that score oriented to the learner,
- feeds `bestmove` and asserts the promise resolves with the last reading.

Add a second test proving a search that never passes the gate still resolves with its final reading, and a third proving a superseded request stops publishing to its callback.

- [ ] **Step 5: Run and confirm failure**

```powershell
npx vitest run test/engine-client.test.ts
```

- [ ] **Step 6: Thread the callback through the client**

Extend the request type:

```ts
type Request = {
  fen: string;
  learnerColor: 'w' | 'b';
  onProgress?: (score: EvalScore) => void;
  resolve: (score: EvalScore | null) => void;
};
```

Widen the signature:

```ts
evaluate(fen: string, learnerColor: 'w' | 'b', onProgress?: (score: EvalScore) => void): Promise<EvalScore | null>
```

Publish inside `receive`, keeping `this.latest` fed by every reading so a slow device still gets a Settled Score:

```ts
if (message.startsWith('info')) {
  const info = parseInfo(message);
  if (!info) return;
  this.latest = info.score;
  const request = this.inFlight;
  if (request?.onProgress && info.depth >= PROVISIONAL_MIN_DEPTH) {
    request.onProgress(orientScore(info.score, request.fen, request.learnerColor));
  }
  return;
}
```

A memo hit and an unavailable engine both resolve without publishing, which is correct: there is nothing to converge towards.

- [ ] **Step 7: Add warming**

```ts
/** Boots the worker ahead of the first position so the bar is not blank on entry. */
warm(): void {
  if (this.state === 'unavailable') return;
  this.ensureWorker();
}
```

`ensureWorker` already handles a failed construction by marking the engine unavailable, so a failed warm needs no separate path.

- [ ] **Step 8: Run the engine tests and the build**

```powershell
npx vitest run test/eval-scale.test.ts test/engine-client.test.ts
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit**

```powershell
git add src/engine test/eval-scale.test.ts test/engine-client.test.ts
git diff --cached
git commit -m "feat: stream provisional scores from the engine"
```

---

### Task 3: Make the Eval Bar converge

**Files:**

- Modify: `src/board-view.ts:69-74`
- Modify: `src/screens/practice.ts:53-56,168-188`
- Modify: `src/screens/browse.ts:38-41,123-139`
- Modify: `src/style.css:423,431,444-446`

**Interfaces:**

- Consumes: a score, the engine status, and whether the learner wants tempo.
- Produces: `updateEvalBar(panel: Element, score: EvalScore | null, status: EngineStatus): void` alongside the existing `renderEvalBar`.

- [ ] **Step 1: Record the current defect**

Open a practice board and watch the bar after a move.

Expected before the change:

```text
the fill jumps straight to its new width with no glide
the value appears once, late, with two decimals
```

- [ ] **Step 2: Add an in-place bar updater**

In `src/board-view.ts`, keep `renderEvalBar` for the initial markup and add a mutator that reuses the existing nodes so the CSS transition has a value to animate from:

```ts
export function updateEvalBar(panel: Element, score: EvalScore | null, status: EngineStatus): void {
  const existing = panel.querySelector('.eval-bar, .eval-note');
  const bar = panel.querySelector<HTMLElement>('.eval-bar');
  if (status === 'unavailable' || !bar) {
    const next = document.createRange().createContextualFragment(renderEvalBar(score, status)).firstElementChild;
    if (!next) return;
    if (existing) existing.replaceWith(next);
    else panel.prepend(next);
    return;
  }
  bar.classList.toggle('is-pending', !score);
  bar.querySelector<HTMLElement>('.eval-fill')?.style.setProperty('--eval-fill', `${((score ? fillFraction(score) : 0.5) * 100).toFixed(1)}%`);
  const value = score ? evalLabel(score) : '--';
  const label = bar.querySelector('.eval-value');
  if (label) label.textContent = value;
  bar.setAttribute('aria-label', value);
}
```

Give `renderEvalBar` the same `aria-label` and a `role="img"` on the `.eval-bar` element so the reading is available to a screen reader without being announced on every change. Do not add `aria-live`.

- [ ] **Step 3: Stream into the bar from practice**

In `src/screens/practice.ts`, replace the `engine.evaluate(...).then(...)` block so Provisional Scores paint as they arrive and only the Settled Score is retained:

```ts
if (settledFen && settledFen !== evalFen) {
  evalFen = settledFen;
  const paint = (score: EvalScore | null) => {
    if (leaving || evalFen !== settledFen) return;
    const panel = app.querySelector('.board-panel');
    if (panel) updateEvalBar(panel, score, engine.status);
  };
  const streaming = moveBeats(moveDuration, false).beforeReply > 0
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  void engine.evaluate(settledFen, selectableColor, streaming ? paint : undefined).then((score) => {
    if (leaving || evalFen !== settledFen) return;
    if (score === null && engine.status !== 'unavailable') return;
    evalScore = score;
    paint(score);
  });
}
```

Streaming is gated on the same two preferences that govern tempo: a zero move duration collapses `moveBeats` to zero, and reduced motion is read from the same media query `playSequence` already uses. A learner with either preference receives one update per position.

`explainCost` keeps calling `evaluate` with no callback: it needs Settled Scores only.

- [ ] **Step 4: Warm the engine on screen entry**

`startPractice` already calls `engine.reset()`. Follow it with `engine.warm()`. Do the same in `renderBrowse` after its `engine.reset()`.

- [ ] **Step 5: Apply the same treatment to the walker**

In `src/screens/browse.ts`, replace the `replaceWith` block in `openWalker` with `updateEvalBar` and pass the streaming callback under the same reduced-motion condition. The walker has no move duration preference, so it gates on reduced motion alone.

- [ ] **Step 6: Shorten the glide**

In `src/style.css`, change both fill transitions from `.25s` to `.12s`:

```css
.eval-fill { position: absolute; inset: 0 auto 0 0; width: var(--eval-fill, 50%); background: #f3f0e8; transition: width .12s ease; }
```

and in the `min-width: 801px` block:

```css
.eval-fill { inset: auto 0 0 0; width: auto; height: var(--eval-fill, 50%); transition: height .12s ease; }
```

Leave the `prefers-reduced-motion` rule that removes the transition entirely.

- [ ] **Step 7: Verify in the browser**

```text
the fill glides rather than jumps
the reading visibly converges over roughly a fifth of a second after a move
values show one decimal
entering practice shows a reading without a visible blank period
Reduce Motion gives exactly one update per position, with no glide
move duration 0 gives exactly one update per position
the walker behaves the same way
```

- [ ] **Step 8: Run tests and build**

```powershell
npx vitest run --exclude test/browser/** --exclude test/auth.test.ts --exclude test/rules.test.ts
npm run build
npx playwright test --project=stubbed
```

Expected: PASS. The stubbed engine in `test/browser/surfaces.spec.ts` resolves requests manually and ignores a third argument, so it needs no change.

- [ ] **Step 9: Commit**

```powershell
git add src/board-view.ts src/screens/practice.ts src/screens/browse.ts src/style.css
git diff --cached
git commit -m "feat: converge the eval bar as the engine searches"
```

---

### Task 4: Render the board in place

**Files:**

- Modify: `src/board-view.ts:42-67`
- Modify: `src/screens/practice.ts:100-368`
- Reference: `docs/adr/0002-only-the-board-renders-in-place.md`

**Interfaces:**

- Consumes: the displayed position, selection, overlays, drag state, settling state, and selectable colour.
- Produces: `renderBoard(state: BoardState): string` for the first paint and `updateBoard(board: Element, state: BoardState): void` for every draw thereafter.

- [ ] **Step 1: Replace the positional parameters with a state object**

`renderBoard` currently takes nine positional arguments and conflates settling with input refusal. Introduce:

```ts
export type BoardState = {
  chess: Chess;
  selected: string | null;
  side: Course['side'];
  guide: SquareRoute | null;
  route: SquareRoute | null;
  animation: BoardAnimation | null;
  dragging: boolean;
  settling: boolean;
  interactive: boolean;
  selectableColor: 'w' | 'b';
};
```

`settling` drives `aria-busy` and nothing else. `interactive` drives the `disabled` attribute. `is-movable` requires `interactive && !settling`, because while settling the painted board and the settled board can disagree about which squares hold learner pieces.

Until Task 5, practice passes `settling: busy` and `interactive: !busy`, which reproduces today's behaviour exactly. Update the `browse.ts` call site to the object form; the walker is never settling and never interactive.

- [ ] **Step 2: Add the in-place board updater**

`updateBoard` walks the existing sixty-four buttons and reconciles them:

- toggle `is-selected` and set `aria-pressed` from `selected`,
- toggle `is-movable`,
- add or remove `disabled` from `interactive`,
- rewrite a square's piece span and `aria-label` only when the piece on it differs from what is rendered,
- toggle `is-dragging` and `aria-busy` on the board element,
- replace the guide overlay, feedback overlay, and animated piece layer, which are cheap and change wholesale.

Track the rendered piece per square with a `data-piece` attribute so the comparison needs no shadow state.

- [ ] **Step 3: Draw the board once and mutate thereafter**

In `practice.ts`, split `draw()`:

- the surrounding screen keeps its `innerHTML` rebuild, but the `.board-frame` is only filled when it is empty or when the board element was destroyed by that rebuild,
- because the rebuild destroys the board, the board must move out of the rebuilt subtree: keep a module-scoped board element created once per practice screen, and re-adopt it into `.board-frame` after each rebuild with `frame.appendChild(boardEl)`,
- call `updateBoard(boardEl, state)` on every draw.

Re-adopting a live element preserves its listeners, its focus, and its animation state across a surrounding rebuild.

- [ ] **Step 4: Delegate the square listeners once**

Bind `pointerdown`, `pointermove`, `pointerup`, `pointercancel`, and `click` to the persistent board element a single time, when it is created. The existing handlers already resolve their target through `closest('[data-square]')`, so the bodies move across unchanged. Remove the `querySelectorAll('[data-square]').forEach(...)` binding loop.

- [ ] **Step 5: Drop the focus-restoration hack**

The focused square button now survives a draw, so remove the `focusedSquare` `requestAnimationFrame` restoration. Keep `focusedSquare` only if a test depends on it; otherwise delete it. Keep the completion focus for `#proceed`, which is outside the board and still rebuilt.

- [ ] **Step 6: Verify no behaviour changed**

```powershell
npx vitest run --exclude test/browser/** --exclude test/auth.test.ts --exclude test/rules.test.ts
npm run build
npx playwright test --project=stubbed
```

Expected: PASS with no spec changes. This task is a pure refactor; any required spec edit is a signal that behaviour drifted.

In the browser, verify:

```text
click-to-move selects and submits
drag-to-move lifts, drops, and submits
keyboard focus stays on a square across selection and deselection with no visible jump
the guide arrow, feedback arrow, and animations are unchanged
aria-busy is "true" while settling and "false" afterwards
```

- [ ] **Step 7: Commit**

```powershell
git add src/board-view.ts src/screens/practice.ts src/screens/browse.ts
git diff --cached
git commit -m "refactor: render the board in place"
```

---

### Task 5: Let the learner cut the tempo

**Files:**

- Modify: `src/board-input.ts`
- Modify: `src/screens/practice.ts:370-416,432-473`
- Modify: `test/guided-move-interactions.test.ts`
- Create: `test/browser/tempo-cut.spec.ts`

**Interfaces:**

- Consumes: whether the board is settling, the piece on the pressed square in the **settled** position, and the learner's colour.
- Produces: `resolveTempoCut(settling: boolean, settledPieceColor: 'w' | 'b' | null, selectableColor: 'w' | 'b'): 'ignore' | 'cut'`.

- [ ] **Step 1: Add failing tests for the cut decision**

In `test/guided-move-interactions.test.ts`:

```ts
describe('tempo cut', () => {
  test('a press on the learner own piece cuts the remaining tempo', () => {
    expect(resolveTempoCut(true, 'w', 'w')).toBe('cut');
  });

  test('a press on an empty square or an opponent piece does not cut', () => {
    expect(resolveTempoCut(true, null, 'w')).toBe('ignore');
    expect(resolveTempoCut(true, 'b', 'w')).toBe('ignore');
  });

  test('there is nothing to cut once the board has settled', () => {
    expect(resolveTempoCut(false, 'w', 'w')).toBe('ignore');
  });
});
```

The captured-ghost case is covered by the caller passing the settled position's piece, which is `null` for a square the reply just emptied — the second test.

- [ ] **Step 2: Run and confirm failure**

```powershell
npx vitest run test/guided-move-interactions.test.ts
```

- [ ] **Step 3: Add the pure decision**

In `src/board-input.ts`:

```ts
/** A press only cuts the tempo when it is a real move intent, judged against the settled position. */
export function resolveTempoCut(settling: boolean, settledPieceColor: 'w' | 'b' | null, selectableColor: 'w' | 'b'): 'ignore' | 'cut' {
  return settling && settledPieceColor === selectableColor ? 'cut' : 'ignore';
}
```

- [ ] **Step 4: Make the sequence cancellable**

`playSequence` currently awaits uncancellable timers and only checks `leaving`. Replace the local `wait` with a cancellable timer that the cut can resolve early, and add a `cut` flag alongside `leaving`:

```ts
let cutRequested = false;
let releaseWait: (() => void) | null = null;

const wait = (milliseconds: number) => new Promise<void>((resolve) => {
  if (cutRequested) { resolve(); return; }
  const timer = window.setTimeout(() => { releaseWait = null; resolve(); }, milliseconds);
  releaseWait = () => { window.clearTimeout(timer); releaseWait = null; resolve(); };
});
```

Check `cutRequested` after every await in `playPhase` and `playSequence`, bailing straight to the settle block that already exists at the end of `playSequence` — the one calling `settleDisplayFen`. That block is the single place the sequence finishes, whether it ran to completion or was cut.

- [ ] **Step 5: Expose the settled position to the input handlers**

`draw()` renders from `animation?.plan.fromFen ?? displayFen ?? position.fen`. Compute the settled position alongside it so a press can be judged against where the board is going, not where it is:

```ts
const settledChess = sequenceActive
  ? new Chess(settleDisplayFen(learnerAfterFen, replyAfterFen, session.snapshot.position?.fen ?? null))
  : displayedChess;
```

Hold the learner and reply `afterFen` for the running sequence in screen scope when `submitAttempt` starts it, so `draw()` can reach them.

- [ ] **Step 6: Cut on press**

In the `pointerdown` handler and the square `click` handler, before the existing `if (busy) return` guard:

```ts
const settledPiece = settledChess.get(square as Parameters<Chess['get']>[0]) ?? null;
if (resolveTempoCut(sequenceActive, settledPiece?.color ?? null, selectableColor) === 'cut') {
  cutRequested = true;
  releaseWait?.();
}
```

The sequence then settles synchronously through its existing tail, after which the press is handled as an ordinary selection against the now-current board. Do not start a drag from a cutting press: require the sequence to have settled before promoting to a drag.

- [ ] **Step 7: Split settling from interactivity**

Pass `settling: sequenceActive` and `interactive: !busy || sequenceActive` into `BoardState`. Squares stay pressable while a sequence runs; `aria-busy` still reports the sequence.

- [ ] **Step 8: Add the browser spec**

Create `test/browser/tempo-cut.spec.ts` using the existing stubbed harness. Cover:

1. pressing a learner piece during a reply settles the board and selects that piece in one press,
2. pressing an empty square during a reply neither settles nor selects,
3. a `teach` move can be cut,
4. a cut move is scored and saved identically to one that ran its full tempo,
5. `aria-busy` reaches `"false"` after a cut.

Set a long move duration in the harness so the sequence window is comfortable to target.

- [ ] **Step 9: Run everything**

```powershell
npx vitest run --exclude test/browser/** --exclude test/auth.test.ts --exclude test/rules.test.ts
npm run build
npx playwright test --project=stubbed
```

Expected: PASS, including the three unchanged `aria-busy` helpers.

- [ ] **Step 10: Commit**

```powershell
git add src/board-input.ts src/screens/practice.ts test/guided-move-interactions.test.ts test/browser/tempo-cut.spec.ts
git diff --cached
git commit -m "feat: let the learner cut the tempo"
```

---

### Task 6: Regression gate

**Files:**

- Verify only: every file in the File Map.

- [ ] **Step 1: Inspect the diff for scope**

```powershell
git status --short
git diff HEAD~5 --stat
```

Verify no logs, `test-results/`, environment files, or unrelated changes were committed.

- [ ] **Step 2: Pure tests, build, and release check**

```powershell
npm test
npm run build
npm run release:check
```

- [ ] **Step 3: Emulator suite**

```powershell
npm run test:emulators
```

- [ ] **Step 4: Full browser matrix**

```powershell
npm run test:browser
```

- [ ] **Step 5: Walk the spec's browser checks**

Work through the fourteen numbered checks in the spec at 1440x1000 and 390x844.

- [ ] **Step 6: Measure the result**

Confirm by observation that a completed `recall` move now returns control in roughly two thirds of the previous time, and that a cut returns control immediately. If a device feels slower than the desktop measurements imply, re-run the depth probe described in the spec's Problem section on that device before adjusting `PROVISIONAL_MIN_DEPTH`.
