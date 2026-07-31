import { ATTRIBUTION_SOURCES } from '../courses';
import { signOutUser } from '../firebase';
import { app, escapeHtml, resetPageScroll, topbarMarkup } from './shell';
import type { Navigate } from './navigation';

export async function renderSources(navigate: Navigate, email: string | null): Promise<void> {
  resetPageScroll();
  app.innerHTML = `<main class="app-shell">${topbarMarkup({ email, back: { id: 'back-dashboard', label: 'Dashboard' } })}<section class="sources-page"><p class="eyebrow">Sources &amp; attribution</p><h1>Openings, with a paper trail.</h1><p class="lede">The courses are fixed, local content. These references document the opening metadata and research behind them.</p><div class="source-list">${ATTRIBUTION_SOURCES.map((source) => `<article class="source-item"><div><h2>${escapeHtml(source.name)}</h2><p>${escapeHtml(source.description)}</p></div><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open source <span aria-hidden="true">-&gt;</span></a></article>`).join('')}</div></section></main>`;
  document.querySelector('#back-dashboard')!.addEventListener('click', () => void navigate({ name: 'dashboard' }));
  document.querySelector('#sign-out')?.addEventListener('click', () => void signOutUser());
}
