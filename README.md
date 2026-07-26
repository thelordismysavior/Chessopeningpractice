# Chess Practice

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local`, set Firebase project values and the owner's Google email. Keep `VITE_FIREBASE_USE_EMULATORS=true` for local work.

Run rules checks with `npm run test:rules`.

Before production use, create the server-managed Firestore document `config/access` with `{ "approvedUid": "..." }`. Rules deny all progress until it exists. The document is intentionally unreadable and unwritable by clients.

Tauri v2 scaffolding lives in `src-tauri/`; install Rust and Tauri prerequisites before running it.

Run the release checks with `npm run release:check`, build with `npm run build`, then deploy the browser build with `firebase deploy --only hosting`.
