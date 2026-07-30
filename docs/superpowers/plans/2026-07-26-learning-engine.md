# Learning Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current practice session with a teach-then-recall drill loop and a progress model that can clear review items, so accuracy, review, and mastery become meaningful.

**Architecture:** `PracticeSession` is replaced by a `LineDrill` (one run through one set of positions, owning its own phase, cursor, mistake budget, and hint state) and a `LessonRunner` (sequences drills, banks lines, evolves progress records, produces the summary). Review stops being a mode and becomes a differently configured `LineDrill`. Progress moves from three parallel string arrays to a per-position record map, and the Firestore write path moves from union-merge to delta-merge so a review can clear a position.

**Tech Stack:** TypeScript 5.8, Vite 7, vanilla DOM (no framework), `chess.js` 1.4, Firebase 12.16 (Auth + Firestore), Vitest 3.2, Playwright 1.55.

**Spec:** `docs/superpowers/specs/2026-07-26-learning-engine.md`

## Global Constraints

- Vanilla TypeScript only. No new runtime dependencies, no framework, no router, no state-management library, no DOM testing library.
- Modules stay flat in `src/`. Do not create subdirectories.
- No source file under `src/` or `src-tauri/` may contain text matching `/fetch\s*\(|xmlhttprequest|pgn|offline|course.?editor|apk/i`. `test/release-readiness.test.ts` enforces this by scanning every `.css`, `.json`, `.rs`, and `.ts` file.
- Course content in `src/courses.ts` must not change. `test/course-content.test.ts` must keep passing untouched.
- No changes to `firestore.rules`, authentication, or the `users/{uid}/courses/{courseId}` document path.
- `mistakeBudget` is `2`: the first mistake is forgiven, the second forces a replay. `REVIEW_CLEAR_STREAK` is `2`.
- "Cleanly" always means solved on the first attempt with no hint used. A hint counts as a miss for statistics but never spends mistake budget.
- The real test gate is `bun run test:emulators`. Plain `bun run test` cannot pass, because `test/auth.test.ts` and `test/rules.test.ts` require the Firebase emulators. Verified baseline on branch `learning-engine`: 10 files, 43 tests, 0 failures.
- Preserve existing behaviour not named in this plan: drag-and-drop, click-to-move, keyboard input, reduced-motion handling, scroll reset between screens, the settings dialog, and progress reset.
- Commit after every task using the message given in that task's final step.

---

### Task 1: Review scheduling

**Files:**
- Create: `src/review-schedule.ts`
- Test: `test/review-schedule.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PositionRecord`, `PositionOutcome`, `OutcomeContext`, `REVIEW_CLEAR_STREAK`, `emptyRecord()`, `applyOutcome(record, outcome, context)`, `duePositionIds(positions, candidateIds)`. Every later task uses `PositionRecord` and `emptyRecord`.

This is the scoring rulebook. It is pure: no chess, no Firestore, no DOM.

- [ ] **Step 1: Write the failing test**

Create `test/review-schedule.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  applyOutcome,
  duePositionIds,
  emptyRecord,
  type PositionOutcome,
  type PositionRecord,
} from '../src/review-schedule';

const clean: PositionOutcome = { attempts: 1, solvedFirstTry: true, hinted: false };
const fumbled: PositionOutcome = { attempts: 3, solvedFirstTry: false, hinted: false };
const hinted: PositionOutcome = { attempts: 1, solvedFirstTry: true, hinted: true };

describe('teach pass', () => {
  test('counts effort but never scores or queues', () => {
    const record = applyOutcome(emptyRecord(), fumbled, 'teach');
    expect(record).toEqual({ attempts: 3, corrects: 0, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('counts a teach-pass hint as effort only', () => {
    const record = applyOutcome(emptyRecord(), hinted, 'teach');
    expect(record.hints).toBe(0);
    expect(record.due).toBe(false);
  });
});

describe('recall pass', () => {
  test('a clean position scores a correct and stays out of the queue', () => {
    const record = applyOutcome(emptyRecord(), clean, 'recall');
    expect(record).toEqual({ attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('a fumbled position scores a miss and queues for review', () => {
    const record = applyOutcome(emptyRecord(), fumbled, 'recall');
    expect(record).toMatchObject({ attempts: 3, corrects: 0, misses: 1, due: true, reviewStreak: 0 });
  });

  test('a hinted position counts as a miss and queues, and records the hint', () => {
    const record = applyOutcome(emptyRecord(), hinted, 'recall');
    expect(record).toMatchObject({ corrects: 0, misses: 1, hints: 1, due: true });
  });

  test('zeroes an existing review streak when the position is missed again', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    expect(applyOutcome(start, fumbled, 'recall').reviewStreak).toBe(0);
  });
});

describe('review', () => {
  test('needs two clean answers to clear, not one', () => {
    const start: PositionRecord = { ...emptyRecord(), due: true };
    const once = applyOutcome(start, clean, 'review');
    expect(once).toMatchObject({ reviewStreak: 1, due: true });

    const twice = applyOutcome(once, clean, 'review');
    expect(twice).toMatchObject({ reviewStreak: 0, due: false, corrects: 2 });
  });

  test('a miss restarts the count and keeps the position due', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    const record = applyOutcome(start, fumbled, 'review');
    expect(record).toMatchObject({ reviewStreak: 0, due: true, misses: 1 });
  });

  test('a hint restarts the count and keeps the position due', () => {
    const start: PositionRecord = { ...emptyRecord(), reviewStreak: 1, due: true };
    const record = applyOutcome(start, hinted, 'review');
    expect(record).toMatchObject({ reviewStreak: 0, due: true, hints: 1 });
  });
});

describe('due query', () => {
  test('returns only due candidates, in candidate order', () => {
    const positions = {
      a: { ...emptyRecord(), due: true },
      b: emptyRecord(),
      c: { ...emptyRecord(), due: true },
    };
    expect(duePositionIds(positions, ['c', 'b', 'a', 'missing'])).toEqual(['c', 'a']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/review-schedule.test.ts`
Expected: FAIL — `Failed to resolve import "../src/review-schedule"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/review-schedule.ts`:

```ts
export type PositionRecord = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
};

/** One finished position within a single pass. `attempts` counts submitted moves. */
export type PositionOutcome = {
  attempts: number;
  solvedFirstTry: boolean;
  hinted: boolean;
};

export type OutcomeContext = 'teach' | 'recall' | 'review';

export const REVIEW_CLEAR_STREAK = 2;

export const emptyRecord = (): PositionRecord => ({
  attempts: 0,
  corrects: 0,
  misses: 0,
  hints: 0,
  reviewStreak: 0,
  due: false,
});

export function applyOutcome(record: PositionRecord, outcome: PositionOutcome, context: OutcomeContext): PositionRecord {
  const next: PositionRecord = { ...record, attempts: record.attempts + outcome.attempts };
  if (context === 'teach') return next;

  const recalled = outcome.solvedFirstTry && !outcome.hinted;
  if (recalled) next.corrects += 1;
  else next.misses += 1;
  if (outcome.hinted) next.hints += 1;

  if (context === 'recall') {
    if (!recalled) {
      next.due = true;
      next.reviewStreak = 0;
    }
    return next;
  }

  if (!recalled) {
    next.reviewStreak = 0;
    return next;
  }
  const streak = next.reviewStreak + 1;
  if (streak >= REVIEW_CLEAR_STREAK) {
    next.reviewStreak = 0;
    next.due = false;
  } else {
    next.reviewStreak = streak;
  }
  return next;
}

export function duePositionIds(positions: Record<string, PositionRecord>, candidateIds: string[]): string[] {
  return candidateIds.filter((id) => positions[id]?.due);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/review-schedule.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add src/review-schedule.ts test/review-schedule.test.ts
git commit -m "feat: add review scheduling rules"
```

---

### Task 2: Progress schema, migration, and delta writes

**Files:**
- Modify: `src/progress.ts` (rewrite `CourseProgress`, `emptyProgress`, `loadProgress`, `saveProgress`; keep `resetAllProgress` unchanged)
- Test: `test/progress-store.test.ts`

**Interfaces:**
- Consumes: `PositionRecord`, `emptyRecord` from Task 1.
- Produces: the new `CourseProgress`, `PositionDelta`, `ProgressDelta`, `migrateProgress(raw)`, `diffProgress(saved, current)`, `mergeProgress(stored, delta)`, `loadProgress(courseId)`, `saveProgress(courseId, delta)`. Tasks 3, 6, and 7 depend on these names.

`diffProgress` and `mergeProgress` are pure and exported specifically so the retry-idempotence rule can be tested without Firestore. `saveProgress` changes signature: it now takes a delta, not a whole progress object plus an attempts number.

- [ ] **Step 1: Write the failing test**

