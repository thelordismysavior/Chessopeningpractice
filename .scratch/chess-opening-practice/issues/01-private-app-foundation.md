# 01 — Private app foundation

**What to build:** A signed-in private app shell that runs as the Vite web application and is wired for the Tauri runtime. The owner can sign in with Google, reach a protected dashboard shell, sign out, and develop safely against Firebase emulators.

**Blocked by:** None — can start immediately

**Status:** ready-for-human

- [x] The Vite and vanilla TypeScript application runs in a browser.
- [x] Tauri v2 scaffolding is present and points at the same frontend build without adding native-only behavior.
- [x] Firebase Authentication supports Google Sign-In and preserves the signed-in session.
- [x] Unauthenticated users cannot access the dashboard shell or private progress views.
- [x] Firestore Security Rules deny unauthenticated users, non-approved accounts, and cross-user access.
- [x] Firebase Emulator Suite supports local Auth and Firestore development.
- [x] Firebase configuration is supplied through environment-specific configuration rather than hardcoded secrets.
- [x] The owner can sign out and return to the sign-in screen.
- [x] Authentication and Security Rules behavior is covered by emulator-backed checks.
