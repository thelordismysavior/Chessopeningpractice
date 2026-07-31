# LINE/64 Design System

LINE/64 is a dark, board-first Android interface for chess opening recall. It reduces practice to one quiet loop: learn the position, produce the move, bank the line.

## Product context

- Surface: Android-first responsive product UI.
- Primary task: recall a move from a chess position.
- Core modes: Learn reveals a guide and one explanation; Drill withholds both until the learner acts.
- Design posture: one decision per screen, honest state, touch-first control, no celebratory chrome.
- Design dials: variance 5, motion 2, density 5. The board provides visual interest; the surrounding UI stays still and spare.

## Visual foundations

The system pairs a calm sans-serif hierarchy with instrument-panel state detail. Dark cool surfaces reduce glare around the board. Warm Bone carries text, primary actions, focus, and selection. Green is reserved for board hints.

The brand mark is code-native: a 2 by 2 grid with the upper-right square filled. The lockup reads `LINE/64` in mono. Use the lockup for launch, account, and documentation. Use the compact mark inside practice. Never place either mark on the board.

## Color

| Token | Name | Value | Use |
| --- | --- | --- | --- |
| `--bg` | Void | `oklch(15% 0.012 255)` | App canvas and board frame |
| `--surface` | Graphite | `oklch(20% 0.014 255)` | Cards, device shell, raised controls |
| `--fg` | Bone | `oklch(92% 0.012 110)` | Primary text and banked state |
| `--muted` | Slate | `oklch(66% 0.018 245)` | Supporting copy and metadata |
| `--border` | Rule | `oklch(30% 0.016 250)` | Hairlines, tracks, inactive squares |
| `--hint` | Guide | `oklch(82% 0.15 155)` | Board route markers and hint state |

Derived colors must use `color-mix()` from these tokens. Do not introduce independent literals.

## Typography

- Display: `"Segoe UI", system-ui, -apple-system, sans-serif`.
- Body and UI: `"Segoe UI", system-ui, -apple-system, sans-serif`.
- State and numeric detail: `ui-monospace, "SFMono-Regular", Consolas, monospace`.
- Display headlines: 44-82px, weight 600, line-height .98, tracking -.045em.
- Section headings: 32-50px, weight 600, line-height 1.05, tracking -.03em.
- UI body: 16px at 1.55.
- Lead copy: 18px with a 56ch maximum.
- Metadata: 10-12px mono, uppercase only for state or system labels.

Use the display stack at larger sizes and heavier weight for teaching language. Use the same family at body scale for actions and explanations. Use mono for coordinates, counts, scores, phases, and line identity.

## Spacing and shape

- Base rhythm: 4px.
- Named gaps: 8, 12, 20, 32, 56, and 96px.
- Content container: 1180px with 32px desktop gutters and 18px phone gutters.
- Section rhythm: 64-112px.
- Cards: 20px radius.
- Compact controls and marks: 10-12px radius.
- Buttons and mode switches: 999px pill radius.
- Phone shell: 36px outer radius and 28px screen radius.
- Minimum touch target: 44 by 44px.
- Hairline: 1px.
- Focus: 3px Bone outline with 3px offset.

Use whitespace and hairlines before cards. Use the 18px by 22px zero-blur offset only for the phone or another printed-plate object. No soft elevation.

## Layout

### Practice screen

1. App bar: back, line identity, settings.
2. Mode switch: Learn or Drill.
3. Prompt: one phase label, one instruction, one supporting sentence.
4. Eval strip: attached directly to the board.
5. Board: square-on, never cropped, largest object.
6. State caption: settled score and guide state.
7. Action: one primary move action and one optional Learn hint.

The board is an 8 by 8 grid of real buttons inside a labelled group. It uses `touch-action: none` and supports tap selection. Mobile is one column. Wider documentation surfaces may pair a narrow copy rail with a wider board rail.

### Documentation surfaces

