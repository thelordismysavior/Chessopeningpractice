# LINE/64 redesign

Rebrand and redesign the existing Chess Opening Practice Vite/Tauri application as LINE/64,
using `line64/line-64-design-system-2.html` and `line64/line-64-preview.png` as the visual source
of truth.

## Product scope

- Apply LINE/64 across authentication, Home, Learn, Drill, Review, Settings, Sources, and all
  loading, empty, error, and success states.
- Preserve the existing learning model, Drill Phases, progress rules, guide policy, review
  schedule, Move Animation, Move Beats, Tempo Cut, Firebase schema, and stored progress.
- Expose Home, Learn, Drill, and Review as primary destinations.
- Use mobile bottom navigation and wide-screen top navigation.
- Add a dedicated Drill launcher. Locked levels remain visible with prerequisite guidance.
- Keep Sources, account details, and sign out inside adaptive Settings.

## Visual contract

- Use the exported dark LINE/64 palette, typography stacks, spacing, radii, and restraint.
- Do not add remote fonts or design assets.
- Keep practice one-column at every viewport and center it in a 640–720px desktop measure.
- Allow responsive grids for Home and Learn; keep Review one-column.
- Keep the board dominant and preserve in-place board and Eval Bar updates from ADR-0002.
- Support 320px without horizontal overflow and validate the handoff viewport matrix.
- Meet WCAG 2.2 AA; accessibility overrides exact pixel fidelity where they conflict.

## Acceptance

- Production build succeeds.
- Unit and browser behavior tests pass after intentional selector/copy updates.
- Responsive screenshots are compared to the LINE/64 reference.
- Keyboard, focus, touch-target, reduced-motion, and horizontal-overflow checks pass.
- Visible Vite/Tauri product branding reads LINE/64.