Create `test/progress-store.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { emptyRecord } from '../src/review-schedule';
import {
  diffProgress,
  emptyProgress,
  mergeProgress,
  migrateProgress,
  type CourseProgress,
} from '../src/progress';

describe('migration from the legacy schema', () => {
  test('turns legacy id arrays into position records', () => {
    const migrated = migrateProgress({
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      attempts: 40,
      completedPositionIds: ['beginner-main-1', 'beginner-main-2'],
      missedPositionIds: ['beginner-main-2'],
      completedVariationIds: ['beginner-main'],
      reviewHistory: ['beginner-main-1'],
    });

    expect(migrated.completedLevels).toEqual(['beginner']);
    expect(migrated.unlockedLevel).toBe(1);
    expect(migrated.completedVariationIds).toEqual(['beginner-main']);
    expect(migrated.positions['beginner-main-1']).toMatchObject({ corrects: 1, due: false });
    expect(migrated.positions['beginner-main-2']).toMatchObject({ misses: 1, due: true, reviewStreak: 0 });
    expect(migrated).not.toHaveProperty('attempts');
    expect(migrated).not.toHaveProperty('reviewHistory');
  });

  test('passes an already-migrated document through unchanged', () => {
    const current: CourseProgress = {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: [],
      positions: { 'beginner-main-1': { ...emptyRecord(), attempts: 5, corrects: 2 } },
      practiceMs: 1200,
    };
    expect(migrateProgress(current)).toEqual(current);
  });

  test('returns empty progress for a missing document', () => {
    expect(migrateProgress(undefined)).toEqual(emptyProgress());
  });
});

describe('delta computation', () => {
  const saved: CourseProgress = {
    completedLevels: [],
    unlockedLevel: 0,
    completedVariationIds: [],
    positions: { p1: { ...emptyRecord(), attempts: 2, corrects: 1 } },
    practiceMs: 1000,
  };
  const current: CourseProgress = {
    completedLevels: ['beginner'],
    unlockedLevel: 1,
    completedVariationIds: ['beginner-main'],
    positions: {
      p1: { ...emptyRecord(), attempts: 5, corrects: 1, misses: 1, due: true },
      p2: { ...emptyRecord(), attempts: 1, corrects: 1 },
    },
    practiceMs: 4000,
  };

  test('reports counters as differences and review state as absolutes', () => {
    const delta = diffProgress(saved, current);
    expect(delta.practiceMs).toBe(3000);
    expect(delta.positions.p1).toEqual({ attempts: 3, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true });
    expect(delta.positions.p2).toEqual({ attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false });
  });

  test('omits positions that did not change', () => {
    expect(diffProgress(current, current).positions).toEqual({});
  });

  test('applying the same delta twice from an unchanged store yields the same result', () => {
    const stored = saved;
    const delta = diffProgress(saved, current);
    const first = mergeProgress(stored, delta);
    const retried = mergeProgress(stored, diffProgress(saved, current));
    expect(retried).toEqual(first);
    expect(first.positions.p1.attempts).toBe(5);
  });
});

describe('merge', () => {
  test('accumulates counters, unions banked lines, and overwrites review state', () => {
    const stored: CourseProgress = {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: ['beginner-main'],
      positions: { p1: { ...emptyRecord(), attempts: 2, misses: 1, reviewStreak: 1, due: true } },
      practiceMs: 500,
    };
    const merged = mergeProgress(stored, {
      completedLevels: ['beginner'],
      unlockedLevel: 1,
      completedVariationIds: ['beginner-main', 'beginner-alternative'],
      practiceMs: 250,
      positions: { p1: { attempts: 1, corrects: 1, misses: 0, hints: 0, reviewStreak: 0, due: false } },
    });

    expect(merged.completedLevels).toEqual(['beginner']);
    expect(merged.unlockedLevel).toBe(1);
    expect(merged.completedVariationIds).toEqual(['beginner-main', 'beginner-alternative']);
    expect(merged.practiceMs).toBe(750);
    expect(merged.positions.p1).toEqual({ attempts: 3, corrects: 1, misses: 1, hints: 0, reviewStreak: 0, due: false });
  });

  test('never lowers the unlocked level', () => {
    const stored = { ...emptyProgress(), unlockedLevel: 2 };
    const merged = mergeProgress(stored, {
      completedLevels: [],
      unlockedLevel: 0,
      completedVariationIds: [],
      practiceMs: 0,
      positions: {},
    });
    expect(merged.unlockedLevel).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/progress-store.test.ts`
Expected: FAIL — `migrateProgress` / `diffProgress` / `mergeProgress` are not exported from `../src/progress`.

- [ ] **Step 3: Write minimal implementation**

Rewrite `src/progress.ts`. Keep the existing imports and `resetAllProgress` exactly as they are; replace everything else:

```ts
import { doc, getDoc, runTransaction, writeBatch } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { LevelKey } from './courses';
import { emptyRecord, type PositionRecord } from './review-schedule';

export type CourseProgress = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  positions: Record<string, PositionRecord>;
  practiceMs: number;
};

/** Counters are differences; `reviewStreak` and `due` are absolute latest values. */
export type PositionDelta = {
  attempts: number;
  corrects: number;
  misses: number;
  hints: number;
  reviewStreak: number;
  due: boolean;
};

export type ProgressDelta = {
  completedLevels: LevelKey[];
  unlockedLevel: number;
  completedVariationIds: string[];
  practiceMs: number;
  positions: Record<string, PositionDelta>;
};

type StoredProgress = Partial<CourseProgress> & {
  completedPositionIds?: string[];
  missedPositionIds?: string[];
};

export const emptyProgress = (): CourseProgress => ({
  completedLevels: [],
  unlockedLevel: 0,
  completedVariationIds: [],
  positions: {},
  practiceMs: 0,
});

export function migrateProgress(stored: StoredProgress | undefined): CourseProgress {
  if (!stored) return emptyProgress();
  const positions: Record<string, PositionRecord> = { ...(stored.positions ?? {}) };

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
}

export function diffProgress(saved: CourseProgress, current: CourseProgress): ProgressDelta {
  const positions: Record<string, PositionDelta> = {};
  for (const [id, record] of Object.entries(current.positions)) {
    const before = saved.positions[id] ?? emptyRecord();
    const delta: PositionDelta = {
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

export function mergeProgress(stored: CourseProgress, delta: ProgressDelta): CourseProgress {
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

export async function loadProgress(courseId: string): Promise<CourseProgress> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before loading progress.');
  const snapshot = await getDoc(doc(db, 'users', user.uid, 'courses', courseId));
  return migrateProgress(snapshot.exists() ? (snapshot.data() as StoredProgress) : undefined);
}

export async function saveProgress(courseId: string, delta: ProgressDelta): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before saving progress.');
  const progressRef = doc(db, 'users', user.uid, 'courses', courseId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(progressRef);
    const stored = migrateProgress(snapshot.exists() ? (snapshot.data() as StoredProgress) : undefined);
    transaction.set(progressRef, mergeProgress(stored, delta));
  });
}

export async function resetAllProgress(courseIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in before resetting progress.');
  const batch = writeBatch(db);
  courseIds.forEach((courseId) => batch.delete(doc(db, 'users', user.uid, 'courses', courseId)));
  await batch.commit();
}
```

Note: `transaction.set` writes the whole document, which drops the legacy `attempts`, `missedPositionIds`, `completedPositionIds`, and `reviewHistory` fields on first write. That is intended.

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/progress-store.test.ts`
Expected: PASS, 8 tests.

Run: `bunx vitest run test/progress-reset.test.ts`
Expected: PASS, 2 tests — `resetAllProgress` was not changed.

TypeScript will now report errors in `src/main.ts` and `src/progress-state.ts`. That is expected and is fixed in Task 7. Do not run `bun run build` yet.

- [ ] **Step 5: Commit**

```bash
git add src/progress.ts test/progress-store.test.ts
git commit -m "feat: store per-position progress records"
```

---

### Task 3: Mastery

**Files:**
- Create: `src/mastery.ts`
- Test: `test/mastery.test.ts`

**Interfaces:**
- Consumes: `CourseProgress` from Task 2, `COURSES`/`Course`/`LEVELS` from `src/courses.ts`.
- Produces: `MasterySummary`, `courseMastery(course, progress)`, `overallMastery(progressByCourse)`. Task 7 and Task 10 use both.

A line counts as mastered when it is banked and none of its positions are due.

- [ ] **Step 1: Write the failing test**

Create `test/mastery.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { COURSES } from '../src/courses';
import { courseMastery, overallMastery } from '../src/mastery';
import { emptyProgress, type CourseProgress } from '../src/progress';
import { emptyRecord } from '../src/review-schedule';

const course = COURSES[0];
const beginnerMain = course.lessons.beginner.variations[0];

function progressWith(overrides: Partial<CourseProgress>): CourseProgress {
  return { ...emptyProgress(), ...overrides };
}

describe('course mastery', () => {
  test('counts every line in every level as the denominator', () => {
    const summary = courseMastery(course, emptyProgress());
    expect(summary.total).toBe(9);
    expect(summary.mastered).toBe(0);
    expect(summary.ratio).toBe(0);
  });

  test('counts a banked line with no due positions as mastered', () => {
    const summary = courseMastery(course, progressWith({ completedVariationIds: [beginnerMain.id] }));
    expect(summary.mastered).toBe(1);
  });

  test('does not count a banked line that still has a due position', () => {
    const summary = courseMastery(course, progressWith({
      completedVariationIds: [beginnerMain.id],
      positions: { [beginnerMain.positions[0].id]: { ...emptyRecord(), due: true } },
    }));
    expect(summary.mastered).toBe(0);
  });

  test('ignores a due position belonging to a line that is not banked', () => {
    const summary = courseMastery(course, progressWith({
      positions: { [beginnerMain.positions[0].id]: { ...emptyRecord(), due: true } },
    }));
    expect(summary.mastered).toBe(0);
    expect(summary.total).toBe(9);
  });
});

