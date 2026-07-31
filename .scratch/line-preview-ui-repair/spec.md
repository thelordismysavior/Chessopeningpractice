# Line Preview and targeted UI repair

Status: ready-for-agent

## Problem Statement

The learner encounters two inconsistent ways to inspect a line before practice. An untouched
trainable line opens a text-only move list, while a reference or explicitly studied line opens a
board walker. The text-only view cannot demonstrate the position or show pieces moving, and the
board walker is so large on desktop that the position is difficult to read in context. The walker
also swaps snapshots rather than visibly playing the authored continuation, and it prevents the
learner from advancing through the final authored move.

Several surrounding LINE/64 surfaces have smaller but conspicuous presentation defects. Primary
navigation links inherit oversized pill-shaped button hover treatments and do not identify the
current page semantically. The Course sort label and its nested select both receive borders. The
Overall Progress label and percentage collide. These defects weaken the visual hierarchy and make
the production UI diverge from the established LINE/64 visual contract.

## Solution

Replace the separate text move list and board walker with one canonical **Line Preview**: a
progress-neutral, board-led walkthrough of the line's authored positions. Line Preview retains the
line summary and lesson idea, always reveals the authored move guide and explanation, and lets the
learner advance manually. Next visibly plays the authored move and any opponent reply before
settling on the next prompt. Previous immediately restores the prior authored position. The final
authored move plays into a completed preview state with a restart action and, only for trainable
lines, an action to begin practice.

Use a responsive two-column composition with contextual copy and controls beside a board capped at
approximately 520px on larger screens. Stack the content and width-constrained board on smaller
screens. Respect the existing Move Animation preference and reduced-motion behavior.

At the same time, restore the intended LINE/64 treatment for primary navigation, the Course sort
control, and Overall Progress. Validate the complete change through the existing high-level browser
surface seam across desktop, tablet, mobile, and the minimum supported width.

## User Stories

1. As a learner browsing the repertoire, I want every selected line to open the same Line Preview, so that preview behavior is predictable.
2. As a learner browsing an untouched trainable line, I want to see the board rather than only a move list, so that I can understand the position spatially.
3. As a learner browsing a banked or mastered line, I want selection to open Line Preview, so that Browse remains a reading and study surface rather than unexpectedly starting practice.
4. As a learner browsing a reference line, I want it to open Line Preview, so that reference material uses the same board-led experience as other lines.
5. As a learner selecting a trainable line from a Course, I want practice to start directly, so that the Course remains an efficient training entry point.
6. As a learner selecting a reference line from a Course, I want Line Preview to open, so that progress-neutral material does not enter practice.
7. As a learner opening an untouched line from Browse, I want its summary and lesson idea retained beside the board, so that replacing the concept screen does not discard teaching context.
8. As a learner using Line Preview, I want the authored move guide visible on the current position, so that I know which move the walkthrough is teaching.
9. As a learner using Line Preview, I want the authored explanation visible with the current position, so that I understand the reason for the move.
10. As a learner using Line Preview, I want progression to wait for my input, so that I can read at my own pace.
11. As a learner pressing Next, I want to see the authored piece move, so that the notation is connected to board geometry.
12. As a learner pressing Next between authored positions, I want to see the opponent reply after the authored move, so that the next prompt arrives through a coherent chess sequence.
13. As a learner watching a move sequence settle, I want navigation temporarily unavailable, so that repeated input cannot corrupt or skip the displayed position.
14. As a learner pressing Previous, I want the prior authored prompt restored immediately, so that reversing navigation is clear and does not resemble a new legal continuation.
15. As a learner using arrow keys, I want Left and Right to retain the same Previous and Next behavior, so that keyboard navigation remains efficient.
16. As a learner at the first position, I want Previous disabled, so that the beginning of the line is unambiguous.
17. As a learner at the last authored prompt, I want Next to play the final authored move, so that the walkthrough does not omit its ending.
18. As a learner after the final move, I want a clear completed preview state, so that I know the walkthrough has ended.
19. As a learner after completing a preview, I want to restart it from the first authored position, so that I can review the sequence again.
20. As a learner previewing a trainable line, I want a Practice This Line action, so that I can move directly from instruction into recall.
21. As a learner previewing a reference line, I do not want a practice action, so that reference material remains outside recall and review.
22. As a learner exploring Line Preview, I want no attempts, banking, mastery, or review schedule changes, so that study does not distort my progress.
23. As a learner with a Move Animation preference, I want Line Preview to use it, so that movement timing is consistent across the product.
24. As a learner who prefers reduced motion, I want Line Preview to settle positions without sliding pieces, so that the walkthrough remains comfortable and usable.
25. As a learner using a desktop or tablet, I want lesson context and the board visible side by side, so that neither dominates the other.
26. As a learner using a large screen, I want the preview board capped near 520px, so that it does not become excessively zoomed in.
27. As a learner using a phone, I want preview copy and the board stacked within the viewport, so that all content remains legible without horizontal scrolling.
28. As a learner using the 320px minimum width, I want every preview control reachable and unclipped, so that the smallest supported layout remains functional.
29. As a learner navigating the app, I want primary destinations presented as quiet text links, so that navigation does not resemble oversized action buttons.
30. As a learner viewing the current destination, I want its text emphasized without a pill background, so that location is visible without distracting chrome.
31. As a screen-reader user, I want the active primary destination identified as the current page, so that navigation state is announced semantically.
32. As a learner hovering or focusing a navigation destination, I want its foreground color to change without a large background shape, so that interaction feedback matches LINE/64.
33. As a learner sorting Course lines, I want one clearly bounded select with a separate muted “Sort by” label, so that the control does not appear nested or broken.
34. As a learner sorting on a narrow screen, I want the select to use the available width, so that its value and affordance remain readable.
35. As a learner viewing Overall Progress, I want the label above the percentage, so that the two values never overlap.
36. As a learner viewing Overall Progress, I want the percentage, banked count, and progress bar in a clear hierarchy, so that I can understand my status at a glance.
37. As a learner moving between supported viewport sizes, I want navigation, sorting, progress, and Line Preview to remain free of collisions, clipping, and horizontal overflow, so that the app feels deliberately responsive.
38. As a learner returning from Line Preview, I want to return to Browse without losing the expected repertoire context, so that exploration remains coherent.
39. As a learner starting practice from Line Preview, I want the selected Course, level, and line preserved, so that the intended line opens rather than a recommendation or default.
40. As a learner navigating away while engine evaluation is pending, I want stale preview evaluation work prevented from repainting another screen, so that asynchronous output cannot corrupt the visible surface.

