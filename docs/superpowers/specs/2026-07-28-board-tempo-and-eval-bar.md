# Board Tempo Cut and a Live Eval Bar

Status: approved-design

## Problem

A learner drilling a line they already know waits about 900 milliseconds between their own move and
being allowed to play the next one, and roughly 1100 milliseconds in `teach`. The wait is not the
engine: opponent replies come from the curated line through `planFenTransition`, and both engine
calls in practice (`renderEvalBar` and `explainCost`) run in a worker without blocking the sequence.
The wait is the Move Animation plus two Move Beats, and it is fixed regardless of whether the
learner still needs it.

The board also refuses input for that entire window. `renderBoard` receives `busy` and stamps
`disabled` on all sixty-four buttons, so a learner reaching for their next move mid-sequence has the
press discarded and has to press again. The tempo cannot be declined.

Separately, every click rebuilds the whole practice screen through one `app.innerHTML` assignment —
topbar, lesson copy, feedback, sixty-four squares, overlays, settings dialog — and rebinds every
listener. Selecting a piece to see a highlight pays for a full teardown, which is why the board does
not feel alive under a finger on a phone.

The Eval Bar has four defects of its own:

- It never animates. `.eval-fill` declares `transition: width .25s ease`, but every update discards
  the element and inserts a new one, first through the `innerHTML` rebuild and then through
  `existing.replaceWith(next)`. A freshly inserted element paints at its final width, so the
  transition has never once fired and the bar teleports.
- It reveals one number at the end of a search. The client keeps only the last `info` line in
  `this.latest` and throws away every deepening reading Stockfish streams on the way there.
- Its search budget is half wasted. Measured against the vendored build, depths 1 through 18 all
  arrive within 152ms of `go`, and the remaining half of the 300ms budget buys exactly one more
  depth. Doubling the budget to 600ms buys depth 20 and moves the reading by 0.02 to 0.05 pawns.
- The first position of a session shows `--` while the worker boots, because the worker is created
  lazily inside the first `evaluate` call.

The bar is also unlabelled: the track is `aria-hidden` and the value is a bare number with nothing
naming what it measures.

## Goals

- Let a learner end the remaining Move Animation and Move Beats by reaching for the board.
- Shorten the default tempo so the wait is smaller even when the learner does not cut it.
- Keep the board responsive to presses while a sequence is still settling.
- Make a press land in one action: cut the tempo and select the piece.
- Stream the engine's deepening readings onto the Eval Bar so it converges rather than teleports.
- Hide the noisy shallow depths, which swing by half a pawn inside the first 15ms.
- Remove the cold-start blank by warming the worker on screen entry.
- Stop rebuilding the sixty-four squares on every click.
- Preserve the existing vanilla TypeScript architecture, Firebase progress model, content, and
  visual identity.

## Out of Scope

- A component framework, virtual DOM, router, state library, or new runtime dependency.
- Premoves, or any input buffering that survives past the settled position.
- Engine-generated opponent replies. Replies remain curated content.
- Multi-threaded or WASM-SIMD engine builds, `MultiPV`, or a principal-variation display.
- Incremental rendering of anything outside the board: the lesson copy, feedback panel, mistake
  budget, action buttons, and settings dialog keep their string rebuild.
- Changes to course content, progress schema, Firestore rules, authentication, or navigation.

## Behavior and State Flow

### Tempo Cut

While a sequence is settling, a press on a square holding one of the learner's own pieces performs
a Tempo Cut: the remaining Move Animation and Move Beats are abandoned, the position settles at
once through the existing `settleDisplayFen`, and the same press is then handled as an ordinary
selection.

Which piece sits on the pressed square is judged against the **settled** position, not the position
currently painted. During a reply the board still shows the pre-reply pieces, so a reply that
captures a learner piece leaves a ghost on screen. Pressing that ghost cuts the tempo and selects
nothing, rather than selecting a piece that no longer exists.

A press on an empty square, on an opponent piece, or outside the board is ignored and does not cut.
Keyboard activation of a square behaves exactly as a press does.

A Tempo Cut is available in every Drill Phase, including `teach`. The longer teaching beat remains
an offer of time, not an imposition.

Cutting does not change what was played, what was scored, or what is saved. It only ends the wait.

### Board input during settling

`renderBoard` stops using one flag for two ideas. Settling and input refusal separate:

- The board keeps `aria-busy="true"` for as long as it is settling, so the three browser helpers
  that wait on `aria-busy="false"` continue to mark the end of a move.
- The square buttons lose their `disabled` attribute during settling, because a disabled button
  emits no pointer events and there would be nothing to cut with.
- The `is-movable` affordance is suppressed while settling. The painted board and the settled board
  can disagree about which squares hold learner pieces, and a hover hint that contradicts what a
  press will do is worse than no hint.

Dragging is not started during settling. A press cuts and selects; the learner may then drag
normally, because by that point the sequence is over.

### Tempo

| Pause | Before | After |
| --- | --- | --- |
| Before the reply | 250ms | 120ms |
| After the reply (`recall`, `review`) | 250ms | 150ms |
| After the reply (`teach`) | 450ms | 300ms |
| Move Animation default | 200ms | 200ms |

A completed `recall` move falls from about 900ms to about 670ms, or about 470ms when the learner
dragged, since dragging already skips the learner's own animation. A `teach` move falls from about
1100ms to about 820ms.

A stored move duration of zero continues to mean no tempo at all, suppressing both animation and
beats, and a reduced-motion preference continues to suppress animation while leaving the beats.

### Eval Bar

The bar shows Provisional Scores as the search deepens and rests on the Settled Score.

