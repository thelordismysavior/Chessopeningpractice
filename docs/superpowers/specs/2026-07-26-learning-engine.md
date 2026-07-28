# Learning Engine

Status: approved-design

## Context

This is the first of two sub-projects that improve the app's UI/UX flow. It covers the drill
rules and the progress data model: the part with real logic, real tests, and output that every
screen depends on.

The second sub-project ("surfaces") covers the dashboard redesign with line-level progress and
overall mastery, the cross-course review queue screen, the browse/study page, and the evaluation
bar backed by a Stockfish WASM worker. A third, separate project expands course content with
additional variations and lines.

Ordering matters: the surfaces project displays this project's data, so the data must be
trustworthy first. The evaluation bar also supplies the real reason a move is wrong, which this
project deliberately does not attempt.

One constraint carries forward. `release-readiness.test.ts` scans every file under `src/` and
`src-tauri/` and asserts the source never matches
`/fetch\s*\(|xmlhttprequest|pgn|offline|course.?editor|apk/i`. Nothing in this project trips that
guard, but the surfaces project must load its Stockfish asset without a literal `fetch(` call or
adjust the guard deliberately.

## Problem

Three defects in the current learning model make progress meaningless and practice too easy.

**Progress can only grow.** `applySessionProgress` and the Firestore transaction in `saveProgress`
both union their arrays, and nothing ever removes an id. Once a position enters
`missedPositionIds` it stays there permanently, so answering it correctly in a review does not
clear it and the "Review N positions" link can only count up. `reviewHistory` is written but never
read. No honest accuracy figure, review queue, or mastery number can be built on this.

**A lesson never tests recall.** `shouldShowMoveGuide` returns `true` for every position of a
normal lesson, so the arrow pointing at the correct move is always on during a first pass. A
lesson is a guided trace, not a test. Only review mode withholds the answer.

**One mistake costs the whole line.** A single wrong move anywhere sets `cleanRun` false, and the
line will not bank until the learner replays it flawlessly from move 1.

Two structural problems in the code make these hard to fix in place. `PracticeSession` holds one
flat `positions` array spanning all variations and converts between a `positionIndex` and a
`variationCursor` with `variationStartIndex()` arithmetic. It also branches on `if (this.isReview)`
in nearly every method, because lesson mode and review mode share one object.

## Goals

- Keep the vanilla TypeScript architecture, Firebase progress model, course content, and visual
  identity.
- Teach a line with guidance, then immediately test recall of the same line without it.
- Forgive one mistake per pass and require a replay at two.
- Offer an on-demand hint that costs review rather than budget.
- Let a position leave the review queue after two correct reviews.
- Define a mastery figure that reflects both banking and outstanding review.
- Show a summary at lesson end.
- Preserve existing progress through a read-time migration.

## Out of Scope

- The dashboard redesign, the browse/study page, and the cross-course review queue screen.
- The evaluation bar and any Stockfish or engine integration.
- Any change to course content, lesson order, or the number of variations per lesson.
- Restructuring `main.ts` beyond the practice screen.
- A new router, state-management layer, component framework, or design system.
- Changes to authentication or Firestore rules.
- Replaying an already-banked line, free-explore mode, stepping backward mid-drill, and skipping
  the level lock. These were considered and declined.
- Streak or practice-history tracking.

## Architecture

Modules stay flat in `src/`, matching the existing layout. `practice-session.ts` is replaced.

### `line-drill.ts`

Exports `LineDrill`, which owns one run through a set of positions. It takes a position list and a
config of `{ teachPass: boolean, mistakeBudget?: number }` rather than hard-coding a variation. A
lesson line uses `teachPass: true`; a review uses `teachPass: false` and does not bank. This
parameterisation is what removes the `isReview` branching: a review is not a mode, it is a
differently configured drill.

`mistakeBudget` is the mistake count that triggers a replay, so the agreed rule is
`mistakeBudget: 2`: one mistake is forgiven and the second forces the replay. A review passes no
budget, because reviews do not bank and never replay.

The drill owns its own position cursor, phase, mistake count, and hint state. It exposes a
snapshot, `submitMove`, `requestHint`, and a restart used when the budget is exhausted.

### `lesson-runner.ts`

Exports `LessonRunner`, which holds the ordered drills for a lesson, decides which line is next
given the already-banked lines, applies the banking decision, and accumulates the session summary.
Because cursors live inside each drill, `variationStartIndex()` and the flat-array index
arithmetic are deleted.

### `review-schedule.ts`

Pure. Given a position's existing record and the outcome of an attempt, returns the updated
record. Also answers which positions are currently due.

### `mastery.ts`

Pure. Given progress and the course list, returns the per-course and overall mastery figures.

### Modified

- `guide-policy.ts` keeps its role but takes the drill phase instead of a review flag.
- `progress.ts` gains the new schema, the read-time migration, and a write path that can
  decrement.
- `progress-state.ts` is removed. Its merge responsibility splits between `LessonRunner` and
  `review-schedule.ts`.
