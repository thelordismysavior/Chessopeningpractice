import { authErrorMessage } from '../auth-messages';
import { sendReset, signInWithEmail, signUpWithEmail } from '../firebase';
import { app, brandMarkup, escapeHtml, resetPageScroll } from './shell';

export type AuthMode = 'signin' | 'signup' | 'reset';

export type AuthOptions = {
  onSignUpStarted: () => void;
  onSignUpFailed: () => void;
  onSignedUp: (uid: string) => void;
};

const RESET_CONFIRMATION = 'If an account exists for that email, a reset link is on its way.';

function showError(message: string): void {
  const error = app.querySelector<HTMLElement>('#auth-error');
  if (!error) return;
  error.textContent = message;
  error.hidden = false;
  error.focus();
}

function clearError(): void {
  const error = app.querySelector<HTMLElement>('#auth-error');
  if (!error) return;
  error.textContent = '';
  error.hidden = true;
}

function hasErrorCode(error: unknown, expected: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { code?: unknown }).code === expected;
}

function submitLabel(button: HTMLButtonElement, label: string, arrow = false): void {
  button.innerHTML = `${escapeHtml(label)}${arrow ? ' <span aria-hidden="true">-&gt;</span>' : ''}`;
}

function authFurniture(title: string, lede: string, body: string, links: string): string {
  return `<main class="auth-page"><div class="brand-lockup">${brandMarkup()}</div><p class="eyebrow">A quieter way to learn openings</p><h1>${escapeHtml(title)}</h1><p class="lede">${escapeHtml(lede)}</p>${body}${links ? `<nav class="auth-links" aria-label="Account actions">${links}</nav>` : ''}</main>`;
}

function errorMarkup(): string {
  return '<p id="auth-error" class="auth-error" role="alert" aria-live="assertive" tabindex="-1" hidden></p>';
}

function bindModeLinks(options: AuthOptions): void {
  app.querySelectorAll<HTMLAnchorElement>('[data-auth-mode]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const mode = link.dataset.authMode;
      if (mode === 'signin' || mode === 'signup' || mode === 'reset') renderAuth(mode, options);
    });
  });
}

function signInMarkup(options: AuthOptions): void {
  app.innerHTML = authFurniture(
    'Chess Practice',
    'Private opening practice for one learner.',
    `<form id="auth-form" class="auth-form" novalidate><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" required aria-describedby="auth-error"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="current-password" required aria-describedby="auth-error">${errorMarkup()}<button type="submit" id="auth-submit" class="auth-submit">Sign in <span aria-hidden="true">-&gt;</span></button></form>`,
    '<a href="#create-account" data-auth-mode="signup">Create account</a><a href="#forgot-password" data-auth-mode="reset">Forgot password?</a>',
  );
  bindModeLinks(options);

  const form = app.querySelector<HTMLFormElement>('#auth-form')!;
  const email = app.querySelector<HTMLInputElement>('#auth-email')!;
  const password = app.querySelector<HTMLInputElement>('#auth-password')!;
  const button = app.querySelector<HTMLButtonElement>('#auth-submit')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      clearError();
      button.disabled = true;
      submitLabel(button, 'Signing in…', true);
      try {
        await signInWithEmail(email.value.trim(), password.value);
      } catch (error) {
        button.disabled = false;
        submitLabel(button, 'Sign in', true);
        showError(authErrorMessage(error));
      }
    })();
  });
}

