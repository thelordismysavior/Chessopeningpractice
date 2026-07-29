import './style.css';
import { signOutUser, watchUser } from './firebase';
import { app, escapeHtml, resetPageScroll } from './screens/shell';
import { renderAuth, renderPendingApproval, type AuthOptions } from './screens/auth';
import { renderDashboard } from './screens/dashboard';
import { renderSources } from './screens/sources';
import { startPractice } from './screens/practice';
import { renderReviewQueue } from './screens/review-queue';
import { renderBrowse } from './screens/browse';
import { renderDrillLauncher } from './screens/drill';
import type { Navigate, Screen } from './screens/navigation';

let signedInEmail: string | null = null;
let pendingApprovalUid: string | null = null;
let signUpInProgress = false;

const navigate: Navigate = async (screen: Screen) => {
  switch (screen.name) {
    case 'dashboard':
      return renderDashboard(navigate, signedInEmail);
    case 'sources':
      return renderSources(navigate, signedInEmail);
    case 'drill':
      return renderDrillLauncher(navigate, signedInEmail);
    case 'practice':
      return startPractice(navigate, signedInEmail, screen);
    case 'review-queue':
      return renderReviewQueue(navigate, signedInEmail);
    case 'browse':
      return renderBrowse(navigate, signedInEmail, screen);
    default:
      return renderDashboard(navigate, signedInEmail);
  }
};

function renderAuthError(message: string, retry: () => void) {
  resetPageScroll();
  app.innerHTML = `<main class="error-page"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
  document.querySelector('#retry-auth')!.addEventListener('click', retry);
}

function clearPending(): void {
  pendingApprovalUid = null;
  renderAuth('signin', authOptions);
}

function onSignUpStarted(): void {
  signUpInProgress = true;
}

function onSignUpFailed(): void {
  signUpInProgress = false;
}

async function finishPendingApproval(uid: string): Promise<void> {
  pendingApprovalUid = uid;
  try {
    await signOutUser();
    signUpInProgress = false;
    renderPendingApproval(uid, clearPending);
  } catch {
    renderAuthError(
      "Your account was created, but we couldn't finish signing out. Try again to continue to approval.",
      () => void finishPendingApproval(uid),
    );
  }
}

function onSignedUp(uid: string): void {
  void finishPendingApproval(uid);
}

async function signOutUnapprovedUser(): Promise<void> {
  try {
    await signOutUser();
  } catch {
    renderAuthError(
      "This account isn't approved, and we couldn't finish signing it out. Check your connection and try again.",
      () => void signOutUnapprovedUser(),
    );
  }
}

const authOptions: AuthOptions = { onSignUpStarted, onSignUpFailed, onSignedUp };

function watchAuthentication() {
  watchUser((user) => {
    if (signUpInProgress) return;
    if (!user) {
      signedInEmail = null;
      if (pendingApprovalUid) return renderPendingApproval(pendingApprovalUid, clearPending);
      return renderAuth('signin', authOptions);
    }
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      void signOutUnapprovedUser();
      return;
    }
    signedInEmail = user.email;
    void navigate({ name: 'dashboard' });
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

watchAuthentication();
