# Chess Practice

## Local development

```sh
bun install
bun run dev
```

Copy `.env.example` to `.env.local`, set Firebase project values and the approved owner email. For local emulator work, put `VITE_FIREBASE_USE_EMULATORS=true` in `.env.development.local`; production builds ignore emulator wiring and should keep the value `false`.

Create the owner account through the app's **Create account** form using the email in `VITE_APPROVED_EMAIL`. After sign-up, set `config/access.approvedUid` to the UID shown on the approval screen; access remains blocked until that server-managed document is updated.

## Tests

| Command | Covers | Needs emulators |
| --- | --- | --- |
| `bun run test` | Unit and course-content tests | No |
| `bun run test:browser:fast` | Browser tests against stubbed Firebase | No |
| `bun run test:emulators` | Unit tests plus the Firestore rules and auth contracts | Yes |
| `bun run test:browser` | Every browser test, including the emulator-backed journey | Yes |
| `bun run test:browser:emulated` | The emulator-backed journey alone | Yes |

The two `:fast` and plain commands need no Java and are the ones to reach for while iterating. The
emulator-backed browser tests live in `test/browser/emulator-matrix.spec.ts`; every other browser
spec replaces `src/firebase.ts` and `src/progress.ts` in the page, so it needs no infrastructure. See
[docs/adr/0001-stub-firebase-in-browser-tests.md](docs/adr/0001-stub-firebase-in-browser-tests.md).

If an emulator run fails with `Could not start Firestore Emulator, port taken`, an emulator from an
interrupted run is still holding port 8080; stop that process and retry.

Before production use:

- Enable Firebase Email/Password authentication and email-enumeration protection.
- Configure the production domain as an authorized domain and review the password-reset template and action URL.
- Create the owner account through the app. The approved-email check is only a convenience in the public client; Firestore rules remain the security boundary.
- Create the server-managed Firestore document `config/access` with `{ "approvedUid": "..." }`. Rules deny all progress until it exists, and clients cannot read or write this document.
- Build with `VITE_FIREBASE_USE_EMULATORS=false` and smoke-test sign-in and password reset against the production project.

Tauri v2 scaffolding lives in `src-tauri/`; install Rust and Tauri prerequisites before running it.

Run the release checks with `bun run release:check`, build with `bun run build`, then deploy the browser build with `firebase deploy --only hosting`.
