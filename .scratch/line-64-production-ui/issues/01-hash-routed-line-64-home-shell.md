# 01 — Hash-routed LINE/64 Home shell

**What to build:** Give the signed-in learner a production LINE/64 Home and shared responsive shell. Home must use the real four-course repertoire, expose a useful Continue action, and provide addressable navigation that works with browser Back, refresh, static hosting, and Tauri.

**Blocked by:** None — can start immediately.

**Status:** complete

- [x] Successful authentication lands on Home rather than entering Practice automatically.
- [x] Visible branding, titles, colors, typography, spacing, controls, focus, and responsive geometry follow the LINE/64 handoff.
- [x] Existing package, Firebase, storage, and Tauri identifiers remain unchanged.
- [x] Hash routes support addressable surfaces, route parameters, browser Back, refresh, and safe fallback to Home without a routing dependency.
- [x] Home shows the real four courses, existing progress, and one dominant due or recommended Continue action.
- [x] Authentication, approval, pending, loading, failure, retry, and sign-out behavior remain functional and use the LINE/64 visual language.
- [x] Shared navigation uses real links or buttons with accurate accessible names and 44 px minimum targets.
- [x] Loading, empty, and error states preserve layout and provide one clear recovery action.
- [x] Stubbed browser coverage proves Home entry, routing, Back, refresh, and deep-link fallback through observable behavior.

## Comments

Implemented in the hash-routed LINE/64 Home shell. Verified by build, unit tests, and 47 stubbed browser tests.

