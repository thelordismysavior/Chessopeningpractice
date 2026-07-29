import { signOutUser } from '../firebase';
import { loadMoveDuration, saveMoveDuration } from '../move-settings';
import type { Course, LevelKey } from '../courses';
import type { Navigate, PrimaryDestination } from './navigation';

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
  active: PrimaryDestination;
  reviewCount?: number;
  back?: { id: string; label: string };
};

const destinations: { name: PrimaryDestination; label: string; id: string }[] = [
  { name: 'home', label: 'Home', id: 'nav-home' },
  { name: 'learn', label: 'Learn', id: 'browse' },
  { name: 'drill', label: 'Drill', id: 'nav-drill' },
  { name: 'review', label: 'Review', id: 'review-queue' },
];

function destinationButton(
  destination: (typeof destinations)[number],
  active: PrimaryDestination,
  reviewCount: number,
  mobile = false,
): string {
  const selected = destination.name === active;
  const badge = destination.name === 'review' && reviewCount > 0
    ? `<span class="nav-badge" aria-label="${reviewCount} due">${reviewCount}</span>`
    : '';
  const id = mobile ? `mobile-${destination.id}` : destination.id;
  return `<button id="${id}" class="nav-item" data-nav="${destination.name}"${selected ? ' aria-current="page"' : ''}><span>${destination.label}</span>${badge}</button>`;
}

export function topbarMarkup(options: TopbarOptions): string {
  const reviewCount = options.reviewCount ?? 0;
  const nav = destinations.map((destination) => destinationButton(destination, options.active, reviewCount)).join('');
  const mobileNav = destinations.map((destination) => destinationButton(destination, options.active, reviewCount, true)).join('');
  const back = options.back
    ? `<button id="${options.back.id}" class="back-button"><span aria-hidden="true">←</span> ${escapeHtml(options.back.label)}</button>`
    : '<span class="topbar-context">Opening repertoire</span>';
  return `<header class="topbar"><a class="wordmark" href="#" data-nav="home" aria-label="LINE 64 home">LINE<span>/</span>64</a><nav class="desktop-nav" aria-label="Primary">${nav}</nav><button id="settings" class="settings-button" aria-haspopup="dialog">Settings</button></header><div class="context-bar">${back}</div><nav class="bottom-nav" aria-label="Primary">${mobileNav}</nav>`;
}

export function settingsDialogMarkup(duration: number, email: string | null, includeProgressReset = false): string {
  const reset = includeProgressReset
    ? `<section class="reset-progress" aria-labelledby="reset-progress-title"><h3 id="reset-progress-title">Progress</h3><p>Clear every course and return to Beginner. Your Move Animation preference stays unchanged.</p><button type="button" id="show-reset-progress" class="danger-button">Reset all progress</button><div id="reset-progress-confirmation" class="reset-confirmation" hidden><p>This cannot be undone.</p><div class="settings-actions"><button type="button" id="cancel-reset-progress" class="quiet-button">Cancel</button><button type="button" id="confirm-reset-progress" class="danger-button">Reset progress</button></div></div><p id="reset-progress-error" role="alert" hidden>Progress could not be reset. Check your connection and try again.</p></section>`
    : '';
  return `<dialog id="settings-dialog" aria-labelledby="settings-title"><form method="dialog" class="settings-form"><div class="settings-heading"><div><p class="eyebrow">LINE/64 · Device</p><h2 id="settings-title">Settings</h2></div><button type="button" id="close-settings" class="dialog-close" aria-label="Close settings">Close</button></div><label for="move-duration">Move Animation</label><div class="duration-field"><input id="move-duration" name="move-duration" type="number" min="0" max="2000" step="50" value="${duration}"><span>ms</span></div><p class="settings-help">Controls learner moves, opponent replies, captures, and castling. Set to zero for no tempo.</p>${reset}<section class="settings-account" aria-labelledby="account-title"><h3 id="account-title">Account</h3><p>${escapeHtml(email) || 'Owner'}</p><div class="settings-links"><button type="button" id="sources" class="quiet-button">Sources &amp; attribution</button><button type="button" id="sign-out" class="quiet-button">Sign out</button></div></section><button value="close" class="settings-done">Done</button></form></dialog>`;
}

export function bindPrimaryNavigation(navigate: Navigate): void {
  app.querySelectorAll<HTMLElement>('[data-nav]').forEach((control) => control.addEventListener('click', (event) => {
    event.preventDefault();
    const destination = control.dataset.nav as PrimaryDestination;
    if (destination === 'home') void navigate({ name: 'dashboard' });
    if (destination === 'learn') void navigate({ name: 'browse' });
    if (destination === 'drill') void navigate({ name: 'drill' });
    if (destination === 'review') void navigate({ name: 'review-queue' });
  }));
}

export function bindSettings(
  onChange: (duration: number) => void,
  resetProgress?: () => Promise<void>,
  afterReset?: () => void | Promise<void>,
  navigate?: Navigate,
  accountActions?: { onSources?: () => void; onSignOut?: () => void },
): void {
  const dialog = app.querySelector<HTMLDialogElement>('#settings-dialog');
  const button = app.querySelector<HTMLButtonElement>('#settings');
  const input = app.querySelector<HTMLInputElement>('#move-duration');
  if (!dialog || !button || !input) return;
  button.addEventListener('click', () => {
    if (!dialog.open) dialog.showModal();
  });
  app.querySelector<HTMLButtonElement>('#close-settings')?.addEventListener('click', () => dialog.close());
  app.querySelector<HTMLButtonElement>('#sources')?.addEventListener('click', () => {
    dialog.close();
    if (accountActions?.onSources) accountActions.onSources();
    else if (navigate) void navigate({ name: 'sources' });
  });
  app.querySelector<HTMLButtonElement>('#sign-out')?.addEventListener('click', () => {
    if (accountActions?.onSignOut) accountActions.onSignOut();
    else void signOutUser();
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
