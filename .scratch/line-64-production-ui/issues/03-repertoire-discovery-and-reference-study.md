# 03 — Repertoire discovery and reference Study

**What to build:** Let the learner understand and navigate the complete real repertoire through distinct Course, Lines, and Browse surfaces, with honest content roles, guided recommendations, direct access, and progress-neutral reference Study.

**Blocked by:** 02 — Timed review, preferences, and learner management.

**Status:** ready-for-human

- [x] Course presents one opening’s promise, side, lesson idea, levels, named lines, roles, states, and preview actions.
- [x] Lines presents a short cross-course selection of due, banked, and next material.
- [x] Browse searches the exhaustive real repertoire and provides an explicit no-match state.
- [x] Existing main lines are labeled core; existing alternative and punish lines remain trainable.
- [x] Only the handoff-equivalent London early `...c5` and Sicilian `Bb5` lines are classified as reference.
- [x] Reference lines remain visible and open in Study with moves and explanations shown.
- [x] Study does not score attempts, bank lines, change mastery, or create scheduled reviews.
- [x] Every level remains directly accessible; prior Beginner → Intermediate → Advanced locks become recommendations rather than blockers.
- [x] Recommended order is due trainable lines; untouched core, alternative, and punish lines by level; banked or mastered lines; then references, with stable alphabetical ties.
- [x] Level, category, status, and name sorts operate on real data.
- [x] Twelve course-level lesson ideas provide an anchor position, plan, opponent trigger, and resulting plan.
- [x] Lesson ideas use only bundled positions, summaries, variations, and authored explanations; no unsupported statistics or engine-derived plans are introduced.
- [x] An untouched line opened directly shows its lesson idea and move preview before one Start lesson action.
- [x] Notation, line names, roles, levels, and statuses remain readable without truncation on narrow screens.
- [x] Mastery and Queue calculations exclude reference lines and remain accurate for all trainable roles.
- [x] Unit coverage proves role filtering, mastery exclusion, recommendation order, and progress-neutral Study.
- [x] Stubbed browser coverage proves Course, Lines, Browse search, direct unlocked access, previews, and reference Study behavior.

## Comments

- Implemented in `30eee05`, with fixes in `15efb0e` and `c5259cc`.
- Verified: build, 156 unit tests, and 18 stubbed browser tests.

