# 02 — White repertoire practice

**What to build:** The first complete practice path for White: the owner signs in, selects Jobava London or London System, studies a fixed three-level course, plays the expected moves on a touch-friendly board, receives correction and retry feedback, and sees progress saved to Firestore.

**Blocked by:** 01 — Private app foundation

**Status:** ready-for-agent

- [ ] The practice-session boundary validates legal moves and distinguishes the exact curated repertoire move from other legal moves.
- [ ] Correct moves advance the drill and incorrect moves show the expected move and explanation before requiring a retry.
- [ ] First-pass positions are presented in course order; missed and completed positions are available for later review.
- [ ] A lesson completes only after a clean drill run, and completion/unlock state is persisted.
- [ ] Beginner, Intermediate, and Advanced levels unlock sequentially.
- [ ] The Jobava London course contains the agreed White core line, three levels, explanations, and roughly 8–12 positions per lesson.
- [ ] The London System course contains the agreed White core line, three levels, explanations, and roughly 8–12 positions per lesson.
- [ ] The dashboard shows both White courses with side, progress, and next available lesson.
- [ ] Progress survives reload and is stored in the authenticated owner’s Firestore data.
- [ ] Practice-session and course-content behavior is tested at the practice-session seam without depending on DOM structure or Firebase SDK calls.
