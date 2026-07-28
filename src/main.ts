import './style.css';
import { signOutUser, watchUser } from './firebase';
import { app, escapeHtml, resetPageScroll } from './screens/shell';
import { renderAuth, renderPendingApproval } from './screens/auth';
import { renderDashboard } from './screens/dashboard';
import { renderSources } from './screens/sources';
import { startPractice } from './screens/practice';
import { renderReviewQueue } from './screens/review-queue';
import { renderBrowse } from './screens/browse';
import type { Navigate, Screen } from './screens/navigation';

let signedInEmail: string | null = null;
let pendingApprovalUid: string | null = null;

const navigate: Navigate = async (screen: Screen) => {
  switch (screen.name) {
    case 'dashboard':
      return renderDashboard(navigate, signedInEmail);
    case 'sources':
      return renderSources(navigate, signedInEmail);
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
  renderAuth('signin', { onSignedUp });
}

function onSignedUp(uid: string): void {
  pendingApprovalUid = uid;
  void signOutUser();
}

function watchAuthentication() {
  watchUser((user) => {
    if (!user) {
      if (pendingApprovalUid) return renderPendingApproval(pendingApprovalUid, clearPending);
      return renderAuth('signin', { onSignedUp });
    }
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      void signOutUser();
      return;
    }
    signedInEmail = user.email;
    void navigate({ name: 'dashboard' });
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

watchAuthentication();
