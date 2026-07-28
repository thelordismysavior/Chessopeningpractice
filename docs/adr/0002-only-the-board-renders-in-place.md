# Only the board and Eval Bar render in place

Every screen in this app draws itself by assigning one template string to `app.innerHTML` and
rebinding its listeners afterwards. The board and Eval Bar are the two narrow exceptions. The
board's sixty-four square buttons are built once per position and mutated thereafter, with
delegated listeners bound to a persistent board element. The Eval Bar's fill and label mutate so
streamed engine scores can animate; replacing those nodes would prevent the CSS transition.

We split it that way because the board is the only part of the screen that redraws on input rather
than on state the learner can see changing. Selecting a piece changes one class on one button, but
under the old scheme it discarded and rebuilt the topbar, the lesson copy, the explanation, the
feedback panel, the mistake budget, the action buttons, the settings dialog, and all sixty-four
squares — then rebound every listener and restored keyboard focus through a `requestAnimationFrame`
hack, because the focused element had just been destroyed. On a phone that teardown is what stands
between a finger and a highlight.

The rest of the screen does not have either problem. The lesson copy changes when a line is banked,
the feedback panel changes once per move, the action buttons change at completion — all moments when
the learner is reading rather than tapping, and all cheap enough that a rebuild is invisible. The
alternative was to make every region update in place, which is writing a small rendering framework
by hand inside `practice.ts` and exposing all forty-five browser specs to it, in exchange for
milliseconds off a header. We took the narrow version deliberately.

## Consequences

`practice.ts` now has two rendering idioms in one file, and the boundary between them is a judgement
call rather than a rule the code enforces. Anyone adding board state — a new overlay, a new square
affordance, a new selection mode — has to express it as a mutation of existing buttons instead of
adding a branch to a template string, and getting that wrong shows up as a stale square rather than
a compile error.

The board's DOM now outlives a draw, so anything that assumed a fresh element each time no longer
holds. Focus and the drag lift survive a redraw, which is the point, but so would a stray class or
an inline style left behind by an abandoned animation, and the settling path has to clean up after
itself rather than relying on the next rebuild to erase it.

Browser specs that locate squares after an interaction now hold live references rather than
snapshots of a replaced node. That is generally safer, but it hides staleness bugs that a rebuild
would have surfaced loudly, so board state is covered by pure tests over the render decision rather
than by asserting on rebuilt markup.
