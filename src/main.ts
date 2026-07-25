import './style.css';
import { signIn, signOutUser, watchUser } from './firebase';

const app = document.querySelector<HTMLDivElement>('#app')!;

function renderSignedOut(message = 'Private opening practice for one learner.') {
  app.innerHTML = `<main><h1>Chess Practice</h1><p>${message}</p><button id="sign-in">Sign in with Google</button></main>`;
  document.querySelector('#sign-in')!.addEventListener('click', () => void signIn());
}

function renderSignedIn(email: string | null) {
  app.innerHTML = `<main><header><div><h1>Chess Practice</h1><p>Signed in as ${email ?? 'owner'}</p></div><button id="sign-out">Sign out</button></header><section class="card"><h2>Your dashboard</h2><p>Your private courses will appear here.</p></section></main>`;
  document.querySelector('#sign-out')!.addEventListener('click', () => void signOutUser());
}

watchUser((user) => {
  if (!user) return renderSignedOut();
  if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
    void signOutUser();
    return renderSignedOut('This Google account is not approved.');
  }
  renderSignedIn(user.email);
});
