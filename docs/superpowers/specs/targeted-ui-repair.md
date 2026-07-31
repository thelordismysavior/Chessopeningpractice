# Targeted UI and Lesson Completion Repair

Status: approved-design

## Problem

The app has several connected interaction and responsive defects that make a completed lesson appear stuck.

The primary failure occurs after a learner banks a variation. `PracticeSession` correctly advances to the next variation, but the renderer keeps the completed variation's final FEN when no opponent-reply transition exists. The header changes to the next line while the board remains on the old position. The next expected piece is therefore not available to drag, so the learner cannot reach lesson completion or the final Proceed action.

Pointer clicks have a separate defect. The board captures the pointer before a drag is established. That capture retargets the resulting click away from the square button, so click-to-move does not select or submit while keyboard input still works.

The completion action also has the wrong destination. It currently returns to the dashboard instead of opening the newly unlocked lesson. On mobile, completion content follows the board and can remain outside the viewport without focus or an announcement, making the action appear absent.

Supporting UI defects include stale scroll position between screens, wrapping topbar controls and course counts on narrow screens, crowded mobile card footers, and a move guide that visually dominates the pieces.

## Goals

- Keep the current vanilla TypeScript architecture, Firebase progress model, content, and visual identity.
- Reset the board to the next variation's starting position after a line is banked.
- Show Proceed only after the entire lesson is complete.
- Start the newly unlocked lesson from Proceed.
- Return to the dashboard from Proceed after the final Advanced lesson.
- Preserve dragging, restore click-to-move, and keep keyboard input working.
- Make completion visible and announced on mobile.
- Repair confirmed responsive wrapping and move-guide hierarchy.
- Preserve all current progress, retry, review, animation, and save semantics.

## Out of Scope

- A new router, state-management layer, component framework, or design system.
- A new visual system beyond the established LINE/64 surface or a content rewrite.
- A Proceed step between variations.
- Changes to course content, lesson order, URLs, navigation labels, authentication, Firestore rules, or progress schema.
- New runtime dependencies or a DOM testing framework.
- Restoring or modifying unrelated user-owned working-tree changes.

## Behavior and State Flow

### Variation completion

When a clean variation is banked, the session continues automatically. The renderer settles on the next snapshot position's FEN when there is no valid opponent-reply transition. This replaces the stale completed board with the next variation's starting board.

The learner sees a short confirmation such as "Line banked. Next line ready." There is no Proceed button between lines.

### Lesson completion

After the final variation is banked:

- The board caption and feedback region state that the lesson is complete.
- The completion message names the newly unlocked level when one exists.
- Exit Lesson is replaced by one primary Proceed button.
- Proceed receives focus after the final move sequence so it is announced and brought into view on mobile.
- Proceed waits for the final progress save before navigating.
- Beginner proceeds to Intermediate.
- Intermediate proceeds to Advanced.
- Advanced proceeds to the dashboard because no lesson remains to unlock.

If the final save fails, the learner stays on the completion screen and can use the existing Retry Save action. Repeated Proceed activation is ignored while saving.

### Pointer input

Pointer capture begins only after movement crosses the existing drag threshold. A normal press and release therefore reaches the square's click handler. Once a drag is established, pointer capture preserves the existing lift, outside-board cancellation, and drop behavior.

Keyboard activation and focus restoration remain unchanged except at lesson completion, where Proceed becomes the intentional focus target.

### Screen transitions

Scroll resets to the top only when changing between top-level screens such as authentication, dashboard, sources, and practice. Practice redraws caused by selection, feedback, animation, or saving do not reset scroll.

## UI Treatment

This is a preserve-style repair within the established LINE/64 visual system, retaining the warm
neutral palette, terracotta accent, typography, card treatment, and board.

- Design variance remains moderate at 5.
- Motion intensity remains restrained at 3.
- Visual density remains practical at 5.
- Proceed uses the existing primary terracotta button treatment.
- Completion feedback uses the existing feedback language and a polite live region.
- Mobile topbars use tighter spacing and non-wrapping controls without renaming them.
- Course completion counts remain on one line.
- Mobile card footers stack when necessary instead of colliding.
- The move guide becomes slimmer and quieter while remaining visible below pieces.
- Existing focus outlines and reduced-motion behavior are preserved.

## Error Handling

- Proceed waits for `pendingSave`.
- A save error prevents navigation and keeps completion state visible.
- Retry Save continues to use the current queued-save behavior.
- Navigation starts only after the save succeeds, ensuring the next lesson receives current progress and unlock state.
- The final Advanced action reuses the normal dashboard rendering path.

## Verification

### Automated checks

- Add one focused transition-state test proving that a banked variation with no opponent-reply transition settles on the next variation's starting FEN.
- Keep the existing variation-banking and lesson-completion session tests passing.
- Run the production TypeScript and Vite build.
- Run the pure Vitest suite.
- Run the Firebase Auth and Firestore emulator suite.

### Browser checks

Verify in Chromium at 1440x1000 and 390x844:

1. Click-to-move selects and submits a legal move.
2. Drag-to-move remains functional.
3. Banking the first variation resets the board to the second variation's initial position.
4. The first move of the second variation can be dragged immediately.
5. No Proceed button appears between variations.
6. Completing Beginner shows a completion message and focused Proceed button.
7. Proceed waits for saving and opens Intermediate.
8. Completing Advanced returns to the dashboard.
9. A simulated save failure leaves completion visible with Retry Save.
10. Topbar controls, course counts, and card footers do not wrap or overflow at 390px.
11. Completion focus brings the action into view on mobile.
12. The move guide remains understandable but does not obscure the board.

## Expected Files

The repair should stay within the smallest existing surface:

- `src/main.ts` for screen transitions, pointer capture, board settlement, completion focus, and Proceed routing.
- `src/style.css` for completion CTA, responsive wrapping, and move-guide weight.
- The existing transition or interaction test file for the single regression check.

No new production module is required unless the test cannot cover the transition decision without one small pure function.