describe('overall mastery', () => {
  test('sums every course', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()]));
    const summary = overallMastery(byCourse);
    expect(summary.total).toBe(36);
    expect(summary.mastered).toBe(0);
  });

  test('reports the ratio across courses', () => {
    const byCourse = Object.fromEntries(COURSES.map((entry) => [entry.id, emptyProgress()]));
    byCourse[course.id] = progressWith({ completedVariationIds: [beginnerMain.id] });
    const summary = overallMastery(byCourse);
    expect(summary.mastered).toBe(1);
    expect(summary.ratio).toBeCloseTo(1 / 36);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/mastery.test.ts`
Expected: FAIL — `Failed to resolve import "../src/mastery"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/mastery.ts`:

```ts
import { COURSES, LEVELS, type Course } from './courses';
import type { CourseProgress } from './progress';

export type MasterySummary = { mastered: number; total: number; ratio: number };

const summary = (mastered: number, total: number): MasterySummary => ({
  mastered,
  total,
  ratio: total === 0 ? 0 : mastered / total,
});

export function courseMastery(course: Course, progress: CourseProgress): MasterySummary {
  const banked = new Set(progress.completedVariationIds);
  let mastered = 0;
  let total = 0;

  for (const level of LEVELS) {
    for (const variation of course.lessons[level].variations) {
      total += 1;
      if (!banked.has(variation.id)) continue;
      if (variation.positions.some((position) => progress.positions[position.id]?.due)) continue;
      mastered += 1;
    }
  }

  return summary(mastered, total);
}

export function overallMastery(progressByCourse: Record<Course['id'], CourseProgress>): MasterySummary {
  let mastered = 0;
  let total = 0;
  for (const course of COURSES) {
    const courseSummary = courseMastery(course, progressByCourse[course.id]);
    mastered += courseSummary.mastered;
    total += courseSummary.total;
  }
  return summary(mastered, total);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/mastery.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/mastery.ts test/mastery.test.ts
git commit -m "feat: compute line mastery"
```

---

### Task 4: LineDrill

**Files:**
- Create: `src/line-drill.ts`
- Test: `test/line-drill.test.ts`

**Interfaces:**
- Consumes: `PracticePosition` from `src/courses.ts`, `parseUciMove` from `src/move-notation.ts`, `PositionOutcome` from Task 1.
- Produces: `DrillPhase`, `DrillStatus`, `DrillConfig`, `DrillSnapshot`, `DrillFeedback`, `DrillOutcomeEntry`, `LineDrill`. Tasks 5, 6, 7, and 8 depend on these.

The core rule engine. Three phases: a lesson line runs `teach` then `recall`; a review runs `review` alone.

Key rules to get right:
- A position costs at most one mistake no matter how many wrong attempts it takes.
- Illegal moves are rejected without counting as attempts, matching current behaviour.
- The budget is checked at the end of the line, not when the second mistake occurs.
- The teach pass never repeats, including after a recall replay.

- [ ] **Step 1: Write the failing test**

Create `test/line-drill.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { PracticePosition } from '../src/courses';
import { LineDrill } from '../src/line-drill';

function pos(id: string, fen: string, expectedMove: string, expectedSan: string): PracticePosition {
  return { id, fen, expectedMove, expectedSan, explanation: `Play ${expectedSan}.` };
}

/** Two real Jobava London positions; White to move in both. */
const line = (): PracticePosition[] => [
  pos('l-1', 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd2d4', 'd4'),
  pos('l-2', 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2', 'b1c3', 'Nc3'),
];

const lessonDrill = () => new LineDrill(line(), { teachPass: true, mistakeBudget: 2 });
const reviewDrill = () => new LineDrill(line(), { teachPass: false });

function playLine(drill: LineDrill, positions = line()): void {
  for (const position of positions) drill.submitMove(position.expectedMove);
}

describe('phases', () => {
  test('starts in the teach phase and restarts the same line in recall', () => {
    const drill = lessonDrill();
    expect(drill.snapshot.phase).toBe('teach');

    playLine(drill);

    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.snapshot.position?.id).toBe('l-1');
    expect(drill.snapshot.status).toBe('active');
  });

  test('banks the line after a clean recall pass', () => {
    const drill = lessonDrill();
    playLine(drill);
    playLine(drill);

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(true);
  });

  test('a review has no teach phase and never banks', () => {
    const drill = reviewDrill();
    expect(drill.snapshot.phase).toBe('review');
    expect(drill.snapshot.mistakeBudget).toBeNull();

    playLine(drill);

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(false);
  });
});

describe('mistake budget', () => {
  test('teach-pass mistakes never count', () => {
    const drill = lessonDrill();
    drill.submitMove('b1c3');
    drill.submitMove('g1f3');
    expect(drill.snapshot.mistakes).toBe(0);

    playLine(drill);
    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.mistakes).toBe(0);
  });

  test('charges one mistake per position however many wrong attempts it takes', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('g1f3');
    expect(drill.snapshot.mistakes).toBe(1);
    expect(drill.snapshot.status).toBe('retrying');
  });

  test('one mistake still banks the line', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    playLine(drill);

    expect(drill.snapshot.status).toBe('complete');
    expect(drill.snapshot.banked).toBe(true);
  });

  test('two mistakes restart the recall pass with a fresh budget, not the teach pass', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('d2d4');
    drill.submitMove('g1f3');
    drill.submitMove('b1c3');

    expect(drill.snapshot.phase).toBe('recall');
    expect(drill.snapshot.status).toBe('active');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.snapshot.mistakes).toBe(0);
    expect(drill.snapshot.banked).toBe(false);
  });

  test('a review never replays however many mistakes are made', () => {
    const drill = reviewDrill();
    drill.submitMove('b1c3');
    drill.submitMove('d2d4');
    drill.submitMove('g1f3');
    drill.submitMove('b1c3');

    expect(drill.snapshot.status).toBe('complete');
  });
});

describe('hints', () => {
  test('reveals the guide without spending budget', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    expect(drill.snapshot.hintVisible).toBe(true);
    expect(drill.snapshot.mistakes).toBe(0);
  });

  test('clears the reveal on the next position', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    drill.submitMove('d2d4');
    expect(drill.snapshot.hintVisible).toBe(false);
  });
});

describe('move validation', () => {
  test('rejects an illegal move without counting an attempt or advancing', () => {
    const drill = lessonDrill();
    const feedback = drill.submitMove('a1a8');
    expect(feedback.kind).toBe('illegal');
    expect(drill.snapshot.positionIndex).toBe(0);
    expect(drill.outcomeLog).toEqual([]);
  });

  test('rejects unparseable input', () => {
    expect(lessonDrill().submitMove('nonsense').kind).toBe('illegal');
  });
});

