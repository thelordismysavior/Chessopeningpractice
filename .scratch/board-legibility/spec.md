# Board Legibility and Drag Feedback

Status: ready-for-agent

## Problem Statement

The practice board is hard to read and hard to trust.

Piece colour is decided by the square a piece stands on rather than by the piece itself, so a single rank shows what looks like a white pawn beside a black pawn. The learner cannot tell the two sides apart at a glance, which undermines every position in the repertoire.

Dragging appears not to work. The pointer gesture is wired up and a drop does resolve, but nothing visibly leaves the square, so the board gives no sign it is tracking the pointer. Two input defects make this worse: the gesture is promoted to a drag based on distance from the centre of the origin square rather than from the point pressed, so pressing near the edge of a piece and jittering by a pixel turns a click into a drag that ends on its own origin and silently clears the selection; and the flag that suppresses the click following a drag is only cleared by a later click on a square, so it can persist and swallow a legitimate click.

The move guide is too loud. It draws a heavy ring, a thick full-length arrow, and a second heavy ring in saturated green, painted above the pieces, before every move in a regular lesson. It dominates the board and obscures the position the learner is meant to be studying.

## Solution

Piece appearance becomes a function of the piece alone. Both sides render with the same solid glyph shapes, distinguished by fill and outline: white is cream with a dark stroke, black is near-black with a light stroke. Side reads identically on both square tones, in the static board and while pieces are travelling.

Dragging gains a visible lift. Crossing the drag threshold raises the piece out of its square into a floating element that follows the pointer, slightly enlarged and shadowed, offset above the contact point on touch so a finger does not hide it. The vacated square takes a recessed tint. The two input defects are corrected so that clicks and drags are reliably distinguished.

The move guide is dialled back to a quiet annotation. It keeps its origin ring, directional arrow, and destination target, but in a muted sage at reduced weight, and it renders beneath the pieces instead of over them. It remains persistent in regular lessons, so the learner is still shown the repertoire move without having to reach for it.

Two supporting corrections come along: the selection indicator moves off its competing mustard tone onto a neutral one, and file and rank labels appear on the board edge, oriented to the course side.

## User Stories

### Reading the position

1. As a learner, I want every white piece drawn as white and every black piece drawn as black, so that I can tell the two armies apart.
2. As a learner, I want a piece to keep its side colour when it stands on a light square, so that colour never depends on where a piece happens to be.
3. As a learner, I want a piece to keep its side colour when it stands on a dark square, so that a rank reads as one army rather than alternating sides.
4. As a learner, I want all six piece types to follow the same colour treatment, so that no single type is a special case I have to decode.
5. As a learner, I want a piece to remain legible against the square beneath it, so that a cream piece on a cream square is still clearly a piece.
6. As a learner, I want a piece in motion during a learner move to carry the same colour as it did at rest, so that the piece I picked up is the piece I see arrive.
7. As a learner, I want a piece in motion during an opponent reply to carry its own side colour, so that I can see which army just moved.
8. As a learner, I want castling to show both travelling pieces in their correct side colour, so that the manoeuvre is readable as one side's move.
9. As a learner, I want a captured piece to stay in its own colour while the capturing piece travels, so that I can see which piece is being taken.
10. As a learner working a black course, I want the flipped board to colour pieces by side rather than by square, so that orientation never changes what a piece looks like.
11. As a learner using a screen reader, I want each square to keep announcing the colour and type of the piece on it, so that the board remains usable without sight.

### Picking up and moving a piece

