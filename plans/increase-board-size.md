# Increase the board size in the board-led view

## Context

The requested screen is Line Preview at `#/browse/jobava-london/beginner-main`. Its right-hand board column is capped at `520px` and `44vw` in `src/style.css`. In the supplied desktop capture, the board is noticeably smaller than the lesson area despite being the main interaction.

Increase the board's desktop presence without horizontal overflow, unreadably narrowing the lesson copy, or changing the stacked mobile layout.

## Approach

Increase Line Preview's existing board-column limit from `min(44vw, 520px)` to `min(48vw, 580px)`, and raise the panel's matching `max-width` to `580px`. This gives the board more weight at the supplied viewport while still letting the grid shrink it when space is tight.

Keep the board renderer and screen markup unchanged because the board already fills its panel and preserves a square aspect ratio. Retain the current single-column layout below `700px`.

## Files to modify

- `src/style.css` - increase the Line Preview board-column and panel limits.
- `test/browser/line-preview-responsive.spec.ts` - update the desktop geometry expectation and retain tablet, mobile, Eval Bar, control-containment, and overflow checks.

## Reuse

- `.board { aspect-ratio: 1; }` in `src/style.css` already keeps the board square.
- `.line-preview-layout` and `.line-preview-layout > .board-panel` already define Line Preview sizing and its mobile breakpoint.
- The existing `@media (max-width: 699px)` rule already stacks Line Preview copy above the board on mobile.
- `expectNoOverflow` in `test/browser/app-stubs.ts` already checks horizontal containment.

## Steps

- [x] Increase only Line Preview's desktop board-column and panel limits, leaving shared board rendering untouched.
- [x] Update the Line Preview browser geometry assertion to prove the board can grow beyond the old `520px` cap and remains contained.
- [x] Check desktop, tablet, and mobile layouts for overlap and overflow.

## Verification

- Run the focused Playwright spec for the confirmed view.
- Run `bun run build`.
- Manually inspect the confirmed view at `1440x1000`, its breakpoint boundary, and `390x844`.
- Confirm the board remains square, the Eval Bar matches its width, adjacent content remains readable, and no horizontal scrollbar appears.
