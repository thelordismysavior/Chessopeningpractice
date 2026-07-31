import { loadMoveDuration, saveMoveDuration } from '../move-settings';
import type { Course, LevelKey } from '../courses';
import { hashForRoute, HOME_HASH, type HashRoute } from '../router';

export const app = document.querySelector<HTMLDivElement>('#app')!;

export const levelNames: Record<LevelKey, string> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
export const sideNames: Record<Course['side'], string> = { white: 'W / WHITE', black: 'B / BLACK' };

export function escapeHtml(value: string | null): string {
  return (value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character);
}

export function resetPageScroll(): void {
  window.scrollTo(0, 0);
}

export type TopbarOptions = {
  email: string | null;
  back?: { id: string; label: string };
  wordmark?: boolean;
  links?: { id: string; label: string }[];
};

export function brandMarkup(): string {
  return '<span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="brand-name">LINE/64</span>';
}

export const backIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
export const settingsIcon = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>';

function topbarLink(link: { id: string; label: string }): string {
  if (link.id === 'courses-nav') return `<a id="courses-nav" href="${HOME_HASH}">${escapeHtml(link.label)}</a>`;
  const routes: Partial<Record<string, HashRoute>> = { account: { name: 'account' }, 'settings-link': { name: 'settings' }, browse: { name: 'browse' }, lines: { name: 'lines' }, sources: { name: 'sources' }, 'review-queue': { name: 'review-queue' }, 'queue-nav': { name: 'review-queue' } };
  const route = routes[link.id];
  return route
    ? `<a id="${link.id}" href="${hashForRoute(route)}" class="quiet-button">${escapeHtml(link.label)}</a>`
    : `<button id="${link.id}" class="quiet-button">${escapeHtml(link.label)}</button>`;
}

export function topbarMarkup(options: TopbarOptions): string {
  const back = options.back
    ? `<button id="${options.back.id}" class="back-button icon-button" aria-label="${escapeHtml(options.back.label)}">${backIcon}</button>`
    : '';
  const links = options.wordmark
    ? [{ id: 'courses-nav', label: 'Courses' }, ...(options.links ?? []).filter((link) => link.id === 'queue-nav' || link.id === 'account')]
    : options.links ?? [];
  const navigationMarkup = links.map(topbarLink).join('');
  const navigation = navigationMarkup ? `<nav class="topbar-nav" aria-label="Primary navigation">${navigationMarkup}</nav>` : '';
  const settings = options.wordmark && !links.some((link) => link.id === 'settings')
    ? `<button id="settings" class="icon-button" type="button" aria-label="Settings">${settingsIcon}</button>`
    : '';
  const brand = `<a class="wordmark" href="${HOME_HASH}">${brandMarkup()}</a>`;
  return `<header class="topbar${options.back ? ' has-back' : ''}"><div class="topbar-start">${back}</div>${brand}<div class="topbar-end">${navigation}${settings}</div></header>`;
}

export function settingsPreferenceMarkup(duration: number): string {
  return `<label for="move-duration">Move Animation (ms)</label><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><p class="settings-help">0–2000 ms in 50 ms steps. Move Animation is the visual slide of a piece.</p><div class="settings-glossary"><p><strong>Move Beat</strong> is the deliberate pause around an opponent reply. Reduced motion suppresses Move Animation but keeps the Move Beat.</p><p><strong>Tempo Cut</strong> ends the remaining Move Animation and Move Beat when you reach for the board. An explicit 0 ms preference suppresses both.</p></div>`;
}

export function progressResetMarkup(): string {
  return `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course's learning records: completed lines, counters, and review schedules. Device Move Animation preferences stay unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" aria-live="polite" aria-labelledby="reset-confirmation-title" hidden><p id="reset-confirmation-title">This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`;
}

export function settingsDialogMarkup(duration: number, includeProgressReset = false): string {
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="settings-form"><p class="eyebrow">Device preference</p><h2 id="settings-title">Settings</h2>${settingsPreferenceMarkup(duration)}${includeProgressReset ? progressResetMarkup() : ''}<a class="settings-route" href="#/settings">Open full Settings</a><button value="close">Done</button></form></dialog>`;
}

export function bindMovePreference(root: ParentNode, onChange: (duration: number) => void = () => undefined): void {
  const input = root.querySelector<HTMLInputElement>('#move-duration');
  if (!input) return;
  input.addEventListener('change', () => {
    const duration = saveMoveDuration(input.value);
    input.value = String(duration);
    onChange(duration);
  });
}

export function bindSettings(onChange: (duration: number) => void, resetProgress?: () => Promise<void>, afterReset?: () => void | Promise<void>): void {
  const dialog = app.querySelector<HTMLDialogElement>('#settings-dialog');
  const button = app.querySelector<HTMLButtonElement>('#settings');
  const input = app.querySelector<HTMLInputElement>('#move-duration');
  if (!dialog || !button || !input) return;
  button.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
  });
  bindMovePreference(app, onChange);
  if (resetProgress) bindProgressReset(async () => { await resetProgress(); dialog.close(); }, afterReset);
}

export function bindProgressReset(resetProgress: () => Promise<void>, afterReset?: () => void | Promise<void>): void {
  const showReset = app.querySelector<HTMLButtonElement>('#show-reset-progress');
  const confirmation = app.querySelector<HTMLElement>('#reset-progress-confirmation');
  const cancelReset = app.querySelector<HTMLButtonElement>('#cancel-reset-progress');
  const confirmReset = app.querySelector<HTMLButtonElement>('#confirm-reset-progress');
  const resetError = app.querySelector<HTMLElement>('#reset-progress-error');
  if (!showReset || !confirmation || !cancelReset || !confirmReset || !resetError) return;
  showReset.addEventListener('click', () => { showReset.hidden = true; confirmation.hidden = false; confirmReset.focus(); });
  cancelReset.addEventListener('click', () => { confirmation.hidden = true; showReset.hidden = false; resetError.hidden = true; showReset.focus(); });
  confirmReset.addEventListener('click', async () => {
    cancelReset.disabled = true;
    confirmReset.disabled = true;
    resetError.hidden = true;
    try {
      await resetProgress();
      await afterReset?.();
    } catch {
      resetError.hidden = false;
      cancelReset.disabled = false;
      confirmReset.disabled = false;
      confirmReset.focus();
    }
  });
}

export { loadMoveDuration };
