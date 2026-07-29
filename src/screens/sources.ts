import { ATTRIBUTION_SOURCES } from '../courses';
import { app, bindPrimaryNavigation, bindSettings, escapeHtml, loadMoveDuration, resetPageScroll, settingsDialogMarkup, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

export async function renderSources(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, active: 'learn', back: { id: 'back-dashboard', label: 'Home' } })}<section class="sources-page"><p class="eyebrow">Sources · Attribution</p><h1>Every line has<br>a paper trail.</h1><p class="lede">The repertoire is fixed local content. These references document the opening metadata and research behind it.</p><div class="source-list">${ATTRIBUTION_SOURCES.map((source) => `<article class="source-item"><div><h2>${escapeHtml(source.name)}</h2><p>${escapeHtml(source.description)}</p></div><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open source</a></article>`).join('')}</div></section>${settingsDialogMarkup(loadMoveDuration(), email)}</main>`;
  document.querySelector('#back-dashboard')!.addEventListener('click', () => void navigate({ name: 'dashboard' }));
  bindPrimaryNavigation(navigate);
  bindSettings(() => undefined, undefined, undefined, navigate);
}
