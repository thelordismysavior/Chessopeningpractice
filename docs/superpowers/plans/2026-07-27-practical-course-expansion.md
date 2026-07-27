# Practical Course Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the four opening courses from 36 to 72 practical lines without renaming existing progress IDs.

**Architecture:** Keep `src/courses.ts` as the single local course catalog. Add an optional explicit draft ID so repeated `alternative` kinds can coexist while legacy IDs keep their current form. Existing screens and practice logic continue consuming `lesson.variations`.

**Tech Stack:** TypeScript, Vite, Vitest, chess.js, Playwright, bundled Stockfish

## Global Constraints

- Preserve all existing course, variation, and practice-position IDs.
- Add practical opponent replies according to opening breadth, not equal quotas.
- Keep `main`, `alternative`, and `punish`; do not add a new visible category.
- Keep every move legal and every learner move explained.
- Add no dependency, remote runtime service, course, level, or UI redesign.
- Use original prose and local course data.
- Final catalog: Jobava 15 lines, London 16, Sicilian 20, Caro-Kann 21, total 72.

## File Map

- Modify `src/courses.ts`: explicit IDs and all new course content.
- Modify `test/course-content.test.ts`: flexible multi-alternative contract, exact new branch coverage, ID and legality checks.
- Modify `test/mastery.test.ts`: new total-line denominator.
- Modify `test/browser/surfaces.spec.ts`: new browse-row and mastery expectations.
- No new production files.

---

### Task 1: Make variation IDs flexible without changing legacy IDs

**Files:**
- Modify: `test/course-content.test.ts`
- Modify: `src/courses.ts:57-105`

**Interfaces:**
- Consumes: existing `VariationDraft`, `lesson()`, and `Variation.id`.
- Produces: `VariationDraft.id?: string`; generated ID `${level}-${draft.id ?? draft.kind}`.

- [ ] **Step 1: Write the failing compatibility test**

Replace the fixed three-line assertions with:

```ts
const REQUIRED_KINDS: VariationKind[] = ['main', 'alternative', 'punish'];

for (const level of LEVELS) {
  const lesson = course.lessons[level];
  expect(new Set(lesson.variations.map(({ kind }) => kind))).toEqual(new Set(REQUIRED_KINDS));
  expect(lesson.positions).toEqual(lesson.variations.flatMap(({ positions }) => positions));

  for (const variation of lesson.variations) {
    expect(variation.id.startsWith(`${level}-`)).toBe(true);
  }
}
```

Add a temporary assertion requiring `beginner-meet-g6` in the Jobava beginner lesson:

```ts
expect(COURSES[0].lessons.beginner.variations.map(({ id }) => id))
  .toContain('beginner-meet-g6');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run test/course-content.test.ts`

Expected: FAIL because `beginner-meet-g6` does not exist.

- [ ] **Step 3: Add the minimum explicit-ID support**

```ts
type VariationDraft = {
  id?: string;
  kind: VariationKind;
  title: string;
  summary: string;
  evalCp: number;
  moves: string[];
  explanations: string[];
};

function lesson(...) {
  const variations = drafts.map((draft) => {
    const id = `${level}-${draft.id ?? draft.kind}`;
    return {
      id,
      kind: draft.kind,
      title: draft.title,
      summary: draft.summary,
      evalCp: draft.evalCp,
      positions: positionLine(id, side, draft.moves, draft.explanations),
    };
  });
  // existing return shape
}
```

Do not add the branch yet. Re-run to confirm the test still fails for content, not schema or TypeScript errors.

- [ ] **Step 4: Commit the schema/test-contract change**

```powershell
git add -- src/courses.ts test/course-content.test.ts
git commit -m "refactor: allow stable practical variation ids"
```

---

### Task 2: Expand the Jobava London to 15 lines

**Files:**
- Modify: `test/course-content.test.ts`
- Modify: `src/courses.ts:111-267`

**Interfaces:**
- Consumes: `VariationDraft.id`.
- Produces: five variations in each Jobava level.

- [ ] **Step 1: Write the failing branch-coverage test**

```ts
expect(Object.fromEntries(LEVELS.map((level) => [
  level,
  COURSES[0].lessons[level].variations.map(({ id }) => id),
]))).toMatchObject({
  beginner: expect.arrayContaining(['beginner-meet-g6', 'beginner-meet-c5']),
  intermediate: expect.arrayContaining(['intermediate-meet-a6', 'intermediate-meet-g6']),
  advanced: expect.arrayContaining(['advanced-meet-c5', 'advanced-meet-g6']),
});
expect(LEVELS.map((level) => COURSES[0].lessons[level].variations.length)).toEqual([5, 5, 5]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run test/course-content.test.ts`

