# 04 — Cross-course dashboard and release readiness

**What to build:** Finish the owner-facing v1 experience across all four courses and make the app deployable. The owner can understand overall progress, inspect source attribution, recover from Firebase failures, use the hosted web build, and verify that the Tauri shell consumes the production frontend build.

**Blocked by:** 02 — White repertoire practice; 03 — Black repertoire practice

**Status:** ready-for-agent

- [x] The dashboard presents all four courses consistently with side, completion state, unlocked level, and next lesson.
- [x] The owner can navigate from the dashboard into every course and back without losing practice state.
- [x] A sources and attribution view identifies the Lichess opening dataset, relevant Explorer/database references, and linked explanatory sources.
- [x] The app shows a clear retryable state when Firebase Auth or Firestore is unavailable.
- [x] A completed session on one authenticated client is visible after signing in on another client.
- [x] Firebase Hosting serves the browser build over HTTPS.
- [x] The Tauri frontend distribution is wired and passes the v1 build/configuration check.
- [x] The release check confirms that no live Lichess statistics, PGN import, offline mode, course editor, or APK packaging has entered v1.

## Comments

- Implemented the cross-course dashboard, sources view, retryable Firebase states, and release wiring checks.
- `npm run release:check` passed; `npm run build` passed. Full emulator-backed Auth/Firestore checks remain environment-blocked because the local Firestore emulator cannot start with the installed Java runtime.
