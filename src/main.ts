import './style.css';
import { signIn, signOutUser, watchUser } from './firebase';
import { app, escapeHtml, resetPageScroll } from './screens/shell';
import { renderDashboard } from './screens/dashboard';
import { renderSources } from './screens/sources';
import { startPractice } from './screens/practice';
import type { Navigate, Screen } from './screens/navigation';

let signedInEmail: string | null = null;

const navigate: Navigate = async (screen: Screen) => {
  switch (screen.name) {
    case 'dashboard':
      return renderDashboard(navigate, signedInEmail);
    case 'sources':
      return renderSources(navigate, signedInEmail);
    case 'practice':
      return startPractice(navigate, signedInEmail, screen);
    default:
      return renderDashboard(navigate, signedInEmail);
  }
};

function renderSignedOut(message = 'Private opening practice for one learner.') {
  resetPageScroll();
  app.innerHTML = `<main class="auth-page"><div class="brand-mark">CP</div><p class="eyebrow">A quieter way to learn openings</p><h1>Chess Practice</h1><p class="lede">${escapeHtml(message)}</p><button id="sign-in">Sign in with Google <span aria-hidden="true">-&gt;</span></button></main>`;
  document.querySelector('#sign-in')!.addEventListener('click', async () => {
    try {
      await signIn();
    } catch {
      renderSignedOut('Sign-in is unavailable right now. Check your connection and try again.');
    }
  });
}

function renderAuthError(message: string, retry: () => void) {
  resetPageScroll();
  app.innerHTML = `<main class="error-page"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
  document.querySelector('#retry-auth')!.addEventListener('click', retry);
}

function watchAuthentication() {
  watchUser((user) => {
    if (!user) return renderSignedOut();
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      void signOutUser();
      return renderSignedOut('This Google account is not approved.');
    }
    signedInEmail = user.email;
    void navigate({ name: 'dashboard' });
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

watchAuthentication();