describe('outcome log', () => {
  test('records one entry per finished position, tagged with its phase', () => {
    const drill = lessonDrill();
    playLine(drill);

    expect(drill.outcomeLog).toEqual([
      { positionId: 'l-1', phase: 'teach', attempts: 1, solvedFirstTry: true, hinted: false },
      { positionId: 'l-2', phase: 'teach', attempts: 1, solvedFirstTry: true, hinted: false },
    ]);
  });

  test('marks a fumbled recall position and counts its attempts', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.submitMove('b1c3');
    drill.submitMove('d2d4');

    expect(drill.outcomeLog.at(-1)).toEqual({
      positionId: 'l-1',
      phase: 'recall',
      attempts: 2,
      solvedFirstTry: false,
      hinted: false,
    });
  });

  test('marks a hinted position as hinted even when the move is then correct', () => {
    const drill = lessonDrill();
    playLine(drill);

    drill.requestHint();
    drill.submitMove('d2d4');

    expect(drill.outcomeLog.at(-1)).toMatchObject({ positionId: 'l-1', phase: 'recall', hinted: true, solvedFirstTry: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/line-drill.test.ts`
Expected: FAIL — `Failed to resolve import "../src/line-drill"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/line-drill.ts`:

```ts
import { Chess } from 'chess.js';
import type { PracticePosition } from './courses';
import { parseUciMove } from './move-notation';
import type { PositionOutcome } from './review-schedule';

export type DrillPhase = 'teach' | 'recall' | 'review';
export type DrillStatus = 'active' | 'retrying' | 'complete';
export type DrillFeedbackKind = 'correct' | 'incorrect' | 'illegal' | 'complete';

export type DrillConfig = { teachPass: boolean; mistakeBudget?: number };

export type DrillOutcomeEntry = PositionOutcome & { positionId: string; phase: DrillPhase };

export type DrillSnapshot = {
  phase: DrillPhase;
  status: DrillStatus;
  positionIndex: number;
  position: PracticePosition | null;
  positionCount: number;
  mistakes: number;
  mistakeBudget: number | null;
  hintVisible: boolean;
  banked: boolean;
};

export type DrillFeedback = {
  kind: DrillFeedbackKind;
  message: string;
  expectedMove: string;
  expectedSan: string;
  retryRequired: boolean;
  snapshot: DrillSnapshot;
};

export class LineDrill {
  private readonly positions: PracticePosition[];
  private readonly budget: number | null;
  private phase: DrillPhase;
  private status: DrillStatus = 'active';
  private index = 0;
  private mistakes = 0;
  private banked = false;
  private hintVisible = false;
  private attemptsOnPosition = 0;
  private wrongOnPosition = false;
  private hintedOnPosition = false;
  private readonly log: DrillOutcomeEntry[] = [];

  constructor(positions: PracticePosition[], config: DrillConfig) {
    this.positions = positions;
    this.budget = config.mistakeBudget ?? null;
    this.phase = config.teachPass ? 'teach' : config.mistakeBudget === undefined ? 'review' : 'recall';
  }

  get snapshot(): DrillSnapshot {
    return {
      phase: this.phase,
      status: this.status,
      positionIndex: this.index,
      position: this.positions[this.index] ?? null,
      positionCount: this.positions.length,
      mistakes: this.mistakes,
      mistakeBudget: this.phase === 'recall' ? this.budget : null,
      hintVisible: this.hintVisible,
      banked: this.banked,
    };
  }

  get outcomeLog(): DrillOutcomeEntry[] {
    return [...this.log];
  }

  requestHint(): DrillSnapshot {
    if (this.status === 'complete') return this.snapshot;
    this.hintVisible = true;
    this.hintedOnPosition = true;
    return this.snapshot;
  }

  submitMove(move: string): DrillFeedback {
    const position = this.positions[this.index];
    if (!position || this.status === 'complete') {
      return this.feedback('complete', 'This drill is complete.', position ?? null, false);
    }

    const candidate = parseUciMove(move);
    if (!candidate) return this.feedback('illegal', 'That is not a valid board move.', position, false);
    const chess = new Chess(position.fen);
    try {
      chess.move(candidate);
    } catch {
      return this.feedback('illegal', 'That move is not legal in this position.', position, false);
    }

    this.attemptsOnPosition += 1;

    if (move !== position.expectedMove) {
      if (!this.wrongOnPosition && this.phase !== 'teach') this.mistakes += 1;
      this.wrongOnPosition = true;
      this.status = 'retrying';
      return this.feedback('incorrect', `Not the repertoire move. ${position.expectedSan} keeps the plan: ${position.explanation}`, position, true);
    }

    this.log.push({
      positionId: position.id,
      phase: this.phase,
      attempts: this.attemptsOnPosition,
      solvedFirstTry: !this.wrongOnPosition,
      hinted: this.hintedOnPosition,
    });
    this.resetPositionTracking();
    this.index += 1;

    if (this.index < this.positions.length) {
      this.status = 'active';
      return this.feedback('correct', 'Good. Continue the line.', position, false);
    }

    return this.finishPass(position);
  }

  private finishPass(position: PracticePosition): DrillFeedback {
    if (this.phase === 'teach') {
      this.phase = 'recall';
      this.index = 0;
      this.mistakes = 0;
      this.status = 'active';
      return this.feedback('correct', 'Line learned. Now play it back without the guide.', position, false);
    }

    if (this.phase === 'review') {
      this.status = 'complete';
      return this.feedback('correct', 'Review complete.', position, false);
    }

    if (this.budget !== null && this.mistakes >= this.budget) {
      this.index = 0;
      this.mistakes = 0;
      this.status = 'active';
      return this.feedback('correct', 'That pass had too many slips. Play the line again to bank it.', position, false);
    }

    this.status = 'complete';
    this.banked = true;
    return this.feedback('correct', 'Line banked.', position, false);
  }

  private resetPositionTracking(): void {
    this.attemptsOnPosition = 0;
    this.wrongOnPosition = false;
    this.hintedOnPosition = false;
    this.hintVisible = false;
  }

  private feedback(kind: DrillFeedbackKind, message: string, position: PracticePosition | null, retryRequired: boolean): DrillFeedback {
    return {
      kind,
      message,
      expectedMove: position?.expectedMove ?? '',
      expectedSan: position?.expectedSan ?? '',
      retryRequired,
      snapshot: this.snapshot,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/line-drill.test.ts`
Expected: PASS, 15 tests.

- [ ] **Step 5: Commit**

```bash
git add src/line-drill.ts test/line-drill.test.ts
git commit -m "feat: add teach and recall line drill"
```

---

### Task 5: Phase-aware move guide

**Files:**
- Modify: `src/guide-policy.ts` (replace the whole file)
- Modify: `test/guided-move-interactions.test.ts` (replace the `describe('guided move policy')` block only, lines 46-57)

**Interfaces:**
- Consumes: `DrillPhase`, `DrillStatus` from Task 4.
- Produces: `shouldShowMoveGuide(phase, status, hintVisible)`. Task 8 calls it with the drill snapshot's fields.

The signature changes from `(isReview: boolean, status: SessionStatus)` to `(phase, status, hintVisible)`. Teach always shows the guide; recall and review show it only after a wrong move or a hint.

- [ ] **Step 1: Write the failing test**

In `test/guided-move-interactions.test.ts`, leave every import as it is and replace only the `describe('guided move policy', ...)` block (lines 46-57) with:

```ts
describe('guided move policy', () => {
  test('always guides the teach pass', () => {
    expect(shouldShowMoveGuide('teach', 'active', false)).toBe(true);
    expect(shouldShowMoveGuide('teach', 'retrying', false)).toBe(true);
  });

  test('withholds the guide during recall until it is earned', () => {
    expect(shouldShowMoveGuide('recall', 'active', false)).toBe(false);
    expect(shouldShowMoveGuide('recall', 'retrying', false)).toBe(true);
    expect(shouldShowMoveGuide('recall', 'active', true)).toBe(true);
  });

  test('treats a review like a recall pass', () => {
    expect(shouldShowMoveGuide('review', 'active', false)).toBe(false);
    expect(shouldShowMoveGuide('review', 'retrying', false)).toBe(true);
    expect(shouldShowMoveGuide('review', 'active', true)).toBe(true);
  });

  test('never guides a finished drill', () => {
    expect(shouldShowMoveGuide('teach', 'complete', true)).toBe(false);
    expect(shouldShowMoveGuide('recall', 'complete', true)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/guided-move-interactions.test.ts`
Expected: FAIL — TypeScript rejects the string arguments, or the assertions fail, because `shouldShowMoveGuide` still takes a boolean first argument.

- [ ] **Step 3: Write minimal implementation**

Replace the whole of `src/guide-policy.ts`:

```ts
import type { DrillPhase, DrillStatus } from './line-drill';

export function shouldShowMoveGuide(phase: DrillPhase, status: DrillStatus, hintVisible: boolean): boolean {
  if (status === 'complete') return false;
  if (phase === 'teach') return true;
  return hintVisible || status === 'retrying';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/guided-move-interactions.test.ts`
Expected: PASS, 16 tests — the 4 new guide-policy tests plus 12 unchanged ones (5 board input, 4 transition plans, 3 move duration).

- [ ] **Step 5: Commit**

```bash
git add src/guide-policy.ts test/guided-move-interactions.test.ts
git commit -m "feat: withhold the move guide during recall"
```

---

### Task 6: LessonRunner

**Files:**
- Create: `src/lesson-runner.ts`
- Test: `test/lesson-runner.test.ts`

**Interfaces:**
- Consumes: `Lesson`, `LevelKey`, `LEVELS` from `src/courses.ts`; `LineDrill` and its types from Task 4; `applyOutcome` and `PositionRecord` from Task 1; `CourseProgress` from Task 2.
- Produces: `RunnerSnapshot`, `RunnerFeedback`, `LessonSummary`, `MISTAKE_BUDGET`, `LessonRunner` with `snapshot`, `reviewMode`, `submitMove`, `requestHint`, `progressFor(level)`, `summary()`. Task 7 uses all of them.

Note on types: `submitMove` returns a `RunnerFeedback`, not a `DrillFeedback`. They share every field except `snapshot`, which widens from `DrillSnapshot` to `RunnerSnapshot`. `main.ts` must type its `feedback` variable as `RunnerFeedback`.

The runner replaces both `PracticeSession`'s sequencing and `progress-state.ts`'s merge. `progressFor(level)` returns the full `CourseProgress` this session has produced so far; `main.ts` diffs it against a saved watermark.

- [ ] **Step 1: Write the failing test**

Create `test/lesson-runner.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import type { Lesson, PracticePosition, Variation } from '../src/courses';
import { LessonRunner } from '../src/lesson-runner';
import { emptyProgress, type CourseProgress } from '../src/progress';

function pos(id: string, fen: string, expectedMove: string, expectedSan: string): PracticePosition {
  return { id, fen, expectedMove, expectedSan, explanation: `Play ${expectedSan}.` };
}

const OPENING = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_D4_D5 = 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2';

function variation(kind: Variation['kind'], positions: PracticePosition[]): Variation {
  return { id: `beginner-${kind}`, kind, title: `${kind} line`, summary: `Summary for ${kind}.`, evalCp: 10, positions };
}

function fixtureLesson(): Lesson {
  const variations = [
    variation('main', [pos('main-1', OPENING, 'd2d4', 'd4'), pos('main-2', AFTER_D4_D5, 'b1c3', 'Nc3')]),
    variation('alternative', [pos('alt-1', OPENING, 'd2d4', 'd4')]),
  ];
  return { level: 'beginner', title: 'Fixture', summary: 'Fixture lesson.', variations, positions: variations.flatMap((entry) => entry.positions) };
}

/** Plays the current line correctly until the runner moves on or finishes. */
function playCurrentLine(runner: LessonRunner): void {
  for (let guard = 0; guard < 20; guard += 1) {
    const position = runner.snapshot.position;
    if (!position) return;
    const before = runner.snapshot.lineId;
    runner.submitMove(position.expectedMove);
    if (runner.snapshot.lessonComplete) return;
    if (runner.snapshot.lineId !== before) return;
  }
  throw new Error('line did not finish');
}

const lesson = fixtureLesson();
const base = (overrides: Partial<CourseProgress> = {}): CourseProgress => ({ ...emptyProgress(), ...overrides });

describe('sequencing', () => {
  test('starts on the first line in the teach phase', () => {
    const runner = new LessonRunner(lesson, base());
    expect(runner.snapshot.lineId).toBe('beginner-main');
    expect(runner.snapshot.lineIndex).toBe(0);
    expect(runner.snapshot.lineCount).toBe(2);
    expect(runner.snapshot.phase).toBe('teach');
  });

  test('advances to the next line once the first banks', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    expect(runner.snapshot.lineId).toBe('beginner-alternative');
    expect(runner.snapshot.phase).toBe('teach');
    expect(runner.snapshot.bankedVariationIds).toEqual(['beginner-main']);
  });

  test('skips lines already banked in earlier sessions', () => {
    const runner = new LessonRunner(lesson, base({ completedVariationIds: ['beginner-main'] }));
    expect(runner.snapshot.lineId).toBe('beginner-alternative');
  });

  test('completes the lesson when every line is banked', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    playCurrentLine(runner);
    expect(runner.snapshot.lessonComplete).toBe(true);
  });

  test('is immediately complete when every line was already banked', () => {
    const runner = new LessonRunner(lesson, base({ completedVariationIds: ['beginner-main', 'beginner-alternative'] }));
    expect(runner.snapshot.lessonComplete).toBe(true);
  });
});

describe('review mode', () => {
  test('drills only the requested positions with no teach pass and no banking', () => {
    const runner = new LessonRunner(lesson, base(), { reviewPositionIds: ['main-2'] });
    expect(runner.reviewMode).toBe(true);
    expect(runner.snapshot.phase).toBe('review');
    expect(runner.snapshot.position?.id).toBe('main-2');

    runner.submitMove('b1c3');
    expect(runner.snapshot.lessonComplete).toBe(false);
    expect(runner.snapshot.bankedVariationIds).toEqual([]);
  });

  test('clears a due position after two clean reviews', () => {
    const due = base({ positions: { 'main-2': { attempts: 1, corrects: 0, misses: 1, hints: 0, reviewStreak: 0, due: true } } });

    const first = new LessonRunner(lesson, due, { reviewPositionIds: ['main-2'] });
    first.submitMove('b1c3');
    const afterFirst = first.progressFor('beginner');
    expect(afterFirst.positions['main-2']).toMatchObject({ reviewStreak: 1, due: true });

    const second = new LessonRunner(lesson, afterFirst, { reviewPositionIds: ['main-2'] });
    second.submitMove('b1c3');
    expect(second.progressFor('beginner').positions['main-2']).toMatchObject({ reviewStreak: 0, due: false });
  });
});

describe('progress output', () => {
  test('queues a recall miss but not a teach miss', () => {
    const runner = new LessonRunner(lesson, base());
    runner.submitMove('b1c3');
    runner.submitMove('d2d4');
    runner.submitMove('b1c3');
    expect(runner.snapshot.phase).toBe('recall');
    expect(runner.progressFor('beginner').positions['main-1']).toMatchObject({ due: false, misses: 0 });

    runner.submitMove('g1f3');
    runner.submitMove('d2d4');
    expect(runner.progressFor('beginner').positions['main-1']).toMatchObject({ due: true, misses: 1 });
  });

  test('completes and unlocks the level only when the lesson is finished', () => {
    const runner = new LessonRunner(lesson, base());
    expect(runner.progressFor('beginner').completedLevels).toEqual([]);

    playCurrentLine(runner);
    playCurrentLine(runner);

    const progress = runner.progressFor('beginner');
    expect(progress.completedLevels).toEqual(['beginner']);
    expect(progress.unlockedLevel).toBe(1);
  });

  test('does not complete a level whose prerequisite is unfinished', () => {
    const runner = new LessonRunner(lesson, base());
    playCurrentLine(runner);
    playCurrentLine(runner);
    expect(runner.progressFor('advanced').completedLevels).toEqual([]);
  });

  test('accumulates practice time', () => {
    let clock = 1000;
    const runner = new LessonRunner(lesson, base({ practiceMs: 500 }), { now: () => clock });
    clock = 3500;
    expect(runner.progressFor('beginner').practiceMs).toBe(3000);
  });
});

describe('summary', () => {
  test('reports banked lines, missed positions, hints, and elapsed time', () => {
    let clock = 0;
    const runner = new LessonRunner(lesson, base(), { now: () => clock });

    playCurrentLine(runner);
    clock = 8000;
    runner.submitMove('d2d4');
    runner.requestHint();
    runner.submitMove('d2d4');

    const summary = runner.summary();
    expect(summary.bankedLines.map((entry) => entry.id)).toEqual(['beginner-main', 'beginner-alternative']);
    expect(summary.missed).toEqual([{ positionId: 'alt-1', lineTitle: 'alternative line', expectedSan: 'd4' }]);
    expect(summary.hints).toBe(1);
    expect(summary.elapsedMs).toBe(8000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bunx vitest run test/lesson-runner.test.ts`
Expected: FAIL — `Failed to resolve import "../src/lesson-runner"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lesson-runner.ts`:

```ts
import { LEVELS, type Lesson, type LevelKey, type PracticePosition, type Variation } from './courses';
import { LineDrill, type DrillFeedback, type DrillPhase, type DrillStatus } from './line-drill';
import type { CourseProgress } from './progress';
import { applyOutcome, emptyRecord, type PositionRecord } from './review-schedule';

export const MISTAKE_BUDGET = 2;

/** A DrillFeedback whose snapshot is widened to the runner's view. */
export type RunnerFeedback = Omit<DrillFeedback, 'snapshot'> & { snapshot: RunnerSnapshot };

export type RunnerSnapshot = {
  phase: DrillPhase;
  status: DrillStatus;
  position: PracticePosition | null;
  positionIndex: number;
  positionCount: number;
  mistakes: number;
  mistakeBudget: number | null;
  hintVisible: boolean;
  lineId: string | null;
  lineTitle: string | null;
  lineSummary: string | null;
  lineIndex: number;
  lineCount: number;
  bankedVariationIds: string[];
  lessonComplete: boolean;
};

export type LessonSummary = {
  bankedLines: { id: string; title: string }[];
  missed: { positionId: string; lineTitle: string; expectedSan: string }[];
  hints: number;
  elapsedMs: number;
};

type RunnerOptions = {
  reviewPositionIds?: string[];
  now?: () => number;
};

type Line = { variation: Variation | null; positions: PracticePosition[] };

export class LessonRunner {
  private readonly lesson: Lesson;
  private readonly base: CourseProgress;
  private readonly now: () => number;
  private readonly startedAt: number;
  private readonly isReview: boolean;
  private readonly lines: Line[];
  private readonly banked: string[] = [];
  private readonly records: Record<string, PositionRecord>;
  private readonly missed: LessonSummary['missed'] = [];
  private appliedOutcomes = 0;
  private lineIndex = 0;
  private drill: LineDrill | null = null;
  private hints = 0;
  private finishedAt: number | null = null;

  constructor(lesson: Lesson, base: CourseProgress, options: RunnerOptions = {}) {
    this.lesson = lesson;
    this.base = base;
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
    this.records = { ...base.positions };

    const reviewIds = options.reviewPositionIds ?? [];
    const reviewPositions = reviewIds
      .map((id) => lesson.positions.find((position) => position.id === id))
      .filter((position): position is PracticePosition => Boolean(position));
    this.isReview = reviewPositions.length > 0;

    if (this.isReview) {
      this.lines = [{ variation: null, positions: reviewPositions }];
    } else {
      const bankedAlready = new Set(base.completedVariationIds);
      this.lines = lesson.variations
        .filter((variation) => !bankedAlready.has(variation.id))
        .map((variation) => ({ variation, positions: variation.positions }));
    }

    this.openDrill();
  }

  get reviewMode(): boolean {
    return this.isReview;
  }

  get snapshot(): RunnerSnapshot {
    const line = this.lines[this.lineIndex] ?? null;
    const drill = this.drill?.snapshot ?? null;
    const complete = this.drill === null;
    return {
      phase: drill?.phase ?? (this.isReview ? 'review' : 'recall'),
      status: drill?.status ?? 'complete',
      position: drill?.position ?? null,
      positionIndex: drill?.positionIndex ?? 0,
      positionCount: drill?.positionCount ?? 0,
      mistakes: drill?.mistakes ?? 0,
      mistakeBudget: drill?.mistakeBudget ?? null,
      hintVisible: drill?.hintVisible ?? false,
      lineId: line?.variation?.id ?? null,
      lineTitle: line?.variation?.title ?? null,
      lineSummary: line?.variation?.summary ?? null,
      lineIndex: this.lineIndex,
      lineCount: this.lines.length,
      bankedVariationIds: [...this.banked],
      lessonComplete: complete && !this.isReview,
    };
  }

  submitMove(move: string): RunnerFeedback {
    if (!this.drill) {
      return {
        kind: 'complete',
        message: 'This lesson is complete.',
        expectedMove: '',
        expectedSan: '',
        retryRequired: false,
        snapshot: this.snapshot,
      };
    }
    const feedback = this.drill.submitMove(move);
    this.absorbOutcomes();
    if (this.drill.snapshot.status === 'complete') this.closeDrill();
    return { ...feedback, snapshot: this.snapshot };
  }

  requestHint(): RunnerSnapshot {
    if (this.drill && this.drill.snapshot.status !== 'complete') {
      const before = this.drill.snapshot.hintVisible;
      this.drill.requestHint();
      if (!before) this.hints += 1;
    }
    return this.snapshot;
  }

  progressFor(level: LevelKey): CourseProgress {
    const completedLevels = [...this.base.completedLevels];
    let unlockedLevel = this.base.unlockedLevel;
    const levelIndex = LEVELS.indexOf(level);
    const prerequisiteComplete = levelIndex === 0 || completedLevels.includes(LEVELS[levelIndex - 1]);

    if (this.snapshot.lessonComplete && prerequisiteComplete && !completedLevels.includes(level)) {
      completedLevels.push(level);
      unlockedLevel = Math.max(unlockedLevel, Math.min(levelIndex + 1, LEVELS.length - 1));
    }

    return {
      completedLevels,
      unlockedLevel,
      completedVariationIds: [...new Set([...this.base.completedVariationIds, ...this.banked])],
      positions: { ...this.records },
      practiceMs: this.base.practiceMs + this.elapsedMs(),
    };
  }

  summary(): LessonSummary {
    const titles = new Map(this.lesson.variations.map((variation) => [variation.id, variation.title]));
    return {
      bankedLines: this.banked.map((id) => ({ id, title: titles.get(id) ?? id })),
      missed: [...this.missed],
      hints: this.hints,
      elapsedMs: this.elapsedMs(),
    };
  }

  private elapsedMs(): number {
    return Math.max(0, (this.finishedAt ?? this.now()) - this.startedAt);
  }

  private openDrill(): void {
    const line = this.lines[this.lineIndex];
    if (!line) {
      this.drill = null;
      this.finishedAt = this.now();
      return;
    }
    this.drill = this.isReview
      ? new LineDrill(line.positions, { teachPass: false })
      : new LineDrill(line.positions, { teachPass: true, mistakeBudget: MISTAKE_BUDGET });
    this.appliedOutcomes = 0;
  }

  private closeDrill(): void {
    const line = this.lines[this.lineIndex];
    if (this.drill?.snapshot.banked && line?.variation) this.banked.push(line.variation.id);
    this.lineIndex += 1;
    this.openDrill();
  }

  private absorbOutcomes(): void {
    if (!this.drill) return;
    const log = this.drill.outcomeLog;
    const lineTitle = this.lines[this.lineIndex]?.variation?.title ?? 'Review';

    for (let index = this.appliedOutcomes; index < log.length; index += 1) {
      const entry = log[index];
      const context = entry.phase;
      this.records[entry.positionId] = applyOutcome(
        this.records[entry.positionId] ?? emptyRecord(),
        { attempts: entry.attempts, solvedFirstTry: entry.solvedFirstTry, hinted: entry.hinted },
        context,
      );

      const scored = context !== 'teach';
      const clean = entry.solvedFirstTry && !entry.hinted;
      if (scored && !clean) {
        const position = this.lesson.positions.find((candidate) => candidate.id === entry.positionId);
        this.missed.push({
          positionId: entry.positionId,
          lineTitle,
          expectedSan: position?.expectedSan ?? '',
        });
      }
    }
    this.appliedOutcomes = log.length;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bunx vitest run test/lesson-runner.test.ts`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lesson-runner.ts test/lesson-runner.test.ts
git commit -m "feat: sequence lesson lines with a runner"
```

---

### Task 7: Wire main.ts to the runner

**Files:**
- Modify: `src/main.ts` (imports at lines 1-13; `reviewIds`/`reviewIdsForLevel` at lines 119-128; `levelButton` at lines 111-117; `renderDashboard` at lines 130-175; `startPractice` at lines 237-574)
- Delete: `src/practice-session.ts`, `src/progress-state.ts`
- Delete: `test/practice-session.test.ts`, `test/progress-state.test.ts`

**Interfaces:**
- Consumes: everything produced by Tasks 1-6.
- Produces: a compiling, working app on the new engine. Tasks 8-10 refine the practice screen on top of it.

This is the integration task. The goal is a working app with behaviour equivalent to the new rules, but with the practice screen still looking roughly as it does today. Tasks 8-10 then improve the screen. Keep all drag, pointer, keyboard, and animation code untouched.

- [ ] **Step 1: Delete the replaced modules and their tests**

```bash
git rm src/practice-session.ts src/progress-state.ts test/practice-session.test.ts test/progress-state.test.ts
```

- [ ] **Step 2: Run the suite to see the expected breakage**

Run: `bunx vitest run --exclude "test/browser/**" --exclude "test/auth.test.ts" --exclude "test/rules.test.ts"`
Expected: PASS for all remaining files. `src/main.ts` is not covered by Vitest, so its breakage only shows in the build.

Run: `bunx tsc --noEmit`
Expected: FAIL with errors in `src/main.ts` about the missing `./practice-session` and `./progress-state` modules and the changed `saveProgress` signature.

- [ ] **Step 3: Update the imports**

In `src/main.ts`, replace lines 8-10:

```ts
import { createPracticeSession, type MoveFeedback, type SessionSnapshot } from './practice-session';
import { loadProgress, resetAllProgress, saveProgress, type CourseProgress } from './progress';
import { applySessionProgress } from './progress-state';
```

with:

```ts
import { LessonRunner, type RunnerFeedback, type RunnerSnapshot } from './lesson-runner';
import { diffProgress, loadProgress, resetAllProgress, saveProgress, type CourseProgress } from './progress';
import { duePositionIds } from './review-schedule';
```

Then retype the feedback variable. On line 243, replace:

```ts
  let feedback: MoveFeedback | null = null;
```

with:

```ts
  let feedback: RunnerFeedback | null = null;
```

- [ ] **Step 4: Update the dashboard's review queries**

Replace `reviewIds` and `reviewIdsForLevel` (lines 119-128) with:

```ts
function reviewIdsForLevel(course: Course, level: LevelKey, progress: CourseProgress): string[] {
  return duePositionIds(progress.positions, course.lessons[level].positions.map((position) => position.id));
}

function allReviewIdsFor(course: Course, progress: CourseProgress): string[] {
  return LEVELS.flatMap((level) => reviewIdsForLevel(course, level, progress));
}
```

In `renderDashboard`, replace the two lines that used `reviewIds(progress)` (lines 140-141) with:

```ts
      const allReviewIds = allReviewIdsFor(course, progress);
      const reviewLevel = LEVELS.find((candidate) => reviewIdsForLevel(course, candidate, progress).length > 0);
```

In `levelButton` (line 115), the `detail` string still reads `course.lessons[level].positions.length` — leave it unchanged.

- [ ] **Step 5: Replace the session wiring in startPractice**

In `startPractice`, replace lines 240-241:

```ts
  const bankedVariationIds = (progress.completedVariationIds ?? []).filter((id) => lesson.variations.some((variation) => variation.id === id));
  const session = createPracticeSession(lesson, { reviewPositionIds, bankedVariationIds });
```

with:

```ts
  const session = new LessonRunner(lesson, progress, { reviewPositionIds });
```

Replace the `savedAttempts` declaration (line 244, `let savedAttempts = 0;`) with:

```ts
  let savedProgress: CourseProgress = progress;
```

Replace the whole `persist` function (lines 265-277) with:

```ts
  const persist = () => {
    const write = saveQueue.catch(() => undefined).then(async () => {
      const current = session.progressFor(level);
      const delta = diffProgress(savedProgress, current);
      await saveProgress(course.id, delta);
      savedProgress = current;
      liveProgress = current;
      saveError = false;
    });
    pendingSave = write;
    saveQueue = write.catch(() => undefined);
    return write;
  };
```

Every existing call site passes a snapshot argument — `persist(result.snapshot)` and `persist(session.snapshot)`. Change them all to `persist()`. There are four: two in `submitAttempt` (lines 515 and 527), one in `submitAttempt`'s sequence branch (line 535), and one in the `#retry-save` handler (line 340).

- [ ] **Step 6: Update the draw function's snapshot usage**

In `draw` (lines 295-326), replace the snapshot-derived locals. Replace lines 296-313 with:

```ts
    const snapshot: RunnerSnapshot = session.snapshot;
    const lessonComplete = snapshot.lessonComplete && !sequenceActive;
    const completionMessage = saveError
      ? nextLevel ? `Save progress to unlock ${levelNames[nextLevel]}.` : 'Save progress before leaving the course.'
      : nextLevel ? `${levelNames[level]} complete. ${levelNames[nextLevel]} unlocked.` : `${levelNames[level]} complete. Course complete.`;
    const position = sequenceActive && sequencePosition ? sequencePosition : snapshot.position ?? lesson.positions[lesson.positions.length - 1];
    const chess = new Chess(animation?.plan.fromFen ?? displayFen ?? position.fen);
    const status = sequenceActive
      ? 'Playing move'
      : snapshot.status === 'complete'
        ? (snapshot.lessonComplete ? 'Lesson complete' : 'Review complete')
        : snapshot.status === 'retrying'
          ? 'Retry this position'
          : `${course.side === 'white' ? 'White' : 'Black'} to move`;
    const showGuide = !sequenceActive && shouldShowMoveGuide(snapshot.phase, snapshot.status, snapshot.hintVisible);
    const expectedRoute = showGuide ? { from: position.expectedMove.slice(0, 2), to: position.expectedMove.slice(2, 4) } : null;
    const moveCount = snapshot.positionCount || lesson.positions.length;
    const moveOrdinal = Math.min(snapshot.positionIndex + 1, moveCount);
    const copyHeader = session.reviewMode || !snapshot.lineTitle
      ? `<p class="eyebrow">${levelNames[level]} review - ${moveOrdinal} of ${moveCount}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lede">${escapeHtml(lesson.summary)}</p>`
      : `<p class="eyebrow">Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount} &middot; move ${moveOrdinal} of ${moveCount}</p><p class="line-title">${escapeHtml(snapshot.lineTitle)}</p><p class="lede">${escapeHtml(snapshot.lineSummary)}</p><h1>${escapeHtml(lesson.title)}</h1><p class="lesson-summary">${escapeHtml(lesson.summary)}</p>`;
```

The `needs-clean-run` status no longer exists, so replace the `actionMarkup` block (lines 319-325) with:

```ts
    const actionMarkup = lessonComplete
      ? `<button id="proceed"${saveError ? ' disabled' : ''}>Proceed</button>`
      : snapshot.status === 'complete'
        ? '<button id="back-after-complete">Back to dashboard</button>'
        : '<button id="exit-practice" class="quiet-button">Exit lesson</button>';
```

Delete the `#restart-run` event binding (line 339) — the runner restarts a failed pass by itself.

In the board caption (inside the `app.innerHTML` template, line 326), replace `${snapshot.attempts} attempt${snapshot.attempts === 1 ? '' : 's'}` with:

```ts
${snapshot.lineCount ? `Line ${snapshot.lineIndex + 1} of ${snapshot.lineCount}` : 'Review'}
```

- [ ] **Step 7: Update proceedAfterLesson**

In `proceedAfterLesson` (line 549), `startPractice(course, nextLevel, liveProgress)` already passes `liveProgress`, which `persist` now keeps current. No change needed. Confirm `liveProgress` is still declared at line 245 (`let liveProgress = { ...progress };`) and leave it.

- [ ] **Step 8: Verify the build and the full suite**

Run: `bunx tsc --noEmit`
Expected: PASS, no errors.

Run: `bun run test:emulators`
Expected: PASS, 13 files, zero failures — `auth`, `board-legibility`, `course-content`, `guided-move-interactions`, `line-drill`, `lesson-runner`, `mastery`, `progress-reset`, `progress-store`, `release-readiness`, `review-schedule`, `route-arrow`, `rules`. That is the original 10 files, minus the 2 deleted in Step 1, plus the 5 added in Tasks 1-6.

- [ ] **Step 9: Manually smoke-test the app**

Run: `bun run dev`, sign in, open a Beginner lesson. Confirm the line runs a teach pass with arrows and then restarts without them, that a wrong move shows the arrow, and that completing every line reaches Proceed.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor: drive practice from the lesson runner"
```

---

### Task 8: Phase, hint, and budget on the practice screen

**Files:**
- Modify: `src/main.ts` (the `draw` function's `copyHeader`, `feedbackMarkup`, and `actionMarkup`, plus one new event binding)
- Modify: `src/style.css` (append the new rules)

**Interfaces:**
- Consumes: `RunnerSnapshot` fields `phase`, `mistakes`, `mistakeBudget`, `hintVisible` from Task 6.
- Produces: no new exports. Task 10 reuses the `.summary-panel` conventions established here.

- [ ] **Step 1: Add the phase label and budget indicator to the header**

In `draw`, immediately before `const copyHeader = ...`, add:

```ts
    const phaseLabel = session.reviewMode ? 'Review' : snapshot.phase === 'teach' ? 'Learn the line' : 'Recall';
    const budgetMarkup = snapshot.mistakeBudget === null
      ? ''
      : `<p class="mistake-budget" aria-label="${snapshot.mistakes} of ${snapshot.mistakeBudget} mistakes used">${Array.from({ length: snapshot.mistakeBudget }, (_, slot) => `<span class="budget-slot ${slot < snapshot.mistakes ? 'is-spent' : ''}"></span>`).join('')}<small>${snapshot.mistakes} of ${snapshot.mistakeBudget} slips used</small></p>`;
```

Then change the non-review branch of `copyHeader` so the eyebrow carries the phase, replacing its first `<p class="eyebrow">...</p>` with:

```ts
`<p class="eyebrow">${phaseLabel} &middot; line ${snapshot.lineIndex + 1} of ${snapshot.lineCount} &middot; move ${moveOrdinal} of ${moveCount}</p>`
```

and append `${budgetMarkup}` to the end of that same template string.

- [ ] **Step 2: Add the hint button**

Replace the `actionMarkup` assignment from Task 7 Step 6 with:

```ts
    const canHint = !sequenceActive && snapshot.status !== 'complete' && snapshot.phase !== 'teach' && !snapshot.hintVisible;
    const hintMarkup = canHint ? '<button id="show-hint" class="quiet-button">Show me</button>' : '';
    const actionMarkup = lessonComplete
      ? `<button id="proceed"${saveError ? ' disabled' : ''}>Proceed</button>`
      : snapshot.status === 'complete'
        ? '<button id="back-after-complete">Back to dashboard</button>'
        : `${hintMarkup}<button id="exit-practice" class="quiet-button">Exit lesson</button>`;
```

Next to the other bindings (near line 339), add:

```ts
    document.querySelector('#show-hint')?.addEventListener('click', () => { session.requestHint(); draw(); });
```

- [ ] **Step 3: Improve the wrong-move feedback**

`LineDrill` already composes the fuller message in Task 4. Update the feedback markup so the expected move line is not duplicated. Replace the `feedback` branch of `feedbackMarkup` (line 317) with:

```ts
        ? `<div class="feedback feedback-${feedback.kind}"><strong>${escapeHtml(feedback.message)}</strong>${feedback.kind === 'incorrect' ? `<span>Expected: ${escapeHtml(feedback.expectedSan)}</span>` : ''}</div>`
```

and change the default hint line so it reflects the phase:

```ts
        : `<p class="move-hint">${snapshot.phase === 'teach' ? 'Follow the arrow to learn the line.' : `Select a ${course.side} piece, then select its destination.`}</p>`;
```

- [ ] **Step 4: Add the styles**

Append to `src/style.css`:

```css
.mistake-budget {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin: .75rem 0 0;
}

.budget-slot {
  width: .6rem;
  height: .6rem;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: .45;
}

.budget-slot.is-spent {
  background: currentColor;
  opacity: 1;
}

.mistake-budget small {
  opacity: .7;
}
```

- [ ] **Step 5: Verify**

Run: `bunx tsc --noEmit`
Expected: PASS.

Run: `bun run dev` and confirm at a Beginner lesson: the eyebrow reads "Learn the line" then "Recall"; "Show me" appears only during recall; pressing it reveals the arrow and does not fill a budget slot; a wrong move fills one slot.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "feat: show phase, hint, and mistake budget"
```

---

### Task 9: Line handoff and opponent settle beat

**Files:**
- Modify: `src/main.ts` (`playSequence`, and a new `transitionNotice` local in `draw`)
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `RunnerSnapshot.lineTitle` and `bankedVariationIds` from Task 6.
- Produces: no new exports.

Two changes: a named handoff when a line banks, and a longer settle after the opponent's reply so it cannot be missed.

- [ ] **Step 1: Add the settle beat**

In `playSequence` (lines 484-504), replace the reply block:

```ts
    if (replyPlan) {
      await wait(250);
      if (leaving) return;
      await playPhase(replyPlan, duration);
    }
```

with:

```ts
    if (replyPlan) {
      await wait(250);
      if (leaving) return;
      await playPhase(replyPlan, duration);
      if (leaving) return;
      await wait(session.snapshot.phase === 'teach' ? 450 : 250);
    }
```

Reduced motion already collapses `duration` to 0 via `effectiveMoveDuration`; the settle beat is short enough to keep even then.

- [ ] **Step 2: Add the handoff notice**

Add these declarations next to the other `startPractice` locals (near line 260):

```ts
  let handoff: { banked: string; next: string } | null = null;
  let handoffTimer: number | null = null;
```

Add this helper next to `flashRoute`:

```ts
  const showHandoff = (banked: string, next: string) => {
    if (handoffTimer !== null) window.clearTimeout(handoffTimer);
    handoff = { banked, next };
    handoffTimer = window.setTimeout(() => {
      handoff = null;
      handoffTimer = null;
      if (!leaving) draw();
    }, 1600);
  };
```

In `submitAttempt`, capture the line before and after the move. Replace the opening of `submitAttempt` (lines 506-511):

```ts
  function submitAttempt(move: string, options: { fromDrag?: boolean } = {}) {
    if (busy) return;
    const position = session.snapshot.position;
    if (!position) return;
    const result = session.submitMove(move);
    feedback = result;
```

with:

```ts
  function submitAttempt(move: string, options: { fromDrag?: boolean } = {}) {
    if (busy) return;
    const before = session.snapshot;
    const position = before.position;
    if (!position) return;
    const result = session.submitMove(move);
    feedback = result;
    const after = session.snapshot;
    if (before.lineId && after.lineId && before.lineId !== after.lineId && before.lineTitle && after.lineTitle) {
      showHandoff(before.lineTitle, after.lineTitle);
    }
```

In `draw`, render it. Add before `const feedbackMarkup = ...`:

```ts
    const handoffMarkup = handoff
      ? `<div class="line-handoff" role="status" aria-live="polite"><strong>Banked: ${escapeHtml(handoff.banked)}</strong><span>Next up: ${escapeHtml(handoff.next)}</span></div>`
      : '';
```

and insert `${handoffMarkup}` immediately before `${feedbackMarkup}` in the `app.innerHTML` template.

Finally, clear the timer when leaving. In `leavePractice` and `proceedAfterLesson`, after `leaving = true;`, add:

```ts
    if (handoffTimer !== null) window.clearTimeout(handoffTimer);
```

- [ ] **Step 3: Add the styles**

Append to `src/style.css`:

```css
.line-handoff {
  display: flex;
  flex-direction: column;
  gap: .15rem;
  padding: .75rem 1rem;
  margin: .75rem 0;
  border-left: 3px solid currentColor;
  opacity: .9;
}

.line-handoff span {
  opacity: .75;
}
```

- [ ] **Step 4: Verify**

Run: `bunx tsc --noEmit`
Expected: PASS.

Run: `bun run dev`. Bank the first line of a Beginner lesson and confirm the handoff names both lines, the board shows the next line's opening position, and the notice clears itself after about 1.6 seconds.

- [ ] **Step 5: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "feat: name the line handoff and settle opponent replies"
```

---

### Task 10: Lesson summary panel

**Files:**
- Modify: `src/main.ts` (`draw`'s completion branch, plus a review action binding)
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `LessonRunner.summary()` from Task 6, `courseMastery` from Task 3, `duePositionIds` from Task 1.
- Produces: no new exports. This is the last behavioural task.

- [ ] **Step 1: Capture mastery at session start**

Add the import alongside the others at the top of `src/main.ts`:

```ts
import { courseMastery } from './mastery';
```

Next to the other `startPractice` locals, add:

```ts
  const masteryBefore = courseMastery(course, progress);
```

- [ ] **Step 2: Render the summary**

In `draw`, replace the `lessonComplete` branch of `feedbackMarkup` (line 315):

```ts
      ? `<div class="feedback feedback-complete" role="status" aria-live="polite"><strong>${completionMessage}</strong></div>`
```

with:

```ts
      ? (() => {
          const summary = session.summary();
          const masteryAfter = courseMastery(course, session.progressFor(level));
          const minutes = Math.max(1, Math.round(summary.elapsedMs / 60000));
          const missedMarkup = summary.missed.length
            ? `<ul class="summary-missed">${summary.missed.map((entry) => `<li><strong>${escapeHtml(entry.expectedSan)}</strong><span>${escapeHtml(entry.lineTitle)}</span></li>`).join('')}</ul>`
            : '<p class="summary-clean">Nothing missed. Nothing queued for review.</p>';
          return `<div class="summary-panel" role="status" aria-live="polite"><strong>${escapeHtml(completionMessage)}</strong><dl class="summary-stats"><div><dt>Lines banked</dt><dd>${summary.bankedLines.length}</dd></div><div><dt>Hints used</dt><dd>${summary.hints}</dd></div><div><dt>Time</dt><dd>${minutes} min</dd></div><div><dt>Course mastery</dt><dd>${Math.round(masteryBefore.ratio * 100)}% &rarr; ${Math.round(masteryAfter.ratio * 100)}%</dd></div></dl><h2 class="summary-heading">To review</h2>${missedMarkup}</div>`;
        })()
```

- [ ] **Step 3: Add the review action**

Immediately *before* the `const canHint = ...` line added in Task 8, insert:

```ts
    const dueAfterLesson = lessonComplete
      ? duePositionIds(session.progressFor(level).positions, lesson.positions.map((entry) => entry.id))
      : [];
    const reviewNowMarkup = dueAfterLesson.length
      ? `<button id="review-now" class="quiet-button">Review ${dueAfterLesson.length} position${dueAfterLesson.length === 1 ? '' : 's'}</button>`
      : '';
```

Then change the `lessonComplete` branch of `actionMarkup` to append the new button:

```ts
      ? `<button id="proceed"${saveError ? ' disabled' : ''}>Proceed</button>${reviewNowMarkup}`
```

Add the binding next to `#proceed`:

```ts
    document.querySelector('#review-now')?.addEventListener('click', () => void (async () => {
      if (leaving) return;
      leaving = true;
      if (handoffTimer !== null) window.clearTimeout(handoffTimer);
      try {
        await pendingSave;
        await startPractice(course, level, liveProgress, dueAfterLesson);
      } catch {
        leaving = false;
        saveError = true;
        draw();
      }
    })());
```

- [ ] **Step 4: Add the styles**

Append to `src/style.css`:

```css
.summary-panel {
  display: flex;
  flex-direction: column;
  gap: .75rem;
  padding: 1rem 1.25rem;
  margin: .75rem 0;
  border: 1px solid currentColor;
  border-radius: .5rem;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: .5rem 1rem;
  margin: 0;
}

.summary-stats dt {
  font-size: .75rem;
  letter-spacing: .05em;
  text-transform: uppercase;
  opacity: .65;
}

.summary-stats dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

.summary-heading {
  margin: 0;
  font-size: .8rem;
  letter-spacing: .05em;
  text-transform: uppercase;
  opacity: .65;
}

.summary-missed {
  display: flex;
  flex-direction: column;
  gap: .25rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.summary-missed li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.summary-missed span {
  opacity: .7;
}

@media (max-width: 640px) {
  .summary-stats {
    grid-template-columns: minmax(0, 1fr);
  }
}
```

- [ ] **Step 5: Verify**

Run: `bunx tsc --noEmit`
Expected: PASS.

Run: `bun run test:emulators`
Expected: PASS, zero failures.

Run: `bun run build`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/style.css
git commit -m "feat: summarise the lesson at completion"
```

---

### Task 11: Browser verification

**Files:**
- Create: `test/browser/learning-engine.spec.ts`

**Interfaces:**
- Consumes: the finished app, plus the existing helpers in `test/browser/emulator.ts` and `test/browser/auth-bridge.ts`.
- Produces: the regression net for the whole project.

Follow the structure of `test/browser/targeted-ui-repair.spec.ts` for sign-in and emulator setup — read that file first and reuse its helpers rather than inventing new ones.

- [ ] **Step 1: Write the spec**

Create `test/browser/learning-engine.spec.ts` covering, at both 1440x1000 and 390x844:

1. A Beginner line shows the guide arrow during the teach pass, then restarts the same line with no arrow and the eyebrow reading "Recall".
2. "Show me" is absent during teach, present during recall, reveals the arrow, and leaves both budget slots unspent.
3. One wrong move fills one budget slot and the line still banks.
4. Two wrong moves in one recall pass return the board to the line's first move with both slots cleared, without replaying the teach pass.
5. Banking a line shows the handoff naming both lines and resets the board to the next line's opening position, and the next line's first move is immediately draggable.
6. Completing every line shows the summary panel with lines banked, hints, time, and the mastery change.
7. The "Review" button appears only when a position is due.
8. Reviewing a due position twice cleanly removes it from the dashboard's review link; reviewing once does not.
9. Proceed still routes Beginner to Intermediate.

Mirror the existing spec's approach for driving moves — use its board-square click helper rather than raw coordinates.

- [ ] **Step 2: Run the browser suite**

Run: `bun run test:browser`
Expected: PASS for the new spec and for `test/browser/emulator-matrix.spec.ts`.

`test/browser/targeted-ui-repair.spec.ts` will have failures where it asserts the old behaviour — specifically any assertion that the guide arrow is visible on a first pass, or that a mistake produces a "Replay this line" button. Update those assertions to the new rules rather than deleting the tests; its click-to-move, drag, scroll, responsive, and Proceed coverage must all keep passing.

- [ ] **Step 3: Run the whole gate**

Run: `bun run test:emulators`
Expected: PASS.

Run: `bun run release:check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: verify the teach and recall engine in the browser"
```

---

## Done

Verify before declaring completion:

- `bun run test:emulators` passes with zero failures.
- `bun run test:browser` passes.
- `bun run release:check` passes.
- `src/practice-session.ts` and `src/progress-state.ts` no longer exist.
- A learner who misses a position, then reviews it correctly twice, sees the dashboard review count fall.
