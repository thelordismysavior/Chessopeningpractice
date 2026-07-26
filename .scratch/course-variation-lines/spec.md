# Course variation lines

Status: shipped

Each course level today teaches a single linear line. A learner who drills it never meets any opponent reply except the one baked into that line, so the repertoire collapses the moment the opponent deviates. This feature adds two more lines to every lesson — the opponent's second-best try and a common mistake with its refutation — so practice covers the range from the opponent's best response down to his worst, and the learner reaches a middlegame that is at worst equal and at best clearly better.

## Language

Two terms enter the domain language and belong in `CONTEXT.md` when this ships:

**Variation**:
One continuous line of play within a lesson, from the starting position to a playable middlegame. A lesson holds three: the main line, the alternative, and the punish line.
_Avoid_: Branch, sub-line, path

**Banked variation**:
A variation the learner has finished without a mistake. Banking is per variation: a slip replays only that variation, and a lesson completes when all three are banked.
_Avoid_: Cleared, passed, mastered

## Data model

`Lesson` gains an ordered list of variations, and its existing flat `positions` array becomes their concatenation:

```ts
export type VariationKind = 'main' | 'alternative' | 'punish';

export type Variation = {
  id: string;            // `${level}-${kind}`, e.g. 'beginner-punish'
  kind: VariationKind;
  title: string;         // 'Punish 3...Bf5?!'
  summary: string;       // what the opponent tries and what you end up with
  evalCp: number;        // Stockfish 18 depth-22 eval of the final position, from the course side's perspective
  positions: PracticePosition[];
};

export type Lesson = {
  level: LevelKey;
  title: string;
  summary: string;
  variations: Variation[];
  positions: PracticePosition[];  // derived: variations concatenated in order
};
```

Keeping `positions` as a derived concatenation means `main.ts`, review selection, and `progress.ts` continue to work against it unchanged; a variation is a labelled slice of that array.

Position ids change from `${level}-${n}` to `${level}-${variationId}-${n}`. Ids already stored in Firestore progress therefore stop matching. This is accepted, not migrated: stale entries in `missedPositionIds` and `completedPositionIds` no longer resolve to a position and are dropped from the review queue, while `completedLevels` and `unlockedLevel` are unaffected, so no learner loses an unlocked level.

`evalCp` is authored data, not computed at runtime. It records what the engine said when the line was written.

## Content

All 12 lessons (4 courses x 3 levels) get three variations. Every variation of a lesson diverges at the same point: the opponent's 3rd or 4th move, where the character of the position is set.

| Kind | Opponent's choice | Length | Target evaluation |
| --- | --- | --- | --- |
| main | Best reply | 8-10 learner moves | within ±40cp |
| alternative | Respectable second choice needing a different plan | 4-5 learner moves | within ±40cp |
| punish | Common inaccuracy | 4-5 learner moves | +80cp or better for the learner |

The main line of each lesson starts from the line already in `courses.ts`, extended where it currently stops mid-development so it ends in a playable middlegame.

Levels are distinguished by depth, not by different branch points: beginner variations stop as soon as the advantage or equality is established, advanced variations continue into the resulting middlegame plan.

Worked example — Jobava London beginner, after `1.d4 d5 2.Nc3 Nf6 3.Bf4`:

| Variation | Opponent plays | Learner drills |
| --- | --- | --- |
| main | `3...e6` | `e3`, `Nb5` hitting c7, `Bd3`, castling |
| alternative | `3...c6` | `e3` and a queenside plan against the solid setup |
| punish | `3...Bf5?!` | `f3!` then `e4`, kicking the bishop and taking the centre |

Line selection is grounded in the sources already cited in `ATTRIBUTION_SOURCES`: Lichess chess-openings for naming and canonical move orders, Wikibooks for theory context. Explanations stay original and keep the existing one-sentence, plan-explaining style.

### Engine verification

Stockfish 18 Lite (WASM, the `stockfish` npm package) runs under Node on the development machine and returns depth-20 evaluations in about a second per position. It is used at authoring time only, from a scratch folder outside the repo: the package unpacks to 347 MB, which is too heavy to add to the project's install, and nothing about it ships in the app.

Every variation's final position is evaluated at depth 22 and the result checked in as `evalCp`. When a punish line does not reach +80cp, the line is replaced rather than the claim softened. If an existing main line evaluates worse than expected, that is reported rather than quietly rewritten.

## Session behaviour

`PracticeSession` keeps its current interface shape and continues to walk one flat position list, but it knows where the variation boundaries fall and tracks the clean run per variation:

- Finishing a variation with no mistakes banks it, and the session advances to the next variation.
- A mistake anywhere in a variation means that on reaching its last position, the session replays that variation from its first position. Variations already banked stay banked.
- The lesson completes when all three variations are banked. That is what sets `lessonComplete`, which marks the level complete and unlocks the next.

`SessionSnapshot` gains `variation`, `variationIndex`, and `bankedVariationIds`. The `needs-clean-run` status narrows in meaning from "replay this lesson" to "replay this line", so the existing restart affordance operates on a variation.

Review sessions are unchanged. A review already takes an arbitrary set of position ids and plays them in order, and a set of positions drawn from several variations needs no variation grouping.

## Interface

The lesson copy panel gains a line header above the existing lesson title, showing the variation title, `Line 2 of 3`, and the variation summary describing what the opponent has just tried. The position counter becomes per variation ("move 3 of 5") rather than an index into all 18 positions.

The board already renders from each position's FEN, so it snaps back to the branch point on its own when a new variation begins. No transition animation is added.

## Persistence

`CourseProgress` gains `completedVariationIds: string[]`, merged as a set in `saveProgress` exactly like the existing id lists, so banking survives quitting mid-lesson. The Firestore rules do not validate document fields, so `firestore.rules` needs no change.

## Testing

- `test/course-content.test.ts`: every lesson has exactly three variations, one of each kind; every variation's positions are legal, move on the correct side, and carry a non-empty explanation; per-variation position counts match the ranges above; `lesson.positions` equals the concatenation of the variations' positions; position ids are unique within a course.
- `test/practice-session.test.ts`: a clean variation banks; a mistake replays only that variation and leaves earlier banks intact; the lesson completes only when all three are banked; review mode is unaffected.
- `test/progress-state.test.ts`: `completedVariationIds` merges as a set, and level completion still requires the previous level.
- Evaluations are not re-verified in the test suite; `evalCp` is checked-in authoring data.

## Out of scope

- Random branch selection, where the app picks an opponent reply the learner must recognise. Variations are practised in a fixed order.
- Shipping an engine in the app, or any runtime evaluation.
- Migrating existing Firestore position ids.
- Adding variations to review sessions as a grouping concept.