Expected: FAIL with missing Jobava IDs.

- [ ] **Step 3: Add these exact practical branches**

All are `kind: 'alternative'`. Use original explanations matching each White move.

| Level | ID | Title | Exact SAN sequence |
|---|---|---|---|
| Beginner | `meet-g6` | Meet 3...g6 | `d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nb5 Na6 Nf3 O-O Be2 c6 Nc3` |
| Beginner | `meet-c5` | Meet 3...c5 | `d4 d5 Nc3 Nf6 Bf4 c5 e3 Nc6 Nb5 e5 dxe5 Ne4 f3` |
| Intermediate | `meet-a6` | Meet 3...a6 | `d4 d5 Nc3 Nf6 Bf4 a6 e3 e6 Nf3 c5 Be2 Nc6 O-O` |
| Intermediate | `meet-g6` | Build against 3...g6 | `d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O Be2 c5 O-O` |
| Advanced | `meet-c5` | Take on the early ...c5 | `d4 d5 Nc3 Nf6 Bf4 c5 e4 cxd4 Nb5 Na6 Qxd4` |
| Advanced | `meet-g6` | Keep the centre against ...g6 | `d4 d5 Nc3 Nf6 Bf4 g6 e3 Bg7 Nf3 O-O h3 c5 dxc5 Qa5 Bd3` |

Use a bundled-engine terminal-position evaluation rounded to the nearest 5 centipawns for `evalCp`. Explain the opening purpose of every learner move, not the notation.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run test/course-content.test.ts`

Expected: PASS, including legality and consecutive-position checks.

- [ ] **Step 5: Commit**

```powershell
git add -- src/courses.ts test/course-content.test.ts
git commit -m "feat: add practical Jobava replies"
```

---

### Task 3: Expand the London System to 16 lines

**Files:**
- Modify: `test/course-content.test.ts`
- Modify: `src/courses.ts`

**Interfaces:**
- Consumes: explicit variation IDs from Task 1.
- Produces: five beginner, five intermediate, and six advanced London variations.

- [ ] **Step 1: Write the failing branch-coverage test**

```ts
const london = COURSES[1].lessons;
expect(london.beginner.variations.map(({ id }) => id))
  .toEqual(expect.arrayContaining(['beginner-meet-g6', 'beginner-meet-c6']));
expect(london.intermediate.variations.map(({ id }) => id))
  .toEqual(expect.arrayContaining(['intermediate-meet-bf5', 'intermediate-meet-nh5']));
expect(london.advanced.variations.map(({ id }) => id))
  .toEqual(expect.arrayContaining(['advanced-poisoned-pawn', 'advanced-meet-g6', 'advanced-meet-c6']));