- `main.ts` changes only where it drives the session and renders the practice screen.

## Drill Rules

Today's lesson behaviour is the teach pass. The recall pass is what is being added.

### Teach pass

The learner plays each move of the line with the guide arrow shown, exactly as a lesson behaves
today. A wrong move is rejected and retried, but does not touch the mistake budget, does not
increment `misses` or `corrects`, and does not queue the position for review. Teach-pass moves do
count toward the position's `attempts`, which is a raw effort counter rather than a scoring input.
Accuracy is `corrects / (corrects + misses)`, so it is computed only from scored passes and the
teach pass cannot flatter or damage it.

The hint button is absent during the teach pass, because the arrow is already shown.

### Recall pass

Immediately after the teach pass, the same line restarts from move 1 with no arrows. A wrong move
enters the existing retry state, where the arrow is shown so the learner can see the answer, and
the position is replayed until correct. Each position answered wrongly costs one mistake,
regardless of how many wrong attempts were made on it.

### Mistake budget

Mistakes are counted per pass and evaluated when the learner reaches the end of the line, not at
the moment the second one occurs. Finishing with zero or one mistake banks the line. Finishing
with two or more restarts the recall pass from move 1 with a fresh budget. The teach pass does not
repeat.

End-of-line evaluation was chosen over interrupting mid-line because returning the board to move 1
mid-mistake is jarring, and because it matches where `needs-clean-run` is evaluated today, keeping
the change contained.

### Hint

A "Show me" button is available on any recall position. It reveals the guide arrow, does not spend
a mistake, and queues that position for review.

### Review queueing

Every position missed during a recall pass queues for review, including the one forgiven mistake.
Forgiveness governs whether the line banks, not whether the position returns.

### Reviews

A review is a drill over the due positions with no teach pass, no mistake budget, no replay, and
no banking. Each position is answered until correct, and the first attempt on each position decides
the outcome that updates its streak: correct on the first attempt counts as a correct review,
anything else counts as a miss. The hint button is available and, as in a recall pass, marks the
position as needing more work rather than spending budget.

### Opponent pacing

Replies keep the existing configurable duration and gain a short settle beat after the piece lands
before input re-enables, so a reply cannot be missed while the learner is already moving. The
teach pass uses a longer beat than the recall pass.

### Line transitions

When a line banks, the board resets to the next line's opening position and a transition state
names both the line just banked and the line starting, holding briefly before input resumes. There
is no button. The earlier targeted-ui-repair spec deliberately ruled out a Proceed step between
variations and that decision stands; the fix is legibility, not an extra click.

## Data Model

### Schema

The three parallel string arrays collapse into one map keyed by position id.

```ts
type PositionRecord = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
};

type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  positions: Record<string, PositionRecord>;
  practiceMs: number;
};
```

The counters have two different granularities and tests depend on the distinction. `attempts`
counts submitted moves, so a position fumbled three times before being solved records three
attempts. `misses` and `corrects` count *positions*, incremented once each time a position is
finished in a scored pass, according to whether it was recalled cleanly. That position fumbled
three times records one miss, not three.

"Cleanly" means solved on the first attempt without a hint. A hinted position therefore counts as a
miss and also increments `hints`. This is deliberately not the same as the mistake budget, which
counts only wrong moves, so a hint costs accuracy and queues a review without pushing the line
toward a replay.

`due` is stored explicitly rather than derived so the queue is readable directly from the document.
`missedPositionIds`, `completedPositionIds`, and `reviewHistory` are removed. The course-level
`attempts` total is also removed and derived by summing the position records instead, so there is
one source of truth rather than two counters that can drift apart. Around 50 positions per course
at six small numbers each stays far below the Firestore document limit and remains safe as content
grows.

### Migration

Documents are already merged over `emptyProgress()`, so conversion happens at read time. Each id in
a legacy `completedPositionIds` becomes a record with one attempt and one correct. Each id in a
legacy `missedPositionIds` becomes a record that is `due` with a zero `reviewStreak`. An id in both
is `due`. The legacy fields are dropped on the next write. `completedLevels`, `unlockedLevel`, and
`completedVariationIds` carry over unchanged.

The legacy course-level `attempts` total is discarded rather than carried over, because attempts
were never recorded per position and cannot be redistributed. The derived total therefore restarts
from the reconstructed records and will understate historical effort. This affects a display
counter only, never unlocking, banking, or review state.

The existing reset feature remains the escape hatch if a document cannot be interpreted.

### Write path

`saveProgress` remains a Firestore transaction, but the union merge is replaced:

- The four per-position counters (`attempts`, `corrects`, `misses`, `hints`) accumulate as deltas
  within each record, and `practiceMs` accumulates at the course level.
- `completedVariationIds` continues to union, because banking is monotonic.
- `reviewStreak` and `due` are taken from the session, which holds the authoritative latest
  outcome.

The session therefore reports deltas rather than absolute totals, generalising the pattern the
existing `attemptsDelta` argument already uses to every counter.

