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

function topbarLink(link: { id: string; label: string }): string {
  const routes: Partial<Record<string, HashRoute>> = { account: { name: 'account' }, 'settings-link': { name: 'settings' }, browse: { name: 'browse' }, sources: { name: 'sources' }, 'review-queue': { name: 'review-queue' }, 'queue-nav': { name: 'review-queue' } };
  const route = routes[link.id];
  return route
    ? `<a id="${link.id}" href="${hashForRoute(route)}" class="quiet-button">${escapeHtml(link.label)}</a>`
    : `<button id="${link.id}" class="quiet-button">${escapeHtml(link.label)}</button>`;
}

export function topbarMarkup(options: TopbarOptions): string {
  const lead = options.back
    ? `<div class="topbar-lead"><button id="${options.back.id}" class="back-button">&lt;- <span>${escapeHtml(options.back.label)}</span></button><a class="wordmark" href="${HOME_HASH}">${brandMarkup()}</a></div>`
    : options.wordmark
      ? `<a class="wordmark" href="${HOME_HASH}">${brandMarkup()}</a>`
      : '';
  const links = (options.links ?? []).map(topbarLink).join('');
  return `<header class="topbar">${lead}<div class="account">${links}<span>${escapeHtml(options.email) || 'owner'}</span><button id="sign-out" class="quiet-button">Sign out</button></div></header>`;
}

export function settingsPreferenceMarkup(duration: number): string {
  return `<label for="move-duration">Move Animation (ms)</label><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><p class="settings-help">0–2000 ms in 50 ms steps. Move Animation is the visual slide of a piece.</p><div class="settings-glossary"><p><strong>Move Beat</strong> is the deliberate pause around an opponent reply. Reduced motion suppresses Move Animation but keeps the Move Beat.</p><p><strong>Tempo Cut</strong> ends the remaining Move Animation and Move Beat when you reach for the board. An explicit 0 ms preference suppresses both.</p></div>`;
}

export function progressResetMarkup(): string {
  return `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course's learning records: completed lines, counters, and review schedules. Device Move Animation preferences stay unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" hidden><p>This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`;
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