12. As a learner, I want a piece to visibly lift out of its square when I begin dragging it, so that I can tell the board has registered my gesture.
13. As a learner, I want the lifted piece to follow my pointer continuously, so that the drag feels connected to my hand.
14. As a learner, I want the lifted piece drawn slightly larger and shadowed, so that it reads as being above the board rather than on it.
15. As a learner, I want the square I lifted from to look vacated, so that I can see where the piece came from while it is in the air.
16. As a learner on a touch device, I want the lifted piece to ride above my finger, so that my hand does not cover the piece I am placing.
17. As a learner, I want the pointer to show a grab affordance over pieces I am allowed to move, so that I know which pieces are mine before I press.
18. As a learner, I want the pointer to show a grabbing affordance while I hold a piece, so that the drag state is unambiguous.
19. As a learner, I want the lift to disappear the moment I release, so that the board never keeps a stale floating piece.
20. As a learner, I want dragging to remain smooth on a large board, so that the gesture does not stutter while I aim.
21. As a learner, I want to release a piece on its own origin and have nothing happen, so that I can change my mind without being scored.
22. As a learner, I want to release a piece outside the board and have nothing happen, so that an abandoned gesture is never treated as a move.
23. As a learner, I want a cancelled drag to leave no red board response, so that abandoning a gesture is clearly different from making an incorrect move.
24. As a learner, I want to drop a piece onto another of my own pieces and have that piece become the new selection, so that I can redirect my intent without starting over.

### Clicking reliably

25. As a learner, I want to press near the edge of a piece and still have it select on click, so that small aiming differences do not change what my input means.
26. As a learner, I want a pixel of hand tremor during a click to not be interpreted as a drag, so that my selection is not silently discarded.
27. As a learner, I want my first click after completing a drag to register normally, so that the board never ignores an input for no visible reason.
28. As a learner, I want click-to-move to keep working exactly as before, so that I am not forced into dragging.
29. As a learner, I want keyboard activation of squares to keep working, so that I can complete a lesson without a pointer.
30. As a learner, I want the focus indicator to remain visible while moving by keyboard, so that I always know which square I am on.

### Reading the move guide

31. As a learner in a regular lesson, I want the move guide present before every move, so that I am still shown the repertoire move rather than made to hunt for it.
32. As a learner, I want the move guide drawn beneath the pieces, so that it never covers the position I am reading.
33. As a learner, I want the move guide in a muted tone, so that it informs the board instead of dominating it.
34. As a learner, I want the origin ring thin enough to frame the piece rather than crowd it, so that I can still see the piece it points at.
35. As a learner, I want the destination target to read as a quiet mark on the square, so that it suggests a landing place instead of demanding attention.
36. As a learner, I want the directional arrow slim, so that a long move does not put a heavy bar across the middle of the board.
37. As a learner, I want the arrow to keep fading while I drag the guided piece, so that the guide gets out of the way once I have committed.
38. As a learner, I want the destination target to stay visible while I drag, so that I can still see where I am aiming.
39. As a learner in a review session, I want the move guide to stay hidden on the first attempt, so that recall is still measured honestly.
40. As a learner in a review session, I want the revealed move guide after a scored mistake to use the same quiet treatment, so that the board is consistent everywhere.
41. As a learner, I want mistake feedback to stay clearly stronger than the move guide, so that a wrong move is unmistakably different from an instruction.
42. As a learner, I want an illegal drop to keep its existing response, so that impossible moves stay distinct from scored mistakes.
43. As a learner, I want the move guide to remain distinguishable from mistake feedback without relying on colour alone, so that the board is understandable with colour vision differences.

### Selection and orientation

44. As a learner, I want the selected square marked in a neutral tone, so that selection does not add a fourth colour competing with the move guide and mistake feedback.
45. As a learner, I want the selection indicator legible on both square tones, so that selecting a piece looks the same everywhere on the board.
46. As a learner, I want file letters along the board edge, so that I can connect the position to written notation.
47. As a learner, I want rank numbers along the board edge, so that I can name a square without counting.
48. As a learner working a black course, I want the coordinate labels to flip with the board, so that the labels always match the orientation I am playing.
49. As a learner, I want coordinate labels quiet and small, so that they inform without competing with the pieces.
50. As a learner using a screen reader, I want coordinate labels excluded from announcement, so that squares are not read out twice.

### Everything that must not regress

