# 02 — White repertoire practice

**What to build:** The first complete practice path for White: the owner signs in, selects Jobava London or London System, studies a fixed three-level course, plays the expected moves on a touch-friendly board, receives correction and retry feedback, and sees progress saved to Firestore.

**Blocked by:** 01 — Private app foundation

**Status:** ready-for-agent

- [x] The practice-session boundary validates legal moves and distinguishes the exact curated repertoire move from other legal moves.
- [x] Correct moves advance the drill and incorrect moves show the expected move and explanation before requiring a retry.
- [x] First-pass positions are presented in course order; missed and completed positions are available for later review.
- [x] A lesson completes only after a clean drill run, and completion/unlock state is persisted.
- [x] Beginner, Intermediate, and Advanced levels unlock sequentially.
- [x] The Jobava London course contains the agreed White core line, three levels, explanations, and roughly 8–12 positions per lesson.
- [x] The London System course contains the agreed White core line, three levels, explanations, and roughly 8–12 positions per lesson.
- [x] The dashboard shows both White courses with side, progress, and next available lesson.
- [x] Progress survives reload and is stored in the authenticated owner’s Firestore data.
- [x] Practice-session and course-content behavior is tested at the practice-session seam without depending on DOM structure or Firebase SDK calls.

## Comments

- Implementation verified in `src/courses.ts`, `src/practice-session.ts`, `src/progress-state.ts`, `src/progress.ts`, `src/main.ts`, and the focused seam tests.
- Focused verification passed: 3 test files, 9 tests. `npm run build` passed.
- Emulator-backed tests remain environment-blocked because the local Firestore emulator exits with the installed Java runtime; no application failure was observed.