## Implementation Decisions

- Line Preview is the sole preview experience. Remove the separate text-only move preview and the
  separate “Study Preview” identity; do not retain two render paths with different behavior.
- Browse is a reading/study surface: selecting any trainable or reference line there opens Line
  Preview. Course remains a practice-oriented surface: trainable lines start practice directly,
  while reference lines open Line Preview.
- The former untouched-line concept page is not a separate step. Its useful line summary and lesson
  idea become part of Line Preview's contextual copy.
- Line Preview is progress-neutral for every line. It must not record attempts, hints, misses,
  correct moves, banking, mastery, practice time, or review scheduling.
- Each authored prompt begins from its stored position, with the existing authored move guide and
  explanation visible.
- Line Preview is manual-only. It does not autoplay on entry and does not automatically advance
  after settling.
- Next plays a forward sequence: animate the authored move from the current prompt, then animate the
  inferred opponent reply when one connects that result to the next authored position, then settle
  on the next prompt with its guide and explanation.
- Previous does not reverse-animate chess moves. It immediately restores the prior authored prompt
  and updates the guide, explanation, move indicator, and evaluation for that prompt.
- Previous is disabled at the first prompt. Previous and Next are disabled while a forward sequence
  is settling so overlapping commands cannot create an invalid board state.
- The last prompt retains an enabled forward action. Activating it animates the final authored move
  and settles into an explicit completed preview state.
- The completed state offers Restart Preview. It also offers Practice This Line for core,
  alternative, and punish lines, but never for reference lines.
- Restart Preview restores the first prompt without changing progress. Practice This Line preserves
  the selected Course, level, and line when entering the existing practice flow.
- Existing Left and Right keyboard navigation remains available and follows the same eligibility and
  settling rules as the visible Previous and Next controls.
- Preview movement uses the existing Move Animation duration. A zero-duration preference settles
  without tempo, and the reduced-motion preference suppresses sliding while preserving correct
  states. Line Preview does not introduce a separate Tempo Cut interaction.
- Reuse the existing board renderer, move-transition planning, guide overlay, evaluation behavior,
  piece appearance, and motion preference rather than creating preview-specific chess rendering.
- Retain protection against stale asynchronous evaluation results after changing prompts or leaving
  Line Preview.
- On larger screens, Line Preview uses two columns with contextual copy and controls on the left and
  the board on the right. The board is capped at approximately 520px and does not grow to fill the
  full application shell.
- Below the tablet layout threshold, Line Preview stacks copy above the board. The board fills only
  the available content width and never causes document-level horizontal scrolling.
- Primary navigation links use quiet text styling rather than the general quiet-button pill hover
  styling. Default links are muted; hover, focus, and the current destination use the foreground
  color without a filled background.