51. As a learner, I want correct moves to keep animating before the opponent reply, so that the sequence still explains itself.
52. As a learner, I want my move duration preference to keep applying to every movement, so that the board still moves at the speed I chose.
53. As a learner who prefers reduced motion, I want movement to remain instant, so that my system preference is still respected.
54. As a learner, I want input to stay locked while a sequence is animating, so that I cannot submit twice.
55. As a learner, I want the board usable at the existing desktop and mobile breakpoints, so that the layout still works on my devices.
56. As a learner, I want progress, attempts, clean runs, and unlocks to behave exactly as before, so that the change is purely presentational.
57. As a learner, I want the lesson explanation and feedback text to remain, so that I keep the written reasoning alongside the board.

## Implementation Decisions

### Piece appearance

- Introduce one new pure module owning piece appearance. It maps a piece code to the glyph to draw and the side that owns it. Its input is the piece code and nothing else — no square, no orientation, no board state — so the defect of colour depending on the square becomes structurally unrepresentable rather than merely fixed.
- Both sides use the solid glyph shapes. The outline glyph set is abandoned because those glyphs render thin and inconsistently across fonts at board size, and because using one shape set for both sides guarantees the two armies differ only in the way we control.
- Side is expressed as fill plus outline: white as cream with a dark stroke, black as near-black with a light stroke. Outline is what keeps a piece legible on a same-tone square, which is why the square palette needs no change.
- Both consumers of piece rendering — the static squares and the layer that animates travelling pieces — go through this module. The animation layer currently hardcodes a single dark colour and is therefore wrong for one side; routing it through the module corrects it.
- The stylesheet stops setting a text colour on dark squares. Piece colour is carried only by side classes.

### Drag lift

- The dragged piece is a single floating element positioned by transform and updated directly on each pointer move. It must not go through the practice screen's redraw, because that redraw replaces the entire screen markup, which would destroy the element holding pointer capture and the listeners attached to it. A full redraw happens once, on release, as it does today.
- The lifted piece is centred on the pointer, scaled up modestly, and shadowed. On touch pointers it is offset upward so the contact point does not obscure it. The vacated origin square hides its glyph and takes a recessed tint.
- Cursor affordances are added: grab over a piece belonging to the course side, grabbing while a piece is held.
- No indicator is drawn on the square under the pointer. The floating piece is the feedback, and the board already carries a move guide and mistake feedback that a third overlay would compete with.
- Drag cancellation, drop resolution, self-drop, and drop-onto-own-piece all keep their current behaviour.

### Pointer input corrections

- The drag threshold is computed from the point pressed, not from the centre of the origin square, and moves into the existing pure board input module alongside drop resolution as a small predicate over the press point, the current point, and a threshold.
- The flag that suppresses the click following a drag is reset when a new pointer gesture begins, so it cannot survive into an unrelated interaction.

### Move guide

- The move guide keeps all three parts named in the glossary — origin ring, directional arrow, destination target — so the domain vocabulary is unchanged and no glossary edit is required.
- Paint order changes so the guide sits beneath piece glyphs. The overlay currently stacks above both the pieces and the animation layer; it drops below them, and the square glyphs are raised so they always win.
- Weights and tone soften: a muted sage in place of the saturated green, a thin origin ring, a slim arrow with a proportionate head, and a soft filled destination dot in place of a heavy ring.
- The guide stays persistent in regular lessons. Making the arrow appear only on hover was considered and rejected: in a regular lesson the point is to be shown the move, so gating it behind an interaction adds a step to every move.
- Mistake feedback keeps its current strength deliberately. It is a brief alarm rather than something the learner reads continuously, so it should stay louder than the guide.
- Guide visibility policy in regular lessons and review sessions is untouched.

### Selection and coordinates

- The selection indicator moves from its mustard tone to a neutral tone that adapts to the square beneath it.
- File and rank labels are drawn inside the edge squares, small and low contrast, and hidden from assistive technology because the squares already announce their names. Labels derive from the existing square-naming logic that already accounts for course side, so they flip with the board for black courses without a second orientation rule.