### Review scheduling

- During a recall pass, a miss or a hint sets `due` and zeroes `reviewStreak`. The teach pass never
  queues a position.
- During a review, a correct answer increments `reviewStreak`; reaching 2 clears `due` and resets
  the streak to 0.
- During a review, a miss or a hint zeroes `reviewStreak` and the position stays `due`.

Two correct reviews clear a position; one slip restarts the count.

### Mastery

A line is mastered when its id is in `completedVariationIds` and none of its positions are `due`.
Overall mastery is mastered lines divided by total lines, computed from `COURSES` so it rescales
automatically when the content project adds variations. The same function returns the per-course
figure.

### Session summary

At lesson end `LessonRunner` returns the lines banked, the positions missed with their originating
line, the number of hints used, the elapsed time, and mastery before and after.

Elapsed time is wall-clock from session start to completion. There is no idle detection.

## Practice Screen

- The header eyebrow includes the current phase alongside the existing line and move counters.
- A "Show me" button appears in the existing actions row during the recall pass only.
- The mistake budget renders as a two-slot indicator rather than a number in prose, so the learner
  knows before the final move whether the pass will bank.
- Wrong-move feedback restates the plan from the position's authored `explanation` alongside the
  expected move, replacing the bare `Expected: Nf3`.
- The line transition uses the named handoff state described above.

All of this reuses the existing feedback region, polite live region, and button treatments. No new
visual language is introduced.

## Lesson Completion

The completion state becomes a summary panel in place of the current single completion message,
listing lines banked, positions missed with their line, hints used, elapsed time, and the mastery
change.

The existing Proceed button keeps its current routing: Beginner to Intermediate, Intermediate to
Advanced, Advanced to the dashboard. A secondary action starts a review immediately when positions
are due.

## Error Handling

Current save behaviour is preserved. A failed save keeps the learner on the completion screen with
the existing Retry Save action, and Proceed waits for the pending save before navigating.

Delta-based writes introduce a hazard that union-based writes did not have: a retried save could
double-count. The session tracks last-saved totals and computes each delta against them, advancing
that watermark only after a commit succeeds. A retry recomputes an identical delta and remains
idempotent. This extends what the existing `savedAttempts` variable already does for the attempt
counter.

Malformed or partial documents keep the current tolerant behaviour: unknown fields are ignored and
missing fields are defaulted.

## Verification

### Automated checks

New Vitest coverage:

- `LineDrill`: teach-to-recall handoff, teach-pass mistakes counting toward `attempts` but not
  `misses` or the budget, the budget of two forcing a replay, one mistake still banking, hint
  queueing without spending budget.
- `LineDrill` configured as a review: no teach pass, no replay after repeated mistakes, and the
  first attempt on a position deciding its outcome.
- `LessonRunner`: line sequencing, skipping already-banked lines, summary contents.
- `review-schedule.ts`: two corrects clear a position, a miss resets the streak, recall misses and
  hints queue, teach-pass misses do not.
- `mastery.ts`: a banked line with a due position is not mastered.
- Read-time migration from a legacy document, including that a position in both legacy arrays ends
  up `due`.
- A repeated save applies its delta exactly once.

Existing tests:

- `practice-session.test.ts` and `progress-state.test.ts` are replaced.
- `guided-move-interactions.test.ts` is updated for the phase-aware guide policy.
- `course-content.test.ts` and `progress-reset.test.ts` pass unchanged.
- `release-readiness.test.ts` passes unchanged, which requires the new modules to avoid the token
  guard described in Context.

Also run the production TypeScript and Vite build, the pure Vitest suite, and the Firebase Auth and
Firestore emulator suite.

### Browser checks

In Chromium at 1440x1000 and 390x844:

1. A lesson line runs a teach pass with arrows, then a recall pass without them.
2. The phase is visible in the header during both passes.
3. "Show me" appears only during recall, reveals the arrow, and does not spend budget.
4. One mistake still banks the line.
5. Two mistakes restart the recall pass from move 1 without repeating the teach pass.
6. Banking a line names the handoff and resets the board to the next line's opening position.
7. The next line's first move is immediately playable.
8. Lesson completion shows the summary panel with banked lines, missed positions, hints, time, and
   the mastery change.
9. The review action appears only when positions are due.
10. A review clears a position after two correct answers and not after one.
11. A simulated save failure leaves the summary visible with Retry Save, and retrying does not
    double-count.
12. Proceed routes as before.

## Expected Files

New:

- `src/line-drill.ts`
- `src/lesson-runner.ts`
- `src/review-schedule.ts`
- `src/mastery.ts`

Modified:

- `src/progress.ts` for the schema, migration, and delta write path.
- `src/guide-policy.ts` for phase awareness.
- `src/main.ts` for session wiring, the practice screen, and the summary panel.
- `src/style.css` for the budget indicator, hint button, transition state, and summary panel.

Removed:

- `src/practice-session.ts`
- `src/progress-state.ts`
