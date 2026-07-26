# 03 — Black repertoire practice

**What to build:** Extend the completed practice experience to Black by adding the Classical Sicilian and Classical Caro-Kann courses. The owner can select either course, practice all three levels, receive the same move feedback, and retain synchronized progress.

**Blocked by:** 02 — White repertoire practice

**Status:** ready-for-agent

- [x] The Classical Sicilian course uses the agreed Black core line, three levels, original explanations, and roughly 8–12 positions per lesson.
- [x] The Classical Caro-Kann course uses the agreed Black core line, three levels, original explanations, and roughly 8–12 positions per lesson.
- [x] The board clearly identifies Black-side practice and presents positions from Black’s perspective where appropriate.
- [x] Both Black courses use the established exact-move, correction, retry, ordered-first-pass, review, and sequential-unlock behavior.
- [x] The dashboard shows both Black courses with side, progress, and next available lesson.
- [x] Black-course completion, attempts, missed positions, unlocks, and review state persist to the owner’s Firestore data.
- [x] Course-content validation covers the expected side, core line, valid positions, expected moves, and explanations for both courses.

## Comments

- Implemented in `src/courses.ts`, `src/main.ts`, `src/firebase.ts`, and `src/style.css`; added Black course and practice-session coverage.
- Focused verification passed: 13 tests. `npm run build` and `npm run release:check` passed.
