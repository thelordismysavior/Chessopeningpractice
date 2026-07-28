# 01 — Sign in with email and password, Google removed

Source spec: `docs/superpowers/specs/2026-07-28-email-password-auth.md`

**What to build:** The signed-out card stops offering Google and becomes an email and password
form. The owner types the approved email and their password, submits, and lands on the dashboard.
Bad credentials leave them on the form with a plain-language explanation and the ability to try
again. Google sign-in is gone from the codebase — no provider, no popup, no redirect fallback.

The card keeps the app's existing look: brand mark, eyebrow, headline, and lede all stay, with the
form beneath them. Two text links sit under the submit button — "Create account" and "Forgot
password?" — which are wired up in ticket 02 and may render as no-ops or be omitted until then.

The signed-out UI moves out of `main.ts` into its own screen module alongside the other screens.
`main.ts` keeps routing, the approved-email gate, and the auth-state watcher, and gets smaller
rather than larger. Nothing outside the auth screen should need to change, because the exported
Firebase surface used elsewhere (`auth`, `db`, `watchUser`, `signOutUser`) is untouched.

Error messages come from one shared mapping used by every auth mode, so ticket 02 inherits it.
Wrong password and unknown account report the same sentence. The legacy Firebase error codes are
mapped alongside the modern ones, because older emulator versions still return them.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The owner can sign in with email and password and reach the dashboard.
- [ ] Wrong credentials show "Email or password is incorrect." and the form stays usable.
- [ ] Invalid email, rate limiting, and network failure each show their own mapped message; any
      unrecognised code falls back to a generic one.
- [ ] The submit button disables and shows a pending label while the request is in flight, so a
      double-click cannot fire two sign-ins.
- [ ] The error region is announced to screen readers and receives focus on failure; inputs are
      labelled and carry the correct autocomplete hints.
- [ ] No Google auth provider, popup, or redirect call remains anywhere in `src/`.
- [ ] The approved-email gate still signs out any session whose email is not `VITE_APPROVED_EMAIL`.
- [ ] The form is styled consistently with the existing settings inputs, in light and dark mode,
      and the text links are not styled as orange pills.
- [ ] Browser test stubs no longer export the removed `signIn` and instead expose the new wrappers
      with per-test control over success and failure.
- [ ] Emulator tests cover a successful sign-in and a wrong-password rejection, asserting the error
      codes the message mapping depends on.
- [ ] A browser test drives the real form through both a successful and a failed sign-in.
