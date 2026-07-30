# 06 — First-bank branch review and Result

**What to build:** Close the focused learning loop by asking one meaningful branch-recognition question when a core line is first banked, then showing a restorable Result with one unambiguous next action.

**Blocked by:** 05 — Escalating hints and targeted recovery.

**Status:** complete

- [x] First banking a core line starts exactly one branch-point review before Result.
- [x] The question uses the first trainable alternative’s actual divergence position.
- [x] The branch prompt names the opponent trigger and asks for the resulting plan or move.
- [x] Branch review uses normal scoring, authored explanation, retry, assistance, and scheduling behavior.
- [x] A branch outcome persists like any other completed position outcome.
- [x] Later direct recalls of the same core line do not repeat the special first-bank branch review.
- [x] Non-core lines do not trigger first-bank branch review.
- [x] Result is an addressable hash route containing Settled Score, mistakes, line state, relevant branch summary, and authored correction.
- [x] The latest Result summary survives refresh in the current tab through session-scoped storage.
- [x] Opening Result without a current summary redirects safely to Home.
- [x] Result presents exactly one next action.
- [x] Next-action priority is Continue when trainable material remains, Review due positions when review is actionable, then Return home.
- [x] No transfer-game action or incomplete destination appears.
- [x] Browser Back and the Result action preserve saved progress and route predictably.
- [x] Unit coverage proves first-bank eligibility, divergence selection, one-time behavior, and next-action priority.
- [x] Stubbed-browser coverage proves the complete core-line → branch review → Result → next-action journey and Result refresh restoration.

## Comments

Implemented first-bank branch recognition, targeted recovery compatibility, session-scoped Result routing, next-action policy, and unit/stubbed-browser coverage. Verified with 164 unit tests, 52 stubbed browser tests, and the production build.

