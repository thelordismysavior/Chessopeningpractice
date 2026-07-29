# 06 — First-bank branch review and Result

**What to build:** Close the focused learning loop by asking one meaningful branch-recognition question when a core line is first banked, then showing a restorable Result with one unambiguous next action.

**Blocked by:** 05 — Escalating hints and targeted recovery.

**Status:** ready-for-agent

- [ ] First banking a core line starts exactly one branch-point review before Result.
- [ ] The question uses the first trainable alternative’s actual divergence position.
- [ ] The branch prompt names the opponent trigger and asks for the resulting plan or move.
- [ ] Branch review uses normal scoring, authored explanation, retry, assistance, and scheduling behavior.
- [ ] A branch outcome persists like any other completed position outcome.
- [ ] Later direct recalls of the same core line do not repeat the special first-bank branch review.
- [ ] Non-core lines do not trigger first-bank branch review.
- [ ] Result is an addressable hash route containing Settled Score, mistakes, line state, relevant branch summary, and authored correction.
- [ ] The latest Result summary survives refresh in the current tab through session-scoped storage.
- [ ] Opening Result without a current summary redirects safely to Home.
- [ ] Result presents exactly one next action.
- [ ] Next-action priority is Continue when trainable material remains, Review due positions when review is actionable, then Return home.
- [ ] No transfer-game action or incomplete destination appears.
- [ ] Browser Back and the Result action preserve saved progress and route predictably.
- [ ] Unit coverage proves first-bank eligibility, divergence selection, one-time behavior, and next-action priority.
- [ ] Stubbed-browser coverage proves the complete core-line → branch review → Result → next-action journey and Result refresh restoration.

