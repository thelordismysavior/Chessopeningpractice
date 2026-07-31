# 03 — Responsive Line Preview composition

**What to build:** Give Line Preview a deliberate responsive composition in which the lesson context
and board remain readable together. The board should be substantial without becoming excessively
zoomed in, and the full walkthrough should remain usable down to the minimum supported width.

**Blocked by:** 01 — Canonical Line Preview entry and manual walkthrough.

**Status:** ready-for-agent

- [ ] At 1440×1000 and 768×1024, Line Preview presents contextual copy and controls beside the board when sufficient width exists.
- [ ] On larger screens, the preview board is capped at approximately 520px and does not expand to fill the application shell.
- [ ] The Eval Bar remains attached horizontally above the board and follows the board's width.
- [ ] At 390×844 and the 320px minimum width, contextual copy precedes a board that fills only the available content width.
- [ ] The line summary, lesson idea, guide, explanation, move position, navigation controls, completion actions, and progress-neutral note remain readable and reachable at every agreed viewport.
- [ ] Previous, Next, Restart Preview, and Practice This Line do not collide, clip, or leave the viewport at narrow widths.
- [ ] Board pieces, the authored route guide, and board captions retain a clear visual hierarchy at every agreed viewport.
- [ ] Line Preview causes no document-level horizontal overflow at 1440×1000, 768×1024, 390×844, or 320px minimum width.
- [ ] Keyboard focus remains visible and does not become stranded when the layout changes or a preview completes.
- [ ] High-level browser coverage asserts board size and relative placement using rendered geometry, verifies the four-width overflow matrix, and exercises both a regular prompt and the completed preview state.

