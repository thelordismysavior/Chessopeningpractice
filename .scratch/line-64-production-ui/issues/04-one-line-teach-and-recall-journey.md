# 04 — One-line Teach and Recall journey

**What to build:** Turn Practice into the focused LINE/64 loop for one selected line: understand the concept, learn with guidance, recall without it, receive authored correction, save each settled outcome, and bank automatically.

**Blocked by:** 02 — Timed review, preferences, and learner management; 03 — Repertoire discovery and reference Study.

**Status:** complete

- [x] Home Continue, Course Start lesson, and trainable line rows enter a single selected line rather than an entire level.
- [x] Untouched lines show concept entry, then run Teach followed by Recall.
- [x] Banked or mastered lines opened directly run Recall without repeating Teach.
- [x] Queue entry runs Review only for positions currently due.
- [x] Teach shows the route guide and does not contribute scored accuracy.
- [x] Recall and Review hide guidance until requested.
- [x] The board remains the largest element, square, uncropped, centered, and attached to the Eval Bar across supported layouts.
- [x] All 64 squares remain persistent, accessible real buttons with delegated tap, drag, selection, focus, animation, and cleanup behavior.
- [x] Only Board and Eval Bar update in place; other visible practice regions follow the existing rendering boundary.
- [x] Move Animation, Move Beat, Tempo Cut, reduced motion, streaming evaluation, captures, castling, and reply settlement retain existing behavior.
- [x] Active-practice Settings opens as a modal without discarding the line.
- [x] Illegal moves give local unscored feedback.
- [x] A repertoire miss presents the authored “Why this move” explanation, expected move, and retry before secondary engine detail.
- [x] Move-cost analysis appears in a collapsed Engine note and never blocks retry.
- [x] Every completed position outcome persists immediately; save failure is visible and retryable.
- [x] Exiting mid-line leaves the line unbanked while retaining saved position history.
- [x] Reopening an incomplete line starts that line from its beginning.
- [x] Successful completion banks automatically without a redundant Bank line action.
- [x] Practice uses no toast, confetti, streak, badge, glow, gradient, or celebratory animation.
- [x] Unit and stubbed-browser coverage proves phase selection, one-line scope, authored feedback, immediate persistence, automatic banking, and Board/Eval Bar continuity.

## Comments

Implemented selected-line Teach/Recall routing, direct Recall for banked lines, strict Recall/Review guide disclosure, authored correction with collapsed Engine detail, and persistent Board/Eval Bar nodes. Verified with 156 unit tests, build, and 50 stubbed browser tests.