expect(LEVELS.map((level) => london[level].variations.length)).toEqual([5, 5, 6]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run test/course-content.test.ts`

Expected: FAIL with missing London IDs.

- [ ] **Step 3: Add these exact practical branches**

| Level | ID | Title | Exact SAN sequence |
|---|---|---|---|
| Beginner | `meet-g6` | Meet the kingside fianchetto | `d4 d5 Nf3 Nf6 Bf4 g6 e3 Bg7 h3 O-O Be2 c5 O-O` |
| Beginner | `meet-c6` | Meet the Slav setup | `d4 d5 Nf3 Nf6 Bf4 c6 e3 Bf5 Bd3 e6 O-O` |
| Intermediate | `meet-bf5` | Challenge ...Bf5 | `d4 d5 Nf3 Nf6 Bf4 Bf5 c4 e6 Nc3 c6 e3` |
| Intermediate | `meet-nh5` | Save the bishop from ...Nh5 | `d4 d5 Nf3 Nf6 Bf4 Nh5 Bg5 h6 Bh4 g5 Bg3` |
| Advanced | `poisoned-pawn` | Punish the poisoned-pawn grab | `d4 d5 Nf3 Nf6 Bf4 c5 e3 Qb6 Nc3 Qxb2 Nb5 Na6 Rb1` |
| Advanced | `meet-g6` | Play against ...g6 and ...Bg7 | `d4 d5 Nf3 Nf6 Bf4 g6 e3 Bg7 h3 O-O Be2 c5 O-O` |
| Advanced | `meet-c6` | Break the Slav-style shell | `d4 d5 Nf3 Nf6 Bf4 c6 e3 Bf5 c4 e6 Nc3 Nbd7 Be2` |

All are `alternative` except `poisoned-pawn`, which is `punish`. Add one explanation per White move and engine-derived `evalCp`.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run test/course-content.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/courses.ts test/course-content.test.ts
git commit -m "feat: add practical London replies"
```

---

### Task 4: Expand the Classical Sicilian to 20 lines

**Files:**
- Modify: `test/course-content.test.ts`
- Modify: `src/courses.ts`

**Interfaces:**
- Consumes: Black-side `positionLine()` behavior.
- Produces: six beginner, seven intermediate, and seven advanced Sicilian variations.

- [ ] **Step 1: Write the failing coverage test**

Require these IDs and counts:

```ts
const sicilian = COURSES[2].lessons;
expect(sicilian.beginner.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'beginner-alapin', 'beginner-closed', 'beginner-smith-morra',
]));
expect(sicilian.intermediate.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'intermediate-grand-prix', 'intermediate-delayed-alapin',
  'intermediate-anti-sveshnikov', 'intermediate-smith-morra-accepted',
]));
expect(sicilian.advanced.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'advanced-richter-rauzer', 'advanced-sozin',
  'advanced-classical-be2', 'advanced-closed-fianchetto',
]));
expect(LEVELS.map((level) => sicilian[level].variations.length)).toEqual([6, 7, 7]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run test/course-content.test.ts`

Expected: FAIL with missing Sicilian IDs.

- [ ] **Step 3: Add the exact Anti-Sicilian and Open Sicilian branches**

| Level | ID | Title | Exact SAN sequence |
|---|---|---|---|
| Beginner | `alapin` | Meet the Alapin | `e4 c5 c3 d5 exd5 Qxd5 d4 Nc6 Nf3 Nf6 Be2 cxd4 cxd4 Bf5` |
| Beginner | `closed` | Meet the Closed Sicilian | `e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6` |
| Beginner | `smith-morra` | Accept the Smith-Morra | `e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 d6 Bc4 Nf6` |
| Intermediate | `grand-prix` | Meet the Grand Prix | `e4 c5 Nc3 Nc6 f4 g6 Nf3 Bg7 Bb5 Nd4 O-O e6` |
| Intermediate | `delayed-alapin` | Meet the delayed Alapin | `e4 c5 Nf3 Nc6 c3 Nf6 e5 Nd5 d4 cxd4 cxd4 d6` |
| Intermediate | `anti-sveshnikov` | Meet 3.Nc3 | `e4 c5 Nf3 Nc6 Nc3 e5 Bc4 Be7 d3 d6 O-O Nf6` |
| Intermediate | `smith-morra-accepted` | Develop against the accepted Morra | `e4 c5 d4 cxd4 c3 dxc3 Nxc3 Nc6 Nf3 e6 Bc4 Qc7 O-O Nf6` |
| Advanced | `richter-rauzer` | Meet the Richter-Rauzer | `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bg5 e6 Qd2 Be7 O-O-O O-O` |
| Advanced | `sozin` | Meet the Sozin setup | `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Bc4 e6 Bb3 Be7 O-O O-O` |
| Advanced | `classical-be2` | Meet the Classical bishop setup | `e4 c5 Nf3 Nc6 d4 cxd4 Nxd4 Nf6 Nc3 d6 Be2 e5 Nb3 Be7 O-O O-O` |
| Advanced | `closed-fianchetto` | Counter the Closed fianchetto | `e4 c5 Nc3 Nc6 g3 g6 Bg2 Bg7 d3 d6 f4 e6 Nf3 Nge7 O-O O-O` |

Use `alternative` for all except no new `punish` line is required. Explanations describe Black's central break, development, or queenside counterplay.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run test/course-content.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/courses.ts test/course-content.test.ts
git commit -m "feat: cover practical Sicilian sidelines"
```

---

### Task 5: Expand the Classical Caro-Kann to 21 lines

**Files:**
- Modify: `test/course-content.test.ts`
- Modify: `src/courses.ts`

**Interfaces:**
- Consumes: Black-side variation generation.
- Produces: seven variations in every Caro-Kann level.

- [ ] **Step 1: Write the failing coverage test**

```ts
const caro = COURSES[3].lessons;
expect(caro.beginner.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'beginner-advance', 'beginner-two-knights', 'beginner-fantasy', 'beginner-hillbilly',
]));
expect(caro.intermediate.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'intermediate-panov', 'intermediate-advance-short',
  'intermediate-advance-tal', 'intermediate-fantasy',
]));
expect(caro.advanced.variations.map(({ id }) => id)).toEqual(expect.arrayContaining([
  'advanced-panov-main', 'advanced-advance-van-der-wiel',
  'advanced-classical-tartakower', 'advanced-two-knights-exchange',
]));
expect(LEVELS.map((level) => caro[level].variations.length)).toEqual([7, 7, 7]);
```

- [ ] **Step 2: Run and verify RED**

Run: `npx vitest run test/course-content.test.ts`

Expected: FAIL with missing Caro-Kann IDs.

- [ ] **Step 3: Add the exact practical branches**

| Level | ID | Title | Exact SAN sequence |
|---|---|---|---|
| Beginner | `advance` | Meet the Advance | `e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6` |
| Beginner | `two-knights` | Meet the Two Knights | `e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6` |
| Beginner | `fantasy` | Meet the Fantasy | `e4 c6 d4 d5 f3 e6 Nc3 Nf6 e5 Nfd7` |
| Beginner | `hillbilly` | Meet the Hillbilly bishop | `e4 c6 Bc4 d5 exd5 cxd5 Bb5+ Nc6 d4 Nf6` |
| Intermediate | `panov` | Meet the Panov | `e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4` |
| Intermediate | `advance-short` | Meet the Short Advance | `e4 c6 d4 d5 e5 Bf5 Nf3 e6 Be2 c5 O-O Nc6` |
| Intermediate | `advance-tal` | Meet the Tal Advance | `e4 c6 d4 d5 e5 Bf5 h4 h6 g4 Bd7` |
| Intermediate | `fantasy` | Break the Fantasy centre | `e4 c6 d4 d5 f3 e6 Nc3 Nf6 e5 Nfd7 f4 c5` |
| Advanced | `panov-main` | Play the Panov main line | `e4 c6 d4 d5 exd5 cxd5 c4 Nf6 Nc3 e6 Nf3 Bb4 cxd5 exd5 Bd3 O-O O-O Nc6` |
| Advanced | `advance-van-der-wiel` | Meet the Van der Wiel | `e4 c6 d4 d5 e5 Bf5 Nc3 e6 g4 Bg6 Nge2 c5 h4` |
| Advanced | `classical-tartakower` | Choose the Tartakower structure | `e4 c6 d4 d5 Nc3 dxe4 Nxe4 Nf6 Nxf6+ exf6 Nf3 Bd6 Bd3 O-O` |
| Advanced | `two-knights-exchange` | Simplify the Two Knights | `e4 c6 Nc3 d5 Nf3 Bg4 h3 Bxf3 Qxf3 e6 d4 Nf6 Bd3 dxe4 Nxe4` |

Use `alternative` for all. Add an explanation for every Black move and engine-derived `evalCp`.

- [ ] **Step 4: Run and verify GREEN**

Run: `npx vitest run test/course-content.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add -- src/courses.ts test/course-content.test.ts
git commit -m "feat: cover practical Caro-Kann sidelines"
```

---

### Task 6: Update totals and verify every consumer

**Files:**
- Modify: `test/mastery.test.ts:40-60`
- Modify: `test/browser/surfaces.spec.ts:110-205`
- Test: full unit and browser suites

**Interfaces:**
- Consumes: final 72-line `COURSES` catalog.
- Produces: assertions matching derived mastery and browse totals.

- [ ] **Step 1: Write the failing total assertions**

In `test/mastery.test.ts`, replace `36` with `72` in total and ratio expectations:

```ts
expect(summary.total).toBe(72);
expect(summary.ratio).toBeCloseTo(1 / 72);
```

In `test/browser/surfaces.spec.ts`, replace the browse count with:

```ts
await expect(page.locator('.browse-row')).toHaveCount(72);
```

Replace the seeded single-line mastery percentage with:

```ts
await expect(page.locator('.mastery-figure strong')).toHaveText(`${Math.round(1 / 72 * 100)}%`);
```

- [ ] **Step 2: Run focused tests**

Run:

```powershell
npx vitest run test/course-content.test.ts test/mastery.test.ts
```

Expected: PASS after Tasks 1-5. If the browser assertion cannot run without emulators, leave it for Step 5.

- [ ] **Step 3: Run all unit tests**

Run: `npm test`

Expected: all unit tests pass with zero failures.

- [ ] **Step 4: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite exit 0.

- [ ] **Step 5: Run browser verification**

Run: `npm run test:browser -- test/browser/surfaces.spec.ts`

Expected: dashboard opens, course rows render, browse shows 72 lines, and an added line opens in the walker.

- [ ] **Step 6: Inspect the final diff and content**

Run:

```powershell
git diff --check
git diff --stat HEAD~5
```

Confirm:

- Existing IDs remain unchanged.
- New IDs are unique.
- Course totals are 15, 16, 20, and 21.
- No production file besides `src/courses.ts` changed.
- No dependency was added.

- [ ] **Step 7: Commit verification updates**

```powershell
git add -- test/mastery.test.ts test/browser/surfaces.spec.ts
git commit -m "test: update expanded repertoire totals"
```
