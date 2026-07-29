# 07 — Responsive accessibility and release verification

**What to build:** Finish LINE/64 as a coherent release across every product surface, required state, supported viewport, accessibility mode, and production verification seam.

**Blocked by:** 06 — First-bank branch review and Result.

**Status:** ready-for-agent

- [ ] Home, Course, Lines, Practice, Result, Settings, Queue, Browse, Sources, and Account use one coherent LINE/64 visual and navigation system.
- [ ] Loading, empty, error, disabled, save-failure, reset-confirmation, and reduced-motion states exist where applicable and preserve layout.
- [ ] Mobile practice exposes no more than two primary actions and keeps all controls at least 44 px.
- [ ] Heading order, landmarks, labels, focus order, focus visibility, `aria-live`, `aria-busy`, and board-square names support keyboard and screen-reader use.
- [ ] Reduced motion suppresses Move Animation while retaining Move Beat; explicit zero suppresses both.
- [ ] Responsive comparison at 390×844, 820×1180, and 1440×900 matches the handoff’s board dominance, geometry, wrapping, navigation adaptation, and absence of horizontal overflow.
- [ ] Guide green appears only for board guidance.
- [ ] Obsolete beige/orange visual rules and unreachable UI code are removed without altering package, Firebase, storage, or Tauri identifiers.
- [ ] No exported prototype, preview, plugin metadata, unnecessary dependency, telemetry, or out-of-scope feature is added.
- [ ] The production TypeScript/Vite build succeeds.
- [ ] The complete unit suite succeeds.
- [ ] The stubbed Playwright suite succeeds.
- [ ] Firebase emulator and Firestore rules suites succeed.
- [ ] The end-to-end product journey passes through Home → Course → concept entry → Teach/Recall → branch review → Result → Queue.
- [ ] Reference Study, Settings route/modal, Account reset, hash deep links, browser Back, Result refresh, Tempo Cut, and Board/Eval Bar persistence retain dedicated regression coverage.
