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
  const routes: Partial<Record<string, HashRoute>> = { browse: { name: 'browse' }, sources: { name: 'sources' }, 'review-queue': { name: 'review-queue' }, 'queue-nav': { name: 'review-queue' } };
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

export function settingsDialogMarkup(duration: number, includeProgressReset = false): string {
  const reset = includeProgressReset
    ? `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course and start again from Beginner. Move duration stays unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" hidden><p>This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`
    : '';
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="settings-form"><p class="eyebrow">Device preference</p><h2 id="settings-title">Settings</h2><label for="move-duration">Move duration (ms)</label><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><p class="settings-help">Used for learner moves, opponent replies, captures, and castling.</p>${reset}<button value="close">Done</button></form></dialog>`;
}

export function bindSettings(onChange: (duration: number) => void, resetProgress?: () => Promise<void>, afterReset?: () => void | Promise<void>): void {
  const dialog = app.querySelector<HTMLDialogElement>('#settings-dialog');
  const button = app.querySelector<HTMLButtonElement>('#settings');
  const input = app.querySelector<HTMLInputElement>('#move-duration');
  if (!dialog || !button || !input) return;
  button.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
  });
  const update = () => {
    const duration = saveMoveDuration(input.value);
    input.value = String(duration);
    onChange(duration);
  };
  input.addEventListener('change', update);
  const showReset = app.querySelector<HTMLButtonElement>('#show-reset-progress');
  const confirmation = app.querySelector<HTMLElement>('#reset-progress-confirmation');
  const cancelReset = app.querySelector<HTMLButtonElement>('#cancel-reset-progress');
  const confirmReset = app.querySelector<HTMLButtonElement>('#confirm-reset-progress');
  const resetError = app.querySelector<HTMLElement>('#reset-progress-error');
  if (!resetProgress || !showReset || !confirmation || !cancelReset || !confirmReset || !resetError) return;

  showReset.addEventListener('click', () => {
    showReset.hidden = true;
    confirmation.hidden = false;
    confirmReset.focus();
  });
  cancelReset.addEventListener('click', () => {
    confirmation.hidden = true;
    showReset.hidden = false;
    resetError.hidden = true;
    showReset.focus();
  });
  confirmReset.addEventListener('click', async () => {
    cancelReset.disabled = true;
    confirmReset.disabled = true;
    resetError.hidden = true;
    try {
      await resetProgress();
      dialog.close();
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