- Use an asymmetric 1 to 2 or .88 to 1.12 split.
- Use a 12-column component grid only when component spans convey hierarchy.
- Collapse all multi-column layouts below 920px.
- Keep global navigation to one line and 68px high.

## Components

### Button

- Primary: Bone fill with Void text for in-product actions.
- Secondary: transparent with Rule border and Bone text.
- Ghost: no border, Slate text, 44px hit area.
- Press: translate down 1px. No scale, glow, or lift.

### Mode switch

Two equal pill segments. The selected segment uses Bone fill and Void text. Set `aria-selected` on both tabs.

### Card

Graphite surface, Rule border, 20px radius, 28px padding. Use only for bounded examples, device surfaces, and grouped settings.

### Review row

Minimum 72px. Title and status copy on the left, one action or state pill on the right. Stack on narrow phones instead of truncating chess notation.

### Line meter

Twelve short segments. Bone is banked, Slate is review due, Rule is untouched. Metadata names all three counts.

### Feedback

One 3px left rule plus a direct statement. Say what remains true before the correction. Do not use a toast.

### Board

- 64 real buttons, one per square.
- Accessible labels name square and piece or empty state.
- Alternating squares derive from `--fg` and `--bg`.
- Route markers are 10px Guide green circles.
- Selection is a 3px Bone inset ring.
- Unicode pieces are acceptable and require no asset bundle.

### Eval strip

A 5px horizontal strip directly above the board on phones. It encodes the settled score and never becomes a detached dashboard widget.

### Navigation

Documentation uses a sticky top bar. Practice uses a four-item bottom bar only in the preserved source prototype. New focused practice screens should prefer top navigation plus back unless product structure requires the bottom bar.

### Required states

- Loading: reduce opacity to .7 and use `cursor: wait`; preserve layout.
- Empty: explain what can populate the view with one action.
- Error: inline feedback rule, no toast.
- Disabled: opacity .55 and `cursor: not-allowed`.

## Motion and interaction

- Default motion is static.
- Hover may swap surface or text color.
- Press moves one pixel.
- Move Animation is a learner preference from 0-2000ms in 50ms steps, default 200ms.
- Reduced motion sets Move Animation to zero but does not remove the learner-controlled beat.
- Do not auto-pulse, count up, shimmer, celebrate, or scroll content.

## Voice

Short declaratives addressed to one learner. One instruction at a time. Chess terms stay exact.

Preferred: line, repertoire, banked, mastered, untouched, position, review queue, Teach, Recall, Settled Score, mistake budget.

Failure order:

1. State what remains true.
2. State the expected move.
3. Ask for the move again.

Example: “The position remains. Nf6 was expected. Try the move again.”

No exclamation marks. No gamified praise. No emoji.

## Accessibility

- Keep every control at least 44px.
- Keep visible 3px focus rings.
- Use real buttons for all board squares.
- Announce prompt changes with an `aria-live` region.
- Preserve labels when visual chrome collapses.
- Do not require hover, right-click, drag, or keyboard shortcuts to complete a move.
- Respect reduced motion.

## Anti-patterns

- Board cropped, tilted, reduced below secondary cards, or moved away from engine state.
- More than two actions on a phone practice screen.
- Guide green used outside the board or for non-hint state.
- Detached eval cards, achievement counters, streaks, confetti, badges, or toasts.
- Generic dashboard sidebars or multi-panel chrome.
- Soft shadows, outer glows, gradients, or automatic animation.
- Photography, 3D chess sets, ornamental illustration, or invented logos.
- Truncated notation, line names, or ECO codes on phones.
- Fixed animation timing that ignores learner preference.
- Instruction copy longer than one sentence plus one supporting sentence.

## Source fidelity

The canonical evidence is preserved in `line-64-design-system.html`, `line-64-design-system-2.html`, and `assets/line-64-source-preview.png`. The package contains no runtime icon or font files because the source uses CSS geometry, Unicode chess pieces, and platform font stacks.
