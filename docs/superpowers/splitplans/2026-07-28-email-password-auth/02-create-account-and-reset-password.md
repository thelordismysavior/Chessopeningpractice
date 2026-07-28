# 02 — Create the owner account and reset a forgotten password

Source spec: `docs/superpowers/specs/2026-07-28-email-password-auth.md`

**What to build:** The two text links added in ticket 01 start working, swapping the card's form in
place rather than navigating anywhere.

"Create account" shows email, password, and confirm-password fields. Three checks run before
Firebase is contacted: the email must be the approved one, the password must be at least eight
characters, and the two passwords must match. Each failure explains itself. The email check exists
only to stop dead accounts accumulating in the Firebase project — the approved-email gate in the
auth watcher remains the real boundary.

Creating an account signs the new user in immediately, but Firestore rules will deny all of their
writes until `config/access.approvedUid` names their UID, and that document cannot be written by a
client. So a successful sign-up does not drop the owner on a dashboard that silently fails to save.
Instead the app signs them back out and shows an approval-pending screen that explains access still
needs granting and displays the new UID in a selectable block for pasting into the console. A "Back
to sign in" button returns to the sign-in form and clears the pending state.

"Forgot password?" shows a single email field and sends a Firebase reset email. It reports the same
neutral confirmation whether or not an account exists, so the form cannot be used to discover
whether a given email is registered. Invalid input, throttling, network failures, and unknown
operational failures surface through the shared error mapping.

The README gains a short note explaining that the owner account is created through the app's
sign-up form and that `config/access.approvedUid` must then be set to the UID shown on the approval
screen.

**Blocked by:** 01 — Sign in with email and password, Google removed.

**Status:** ready-for-agent

- [ ] "Create account" and "Forgot password?" swap the card's form in place, and both can return to
      sign-in.
- [ ] Sign-up with an unapproved email is rejected before any Firebase call is made.
- [ ] A password under eight characters, or a mismatched confirmation, is rejected with its own
      message.
- [ ] Attempting to sign up with an email that already has an account explains that and points the
      user at sign-in.
- [ ] A successful sign-up ends on the approval-pending screen, not the dashboard, with the new UID
      visible and selectable.
- [ ] "Back to sign in" from the approval screen returns to the sign-in form and does not reappear
      afterwards.
- [ ] The reset form shows an identical confirmation for a registered and an unregistered email.
- [ ] Both new modes reuse the error-message mapping from ticket 01 rather than defining their own.
- [ ] Emulator tests cover account creation, signing in with the created account, and a duplicate
      email rejection.
- [ ] Browser tests drive the unapproved-email rejection, a completed sign-up reaching the approval
      screen, and the reset confirmation.
- [ ] The README documents the sign-up and manual approval step.
