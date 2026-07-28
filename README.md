# Chess Practice

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, set Firebase project values and the approved owner email. For local emulator work, put `VITE_FIREBASE_USE_EMULATORS=true` in `.env.development.local`; production builds ignore emulator wiring and should keep the value `false`.

Create the owner account through the app's **Create account** form using the email in `VITE_APPROVED_EMAIL`. After sign-up, set `config/access.approvedUid` to the UID shown on the approval screen; access remains blocked until that server-managed document is updated.

Run rules checks with `npm run test:rules`.

Before production use:

- Enable Firebase Email/Password authentication and email-enumeration protection.
- Configure the production domain as an authorized domain and review the password-reset template and action URL.
- Create the owner account through the app. The approved-email check is only a convenience in the public client; Firestore rules remain the security boundary.
- Create the server-managed Firestore document `config/access` with `{ "approvedUid": "..." }`. Rules deny all progress until it exists, and clients cannot read or write this document.
- Build with `VITE_FIREBASE_USE_EMULATORS=false` and smoke-test sign-in and password reset against the production project.

Tauri v2 scaffolding lives in `src-tauri/`; install Rust and Tauri prerequisites before running it.

Run the release checks with `npm run release:check`, build with `npm run build`, then deploy the browser build with `firebase deploy --only hosting`.