### Constraints carried forward

- Vanilla TypeScript, Vite, `chess.js`, the existing stylesheet system, Pointer Events. No new runtime dependency for dragging, animation, or rendering.
- Chess legality, repertoire correctness, attempts, retries, and completion stay inside the practice session module. This work adds no behaviour there.
- The move duration preference, the fixed opponent-reply pause, and reduced-motion handling are untouched.

## Testing Decisions

A good test here asserts externally observable behaviour of a pure module: given a gesture, what move results; given a piece code, what should be drawn. Tests should not reach into rendering internals or assert on markup strings, both because the renderer is a large template that would make such tests brittle and because none of the visual decisions in this spec have a meaningful non-visual assertion.

- **Board input module.** Extend the existing tests for drop resolution with the new threshold predicate: a point within the threshold of the press point is not a drag; a point beyond it is; the measurement is anchored to the press point, so a press far from the square's centre followed by a tiny movement is still not a drag. The existing assertions for unmoved, origin, outside, and locked drops must continue to pass unchanged, since those semantics are explicitly preserved.
- **Piece appearance module.** One test covering the full twelve-piece mapping, asserting each code yields the expected glyph and side. This test is acknowledged to be thin — it largely restates a table. The real protection is the module's signature, which offers no way for a caller to let the square influence the result.
- **Prior art.** The existing test file for the guided move interactions work is the model to follow: grouped describes for board input outcomes, move guide policy, transition plans, and move duration, all asserting pure functions with no DOM.
- **No DOM environment is added.** The test runner has no DOM configured and none is introduced, so the lift, paint order, tone, and coordinate rendering are verified by eye in the dev server rather than by automated test.
- **Regression gate.** The type check and production build must pass, along with the pure test files. A plain full-suite run includes the Firestore rules tests, which require the emulator; run the pure files directly or start the emulator.
- **Manual verification checklist.** Both square tones show correct piece colours; a black course shows correct colours on the flipped board; a piece visibly lifts and tracks the pointer on mouse and touch; a click near a piece edge selects; a click immediately after a drag registers; the guide is legible but sits under the pieces; mistake feedback still reads as stronger than the guide; coordinates flip with course side; the board still works at the mobile breakpoint.

## Out of Scope

- Replacing glyphs with piece artwork. Considered and rejected for now; it would mean asset files and a licence entry on the sources page.
- Changing the light and dark square colours. The outline treatment is what buys contrast, so the palette stays.
- Any indicator on the square under the pointer during a drag.
- A last-move highlight showing which squares the opponent reply used.
- Legal-move dots on reachable squares. In a repertoire trainer with exactly one correct move, they mostly advertise wrong ones.
- Adding a DOM test environment or DOM-level rendering tests.
- Edits to the glossary or to the guided move interactions spec. The quieter guide still matches how both describe it.
- Changing the strength or duration of mistake feedback, or the response to an illegal drop.
- Changing move guide visibility policy, move duration, the opponent-reply pause, or reduced-motion behaviour.
- Any change to lesson content, repertoire lines, scoring, clean runs, unlocks, or progress storage.

## Further Notes

- **Glossary gap.** This work introduces board vocabulary the glossary does not define: the lifted piece during a drag, the vacated origin square, and the coordinate labels. None of them are repertoire concepts, so no glossary entry is proposed here, but if they recur in future specs they are candidates for domain modelling.
- **Rendering risk.** The outline treatment depends on text stroking. The desktop shell runs on a Chromium-based web view, where support is reliable, but a shadow-based fallback should be kept in mind if the stroke renders poorly at small board sizes on any target.
- **Judgement calls needing a human eye.** The lift scale, the touch offset distance, and the exact sage tone cannot be settled from the specification. Expect one round of adjustment after seeing them in the dev server.
- **Why the guide sits under the pieces.** This single change removes much of the reported distraction on its own, independently of tone and weight. If the muted tone later proves too faint, the paint order should be preserved and the tone strengthened instead of reverting both.
