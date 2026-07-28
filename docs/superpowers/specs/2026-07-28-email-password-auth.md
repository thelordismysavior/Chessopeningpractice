# Email/Password Authentication

Status: approved-design

## Context

The app authenticates the single owner through Google. `src/firebase.ts` exports
`signIn = () => signInWithPopup(auth, googleProvider).catch(() => signInWithRedirect(...))`, and
`src/main.ts` renders a one-button card offering "Sign in with Google". Two gates sit behind that
button: `main.ts` signs out any user whose `email` is not `VITE_APPROVED_EMAIL`, and
`firestore.rules` denies every progress read and write unless `request.auth.uid` matches
`config/access.approvedUid`, a document no client can read or write.

The Google dependency is being dropped in favour of a standard email and password form, with
in-app account creation and a password-reset link.

Two pieces of the repo already speak email/password to the Firebase auth emulator and confirm the
approach works locally: `test/auth.test.ts` calls `createUserWithEmailAndPassword`, and
`test/browser/auth-bridge.ts` calls `signInWithEmailAndPassword`.

## Problem

**Google is the only way in.** Removing it means the app needs its own credential form, its own
validation, and its own error vocabulary — none of which exists today, because the current card
delegates all of that to Google's popup.

**Account creation has nowhere to live.** The owner account is currently whatever Google account
matches `VITE_APPROVED_EMAIL`. With passwords, an account must be created explicitly, and the app
should be the place that happens rather than the Firebase console.

**Sign-up produces an unusable session.** `createUserWithEmailAndPassword` mints a new UID and
signs that user straight in. Firestore rules will deny all of their writes until
`config/access.approvedUid` is set to the new UID by hand. Without special handling, a freshly
registered owner lands on a dashboard where nothing saves and no message explains why.

## Decisions

- Google sign-in is removed entirely. Email/password is the only method.
- Sign-up is available in the app, restricted to the approved email.
- A "forgot password" link sends a Firebase reset email.
- After sign-up the app shows an approval-pending screen displaying the new UID, rather than
  dropping the user on a dashboard that cannot save.
- The auth card is one card with a form that swaps between three modes in place, not tabs and not
  separate routes.
- The signed-out UI moves into a new screen module, `src/screens/auth.ts`, following the existing
  `src/screens/*` pattern.

## Design

### `src/firebase.ts`

Remove the `GoogleAuthProvider` import, `signInWithPopup`, `signInWithRedirect`, the exported
`googleProvider`, and `signIn`. Add three wrappers that do nothing but call the SDK and return its
promise:

```ts
export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);
export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);
export const sendReset = (email: string) => sendPasswordResetEmail(auth, email);
```

`auth`, `db`, `watchUser`, `signOutUser`, the `browserLocalPersistence` call, and the emulator
wiring are unchanged. No module outside the auth screen is affected.

### `src/screens/auth.ts` (new)

Owns the entire signed-out card. Public surface:

```ts
export type AuthMode = 'signin' | 'signup' | 'reset';
export function renderAuth(mode: AuthMode, options: AuthOptions): void;
export function renderPendingApproval(uid: string, onBack: () => void): void;
```

`AuthOptions` carries one callback, `onSignedUp(uid: string): void`, supplied by `main.ts`.

Switching modes is a re-render — `renderAuth` writes the card's markup for the requested mode and
binds that mode's handlers. No mode state is retained between renders, so there is nothing to keep
in sync. Dependencies are `shell.ts` (`app`, `escapeHtml`, `resetPageScroll`) and the three
firebase wrappers. The module does no routing and knows nothing about courses or progress.

All three modes keep the existing card furniture: `.brand-mark`, `.eyebrow`, `h1`, `.lede`.

### `src/main.ts`

`renderSignedOut` is deleted. `watchAuthentication`, the `VITE_APPROVED_EMAIL` gate,
`renderAuthError`, and routing stay as they are. `main.ts` gains one module-level variable,
`pendingApprovalUid: string | null`, and the watcher's null-user branch becomes:

```ts
if (!user) {
  if (pendingApprovalUid) return renderPendingApproval(pendingApprovalUid, clearPending);
  return renderAuth('signin', { onSignedUp });
}
```

`onSignedUp(uid)` sets `pendingApprovalUid = uid` and calls `signOutUser()`; the resulting null-user
event renders the approval screen. `clearPending` sets the variable back to `null` and renders the
sign-in card. The approved-email gate stays in the watcher so it applies regardless of how the
session was established.

### Sign-in mode

