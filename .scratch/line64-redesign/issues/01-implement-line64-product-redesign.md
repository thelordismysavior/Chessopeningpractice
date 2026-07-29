# Implement the LINE/64 product redesign

Type: task
Status: resolved

Implement the agreed LINE/64 redesign described in `../spec.md`.

## Requirements

- Extract and centralize design tokens before screen styling.
- Build the adaptive primary navigation and Settings surface.
- Restyle every current product route and state.
- Add the Home priority hierarchy and dedicated Drill launcher.
- Preserve domain behavior and ADR-0002's in-place board/Eval Bar rendering boundary.
- Update tests without deleting behavioral coverage.
- Complete responsive and accessibility verification.
- Save the final source-to-implementation comparison in `design-qa.md`.

## Comments

- The design scope and interaction decisions were confirmed through a one-question-at-a-time
  grilling session on 2026-07-29.
- Implemented on `feat/line64-redesign`.
- Verification: production build, 144 unit tests, 44 existing browser flows, and 2 LINE/64
  visual-contract flows pass. Source-to-implementation review is recorded in `design-qa.md`.

## Answer

LINE/64 now provides the complete visible product system: rebranding, adaptive Home/Learn/Drill/
Review navigation, dedicated Drill selection, review badges, responsive Settings, full dark-theme
screen styling, one-column board-first practice, Tauri branding, and updated behavioral coverage.
Existing learning rules and persisted progress remain unchanged.
