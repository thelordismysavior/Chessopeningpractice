# 01 — Canonical Line Preview entry and manual walkthrough

**What to build:** Replace the text-only concept preview and separate Study walker with one
progress-neutral Line Preview. A learner browsing any line should reach the same board-led,
manually controlled walkthrough with its teaching context intact, while Course continues to send
trainable lines directly to practice and reference lines to Line Preview.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Selecting an untouched, banked, mastered, or reference line from Browse opens the canonical Line Preview rather than practice, a text-only move list, or a separately named Study walker.
- [ ] Selecting a trainable line from Course continues to start practice directly with the selected Course, level, and line.
- [ ] Selecting a reference line from Course opens Line Preview and never starts practice.
- [ ] Line Preview retains the selected line's summary and its level's lesson idea, including the anchor, opponent trigger, and resulting plan.
- [ ] The current authored position is rendered on a board oriented to the learner's side with its move guide and authored explanation visible.
- [ ] Line Preview does not autoplay; the current position changes only after the learner uses its visible controls or supported arrow keys.
- [ ] Previous and Next navigate the authored prompts in order, Left and Right provide equivalent keyboard navigation, and Previous is disabled at the first prompt.
- [ ] Returning from Line Preview restores Browse in the expected repertoire context.
- [ ] Line Preview never records attempts, hints, misses, corrects, banking, mastery, practice time, or review scheduling for any line role.
- [ ] The board and Eval Bar retain their in-place rendering boundary while prompts change, preserving board identity and avoiding whole-screen replacement during board updates.
- [ ] An engine result belonging to an older prompt or a departed Line Preview cannot repaint the current prompt, Browse, or practice.
- [ ] Engine unavailability leaves the complete Line Preview usable and explains that evaluation is unavailable.
- [ ] High-level browser coverage proves the entry rules, visible teaching context, manual navigation, progress neutrality, persistent-board behavior, and stale-evaluation protection through learner-visible behavior.