- Provisional Scores are published from depth 6 onward. Depth 6 arrives about 17ms after `go` on
  the measured build, so the gate has a wide margin on slower hardware, and the depth 1 to 5
  readings that swing from +0.07 to +0.47 and back inside 15ms stay hidden.
- The search budget stays at `go movetime 300`.
- The Settled Score is the only reading memoised, the only one that survives a revisit of the
  position, and the only one `explainCost` measures a mistake against.
- If the search ends without any reading having passed the depth gate, the Settled Score is still
  published. On hardware too slow to reach depth 6 the bar degrades to today's single update rather
  than showing nothing.

The fill and the value mutate in place instead of being replaced, which is what allows the CSS
transition to run at all. The glide shortens from 250ms to 120ms, because between depth 6 and depth
18 the bar receives roughly a dozen updates about 10ms apart and a 250ms glide would spend the whole
stream chasing values it never reaches.

Values render with one decimal instead of two. The second decimal only flickers during a stream.

A learner on reduced motion, or with the move duration slider at zero, receives no Provisional
Scores at all — the bar updates once per position with the Settled Score. Suppressing the glide
without suppressing the stream would replace one smooth change with a dozen hard ones, which is the
opposite of what those preferences ask for.

The worker warms on entering Practice or Browse, before the first position is evaluated, rather
than on the first `evaluate` call. Warming is fire-and-forget: a failed warm marks the engine
unavailable exactly as a failed evaluation does today, and practice continues.

`ENGINE_STARTUP_MS` remains a failure timeout. Measured boot is 240 to 540ms; the 3000ms value is
not a typical cost and does not change.

All Eval Bar behaviour applies equally to the Browse walker, which renders the same component.

### Accessibility

The bar carries a static label of the signed number alone — positive meaning the learner stands
better, since the reading is already oriented to the learner by `orientScore`. It is not a live
region: announcing a dozen Provisional Scores per move would make the screen unusable.

`Engine unavailable` continues to render in place of the bar when the worker has failed.

### Board rendering

The sixty-four square buttons are built once per position and mutated thereafter. Selection,
deselection, drag state, guide and feedback overlays, and the settling state change classes and
attributes on the existing buttons. The squares are rebuilt only when the pieces on them change.

Event listeners move to the persistent board element and delegate, so they are bound once rather
than rebound on every draw. The `requestAnimationFrame` focus restoration for `focusedSquare` is no
longer needed, because the focused button survives the draw.

Everything outside the board keeps its `innerHTML` rebuild. See ADR 0002.

## Error Handling

- A Tempo Cut during a save leaves the save queue untouched; `persist` is already fired before the
  sequence starts and is not awaited by it.
- A Tempo Cut while leaving the screen is ignored, as the existing `leaving` guard already ignores
  animation callbacks.
- An engine failure mid-stream resolves the request with no Settled Score and marks the engine
  unavailable, exactly as today. Provisional Scores already painted are left on the bar until the
  bar is replaced by the unavailable note.
- A superseded request still resolves null, and its Provisional Scores stop being published the
  moment it is superseded, so a stale search cannot paint over a newer position.

## Verification

### Automated checks

- Add pure tests for the Tempo Cut decision: settling plus a learner piece cuts, settling plus an
  empty square does not, settling plus an opponent piece does not, and a piece captured by the
  reply does not select.
- Add pure tests for the depth gate: readings below the threshold are withheld, readings at and
  above it are published, and a search that never reaches the threshold still publishes its final
  reading.
- Update the beat tests in `test/guided-move-interactions.test.ts` to the new constants.
- Update the `evalLabel` tests in `test/eval-scale.test.ts` to one decimal.
- Add an engine client test proving Provisional Scores reach the progress callback while only the
  Settled Score is memoised.
- Keep the three `aria-busy` browser helpers passing unchanged.
- Run the production build, the pure Vitest suite, and the emulator suite.

### Browser checks

Verify in Chromium at 1440x1000 and 390x844:

1. Pressing a learner piece during the reply animation settles the board immediately and selects
   that piece in one press.
2. Pressing an empty square during the reply animation does nothing and does not cut.
3. A `teach` move can be cut as readily as a `recall` move.
4. A line where the reply captures a learner piece cannot have that piece selected by a cut.
5. Letting the tempo run to completion behaves exactly as before, at the shortened durations.
6. The board reports `aria-busy="true"` while settling and `aria-busy="false"` afterwards.
7. Keyboard focus on a square survives selection and deselection without a visible jump.
8. The Eval Bar glides between values rather than jumping, and visibly converges after a move.
9. The bar shows one decimal.
10. With Reduce Motion enabled, the bar updates once per position and does not glide.
11. With the move duration slider at zero, the bar updates once per position.
12. The first position of a session shows a reading without a visible blank period.
13. The Browse walker shows the same converging, gliding bar.
14. Stopping the engine asset produces `Engine unavailable` on both screens.

## Expected Files

- `src/move-settings.ts` for the retuned beat constants.
- `src/board-input.ts` for the pure Tempo Cut decision.
- `src/board-view.ts` for the settling/disabled split and an in-place board and bar updater.
- `src/engine/engine-client.ts` for the progress callback, the depth gate, and `warm()`.
- `src/engine/eval-scale.ts` for depth parsing and one-decimal labels.
- `src/screens/practice.ts` for the Tempo Cut, the cancellable sequence, and the persistent board.
- `src/screens/browse.ts` for warming and the in-place bar.
- `src/style.css` for the shortened glide.
- `test/guided-move-interactions.test.ts`, `test/eval-scale.test.ts`, `test/engine-client.test.ts`,
  and one browser spec for the Tempo Cut.