function signUpMarkup(options: AuthOptions): void {
  app.innerHTML = authFurniture(
    'Create account',
    'Use the approved email to create the owner account.',
    `<form id="auth-form" class="auth-form" novalidate><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" required aria-describedby="auth-error"><label for="auth-password">Password</label><input id="auth-password" name="password" type="password" autocomplete="new-password" required aria-describedby="auth-error"><label for="auth-confirm-password">Confirm password</label><input id="auth-confirm-password" name="confirm-password" type="password" autocomplete="new-password" required aria-describedby="auth-error">${errorMarkup()}<button type="submit" id="auth-submit" class="auth-submit">Create account <span aria-hidden="true">-&gt;</span></button></form>`,
    '<a href="#signin" data-auth-mode="signin">Back to sign in</a>',
  );
  bindModeLinks(options);

  const form = app.querySelector<HTMLFormElement>('#auth-form')!;
  const email = app.querySelector<HTMLInputElement>('#auth-email')!;
  const password = app.querySelector<HTMLInputElement>('#auth-password')!;
  const confirmation = app.querySelector<HTMLInputElement>('#auth-confirm-password')!;
  const button = app.querySelector<HTMLButtonElement>('#auth-submit')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const normalizedEmail = email.value.trim();
    if (normalizedEmail !== import.meta.env.VITE_APPROVED_EMAIL) {
      showError("This email isn't approved for this app.");
      return;
    }
    if (password.value.length < 8) {
      showError('Use at least 8 characters.');
      return;
    }
    if (password.value !== confirmation.value) {
      showError("Those passwords don't match.");
      return;
    }

    void (async () => {
      clearError();
      button.disabled = true;
      submitLabel(button, 'Creating account...', true);
      options.onSignUpStarted();
      try {
        const credential = await signUpWithEmail(normalizedEmail, password.value);
        options.onSignedUp(credential.user.uid);
      } catch (error) {
        options.onSignUpFailed();
        button.disabled = false;
        submitLabel(button, 'Create account', true);
        showError(authErrorMessage(error));
      }
    })();
  });
}

function resetConfirmation(options: AuthOptions): void {
  app.innerHTML = authFurniture(
    'Check your inbox',
    'Password reset',
    `<section class="auth-confirmation"><p>${RESET_CONFIRMATION}</p><a href="#signin" data-auth-mode="signin">Back to sign in</a></section>`,
    '',
  );
  bindModeLinks(options);
}

function resetMarkup(options: AuthOptions): void {
  app.innerHTML = authFurniture(
    'Reset password',
    'We will send a reset link if an account exists for that email.',
    `<form id="auth-form" class="auth-form" novalidate><label for="auth-email">Email</label><input id="auth-email" name="email" type="email" autocomplete="email" required aria-describedby="auth-error">${errorMarkup()}<button type="submit" id="auth-submit" class="auth-submit">Send reset link</button></form>`,
    '<a href="#signin" data-auth-mode="signin">Back to sign in</a>',
  );
  bindModeLinks(options);

  const form = app.querySelector<HTMLFormElement>('#auth-form')!;
  const email = app.querySelector<HTMLInputElement>('#auth-email')!;
  const button = app.querySelector<HTMLButtonElement>('#auth-submit')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      clearError();
      button.disabled = true;
      submitLabel(button, 'Sending reset link...');
      try {
        await sendReset(email.value.trim());
        resetConfirmation(options);
      } catch (error) {
        if (hasErrorCode(error, 'auth/user-not-found')) {
          resetConfirmation(options);
          return;
        }
        button.disabled = false;
        submitLabel(button, 'Send reset link');
        showError(authErrorMessage(error));
      }
    })();
  });
}

export function renderAuth(mode: AuthMode, options: AuthOptions): void {
  resetPageScroll();
  document.title = `LINE/64 · ${mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}`;
  if (mode === 'signup') return signUpMarkup(options);
  if (mode === 'reset') return resetMarkup(options);
  return signInMarkup(options);
}

export function renderPendingApproval(uid: string, onBack: () => void): void {
  resetPageScroll();
  document.title = 'LINE/64 · Approval needed';
  app.innerHTML = `<main class="auth-page pending-page"><div class="brand-lockup">${brandMarkup()}</div><p class="eyebrow">A quieter way to learn openings</p><h1>Approval needed</h1><p class="lede">Your account was created, but access still needs to be approved before progress can be saved.</p><section class="pending-content"><p>Set <code>config/access.approvedUid</code> to this UID in the Firebase console:</p><code class="pending-uid" tabindex="0">${escapeHtml(uid)}</code><p>After approval, return here and sign in with your new password.</p><button type="button" id="back-to-signin" class="auth-submit">Back to sign in</button></section></main>`;
  app.querySelector<HTMLButtonElement>('#back-to-signin')!.addEventListener('click', onBack);
}
