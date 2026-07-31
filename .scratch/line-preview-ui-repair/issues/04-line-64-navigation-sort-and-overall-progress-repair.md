# 04 — LINE/64 navigation, Sort, and Overall Progress repair

**What to build:** Restore the intended LINE/64 hierarchy around primary navigation, Course sorting,
and Overall Progress. Navigation should read as quiet text with an accessible current-page state,
Sort should have one clear control boundary, and progress should remain legible without collisions.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Primary navigation destinations render as quiet text links without pill-shaped backgrounds in their default, hover, focus, or current-page states.
- [ ] Default navigation destinations use the muted text color, while hover, focus, and current-page destinations use the foreground color.
- [ ] The current top-level destination is marked semantically as the current page wherever that destination appears in primary navigation.
- [ ] Current-page state follows the active route rather than hover, focus, or a stale prior screen.
- [ ] Navigation remains readable, non-wrapping, and free of collisions at 1440×1000, 768×1024, 390×844, and the 320px minimum width.
- [ ] Course sorting presents a separate muted “Sort by” label associated with exactly one select.
- [ ] The Sort select has one visible bordered boundary, remains compact on desktop, and uses the available width on narrow screens.
- [ ] Every existing sort option remains selectable and retains its current ordering behavior.
- [ ] Overall Progress places its muted label above the large percentage with deliberate spacing and no overlap.
- [ ] The banked count and progress bar remain grouped below the percentage and retain accurate values and progress semantics.
- [ ] Overall Progress remains legible without overlap, clipping, or horizontal overflow at every agreed viewport.
- [ ] All treatments reuse the established LINE/64 tokens, typography, focus outline, and visual contract rather than introducing a new component style.
- [ ] High-level browser coverage proves current-page semantics, visible navigation states, the single-boundary Sort control and behavior, non-overlapping progress geometry, and the agreed responsive matrix.
