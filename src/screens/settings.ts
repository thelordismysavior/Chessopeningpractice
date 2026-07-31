import { app, bindMovePreference, loadMoveDuration, resetPageScroll, settingsPreferenceMarkup, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

export function renderSettings(navigate: Navigate, email: string | null): void {
  resetPageScroll();
  app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' }, links: [{ id: 'account', label: 'Account' }, { id: 'sources', label: 'Sources' }] })}<section class="settings-page"><p class="eyebrow">Device preference</p><h1>Set the tempo.</h1><p class="lede">Move Animation stays on this device. It never changes learning progress.</p><form class="settings-form settings-page-form" id="settings-page-form"><h2>Board tempo</h2>${settingsPreferenceMarkup(loadMoveDuration())}<button type="submit" id="save-settings">Save settings</button><p id="settings-saved" class="settings-saved" role="status" hidden>Settings saved.</p></form></section></main>`;
  app.querySelector('.settings-page > .eyebrow')?.replaceChildren('Practice preferences');
  app.querySelector('.settings-page > .lede')?.replaceChildren('Move Animation is yours to adjust. Reduced motion removes it without changing the Move Beat.');
  app.querySelector('#back-dashboard')?.addEventListener('click', () => void navigate({ name: 'dashboard' }));
  bindMovePreference(app);
  app.querySelector<HTMLFormElement>('#settings-page-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const saved = app.querySelector<HTMLElement>('#settings-saved');
    if (saved) { saved.hidden = false; saved.textContent = `Settings saved at ${loadMoveDuration()} ms.`; }
  });
}