- The current primary destination is marked semantically as the current page. Active-state selection
  follows the rendered top-level route rather than hover or keyboard focus.
- The Course sort field has an external muted “Sort by” label and exactly one bordered select. It is
  compact on desktop and uses the available width on narrow screens.
- Overall Progress stacks its muted label above the percentage. The banked count and progress bar
  remain below as a separate group with deliberate spacing.
- The visual changes follow the existing LINE/64 tokens, typography, focus treatment, and visual
  contract. No new visual system or component framework is introduced.
- No progress schema, repertoire content, engine contract, authentication behavior, or routing
  format changes are required.

## Testing Decisions

- Use one high-level browser seam for the feature. Extend the existing surface journey coverage that
  already opens Browse, exercises the current board walker, sorts Course lines, checks dashboard
  layout, and runs with deterministic application stubs.
- Tests assert external learner-visible behavior and accessibility semantics rather than internal
  state variables, private helper calls, CSS implementation details, or exact generated markup.
- Prove Browse entry behavior for untouched, banked or mastered, and reference lines. Prove Course
  entry behavior separately for trainable and reference lines.
- Prove that Line Preview initially shows the board, summary, lesson idea, current authored guide,
  explanation, and first-position state without changing progress.
- Prove that Next visibly enters a settling state, produces the expected forward board sequence, and
  lands on the next prompt. Use the existing controllable Move Animation preference rather than
  arbitrary sleeps.
- Prove that commands cannot overlap while settling and that Previous immediately restores the
  prior prompt once navigation is available.
- Prove that the last authored move is shown, the completed state appears, Restart restores the first
  prompt, and Practice This Line appears only for trainable lines.
- Prove that Practice This Line opens practice for the selected line and that completing, restarting,
  or leaving Line Preview does not mutate stored progress.
- Prove the zero-duration and reduced-motion paths settle correctly without requiring visual sliding.
- Preserve and extend the existing regression coverage that prevents stale engine evaluation from
  repainting a later prompt or another screen.
- Assert navigation current-page semantics and absence of pill-like filled backgrounds through
  computed visible behavior, not selector structure alone.
- Assert the Sort field exposes one label and one select, remains operable, and has only one visible
  control boundary.
- Assert the Overall Progress label and percentage have non-overlapping bounding boxes and maintain
  the intended vertical order.
- Run the complete surface checks at 1440×1000, 768×1024, 390×844, and 320px minimum width. At each
  width, assert no document-level horizontal overflow, clipped actions, or collisions.
- At larger widths, assert the Line Preview board does not exceed its approximate 520px cap and sits
  beside the contextual copy. At narrow widths, assert the copy precedes the board and the board
  remains within the content viewport.
- Existing browser surface, accessibility, responsive-overflow, and navigation tests are the prior
  art. Update expectations that deliberately encode the superseded text-only concept screen or
  snapshot-only walker behavior.
- Run the production build and the full unit and browser suites after the focused browser journey.
  A lower-level transition test may be added only if deterministic animation sequencing cannot be
  established through the agreed browser seam.

## Out of Scope

- Changing Course content, line notation, authored explanations, lesson ideas, roles, or evaluation
  values.
- Changing how practice scores moves, banks lines, calculates mastery, or schedules review.
- Adding autoplay, playback-speed controls, a timeline scrubber, or automatic looping to Line
  Preview.
- Adding a preview-specific Move Animation setting or Tempo Cut behavior.
- Making Line Preview interactive as a chessboard or accepting learner move input there.
- Adding practice for reference lines.
- Redesigning the practice board, Eval Bar, dashboard cards, Course rows, or application navigation
  information architecture beyond the defects described here.
- Changing authentication, Firebase persistence, Firestore rules, engine delivery, URLs, or the
  routing architecture.
- Adding a component framework, state-management library, animation dependency, or new visual
  system.
- Revising the established LINE/64 visual-contract ADR.

## Further Notes

- The project glossary defines Line Preview as a progress-neutral, board-led walkthrough advanced
  manually through visible piece movement with the authored guide and explanation present.
- This spec intentionally supersedes the earlier production behavior in which an untouched line
  opened a separate concept entry with a text move preview and reference material used a distinct
  Study walker.
- The existing architectural decision that only the board and Eval Bar render in place remains in
  force. Preview animation should reuse that persistent-board boundary rather than causing whole-page
  redraws during movement.
- The existing LINE/64 visual-contract decision remains authoritative. The navigation, Sort, progress,
  and responsive repairs restore that contract rather than establish a new design direction.
- The agreed viewport matrix is 1440×1000, 768×1024, 390×844, and a 320px minimum width.