A `<form>` with labelled email and password inputs (`type="email"` with `autocomplete="email"`,
`type="password"` with `autocomplete="current-password"`), a submit button, and two text links:
"Create account" (to signup mode) and "Forgot password?" (to reset mode).

On submit the button disables and its label becomes "Signing in…", which also prevents a double
submit. Success requires no navigation code: the existing `watchUser` callback fires and routes to
the dashboard. Failure re-enables the button and writes the message into a `role="alert"` region
that then receives focus.

### Sign-up mode

Email, password, and confirm-password inputs (`autocomplete="new-password"` on both password
fields). Three client-side checks run before Firebase is called:

| Condition | Message |
| --- | --- |
| Email is not `VITE_APPROVED_EMAIL` | This email isn't approved for this app. |
| Password shorter than 8 characters | Use at least 8 characters. |
| Passwords differ | Those passwords don't match. |

The email check exists only to avoid creating dead accounts in the Firebase project; the watcher's
approved-email gate remains the real security boundary. On success the handler calls
`onSignedUp(credential.user.uid)`.

### Approval-pending screen

Reached only after a successful sign-up. It states that the account was created and that access
must still be approved, displays the UID in a selectable `<code>` block for pasting into
`config/access.approvedUid`, and offers a "Back to sign in" button wired to `clearPending`.

### Reset mode

A single email field and a "Send reset link" button. On success — and on `auth/user-not-found`,
which is treated as success — it replaces the form with "If an account exists for that email, a
reset link is on its way." plus a link back to sign-in. Reporting both cases identically prevents
the form being used to discover whether an account exists. Only network failure surfaces as an
error.

### Error message mapping

A single map from Firebase error code to sentence, shared by all three modes:

| Code | Message |
| --- | --- |
| `auth/invalid-email` | That doesn't look like an email address. |
| `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password` | Email or password is incorrect. |
| `auth/email-already-in-use` | An account already exists for this email — sign in instead. |
| `auth/weak-password` | Use at least 8 characters. |
| `auth/too-many-requests` | Too many attempts. Wait a minute and try again. |
| `auth/network-request-failed` | Can't reach the server. Check your connection. |
| anything else | Something went wrong. Try again. |

Incorrect password and unknown account deliberately share one message. `user-not-found` and
`wrong-password` are included alongside `invalid-credential` because older emulator versions still
return the legacy codes.

### Styling

New CSS is a small `.auth-form` block reusing the input treatment already proven in
`.settings-form`: same `#cfc9bd` border, 8px radius, `#f3f0e8` fill, and `3px solid #d46b3d` focus
ring. `.auth-links` lays out the two text links; `.auth-error` uses the existing `#a4473e` red.
Dark-mode overrides go beside the existing `@media (prefers-color-scheme: dark)` rules and reuse
the settings-input colours (`#657078` border, `#24333d` fill, `#f3f0e8` text).

The existing `.auth-page button` rule styles every button in the card as an orange pill, and
`.auth-page button span` adds the arrow's left margin. Both are scoped so the primary submit keeps
the pill while the text links do not inherit it.

## Testing

**Emulator unit tests.** `test/auth.test.ts` extends to cover sign-up, sign-in with the created
account, sign-in with a wrong password, and a duplicate-email sign-up, asserting the error codes
the mapping table depends on.

**Browser stubs.** `test/browser/app-stubs.ts` currently stubs `src/firebase.ts` with an exported
`signIn`, which will no longer exist. It is updated to export `signInWithEmail`, `signUpWithEmail`,
and `sendReset`, with per-test control over whether each resolves or rejects (and with which
code).

**Playwright specs.** Driving the real DOM: a successful sign-in reaches the dashboard; bad
credentials show the mapped message and leave the form usable; switching to sign-up and entering an
unapproved email is rejected without calling Firebase; a completed sign-up lands on the approval
screen with the UID visible; the reset form shows its neutral confirmation.

**Bridge cleanup.** `test/browser/auth-bridge.ts` calls `signInWithEmailAndPassword` directly today
and is simplified to call the new `signInWithEmail` wrapper.

## Documentation

`README.md` gains a short note: the owner account is created through the app's sign-up form, and
`config/access.approvedUid` must then be set to the UID shown on the approval screen. `.env.example`
is unchanged — `VITE_APPROVED_EMAIL` keeps its meaning.

## Out of scope

- Email verification.
- Multi-user support. The app stays single-owner.
- Changing `firestore.rules`. The UID-based gate stays as it is.
- Account deletion or in-app password change for a signed-in user.
