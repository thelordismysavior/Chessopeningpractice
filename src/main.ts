import './style.css';
import { signOutUser, watchUser } from './firebase';
import { COURSES, coursesById } from './courses';
import { loadProgress } from './progress';
import { reviewQueue } from './review-queue';
import { hashForRoute, hashForScreen, HOME_HASH, parseHash, type HashRoute } from './router';
import { app, escapeHtml, resetPageScroll } from './screens/shell';
import { renderAuth, renderPendingApproval, type AuthOptions } from './screens/auth';
import { renderDashboard } from './screens/dashboard';
import { renderSettings } from './screens/settings';
import { renderAccount } from './screens/account';
import { renderSources } from './screens/sources';
import { startPractice } from './screens/practice';
import { renderReviewQueue } from './screens/review-queue';
import { renderBrowse } from './screens/browse';
import type { Navigate, Screen } from './screens/navigation';

let signedInEmail: string | null = null;
let pendingApprovalUid: string | null = null;
let signUpInProgress = false;
let routeGeneration = 0;
let skipNextHashRender = false;

async function renderScreen(screen: Screen): Promise<void> {
  switch (screen.name) {
    case 'dashboard':
      return renderDashboard(navigate, signedInEmail);
    case 'settings':
      return renderSettings(navigate, signedInEmail);
    case 'account':
      return renderAccount(navigate, signedInEmail);
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
}

async function screenForRoute(route: HashRoute): Promise<Screen> {
  if (route.name === 'dashboard') return { name: 'dashboard' };
  if (route.name === 'settings') return { name: 'settings' };
  if (route.name === 'account') return { name: 'account' };
  if (route.name === 'sources') return { name: 'sources' };
  if (route.name === 'review-queue') return { name: 'review-queue' };
  if (route.name === 'browse') return { name: 'browse', courseId: route.courseId, lineId: route.lineId };

  const course = coursesById[route.courseId];
  const progress = await loadProgress(course.id);
  if (route.runIndex === undefined) {
    return {
      name: 'practice',
      course,
      level: route.level,
      progress,
      variationId: route.variationId,
      reviewPositionIds: route.reviewPositionIds,
      entryHandoff: route.entryHandoff,
    };
  }
  const entries = await Promise.all(COURSES.map(async (candidate) => [candidate.id, await loadProgress(candidate.id)] as const));
  const progressByCourse = Object.fromEntries(entries) as Parameters<typeof reviewQueue>[0];
  const groups = route.runGroups ?? reviewQueue(progressByCourse).dueGroups;
  const group = groups[route.runIndex];
  return {
    name: 'practice',
    course,
    level: route.level,
    progress,
    variationId: route.variationId,
    reviewPositionIds: route.reviewPositionIds ?? group?.positionIds,
    run: group ? { groups, index: route.runIndex } : undefined,
    entryHandoff: route.entryHandoff,
  };
}

async function renderCurrentRoute(): Promise<void> {
  const generation = ++routeGeneration;
  const route = parseHash(window.location.hash);
  const canonicalHash = hashForRoute(route);
  document.title = `LINE/64 · ${route.name === 'dashboard' ? 'Home' : route.name === 'review-queue' ? 'Review queue' : route.name[0].toUpperCase() + route.name.slice(1)}`;
  if (window.location.hash !== canonicalHash) window.history.replaceState(null, '', canonicalHash);
  try {
    const screen = await screenForRoute(route);
    if (generation !== routeGeneration) return;
    await renderScreen(screen);
  } catch (error) {
    if (generation !== routeGeneration) return;
    app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">LINE/64 unavailable</p><h1>Your repertoire is still here.</h1><p class="lede">${escapeHtml(error instanceof Error ? error.message : 'Check your connection and try again.')}</p><button id="retry-route">Try again</button></main>`;
    document.querySelector('#retry-route')!.addEventListener('click', () => void renderCurrentRoute());
  }
}

const navigate: Navigate = async (screen: Screen) => {
  const nextHash = hashForScreen(screen);
  if (window.location.hash !== nextHash) {
    if (screen.name === 'browse' && screen.lineId) skipNextHashRender = true;
    window.location.hash = nextHash;
    return;
  }
  await renderCurrentRoute();
};

function renderAuthError(message: string, retry: () => void) {
  resetPageScroll();
  document.title = 'LINE/64 · Error';
  app.innerHTML = `<main class="error-page"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
  document.querySelector('#retry-auth')!.addEventListener('click', retry);
}

function clearPending(): void {
  pendingApprovalUid = null;
  renderAuth('signin', authOptions);
}

function onSignUpStarted(): void {
  signUpInProgress = true;
}

function onSignUpFailed(): void {
  signUpInProgress = false;
}

async function finishPendingApproval(uid: string): Promise<void> {
  pendingApprovalUid = uid;
  try {
    await signOutUser();
    signUpInProgress = false;
    renderPendingApproval(uid, clearPending);
  } catch {
    renderAuthError(
      "Your account was created, but we couldn't finish signing out. Try again to continue to approval.",
      () => void finishPendingApproval(uid),
    );
  }
}

function onSignedUp(uid: string): void {
  void finishPendingApproval(uid);
}

async function signOutUnapprovedUser(): Promise<void> {
  try {
    await signOutUser();
  } catch {
    renderAuthError(
      "This account isn't approved, and we couldn't finish signing it out. Check your connection and try again.",
      () => void signOutUnapprovedUser(),
    );
  }
}

const authOptions: AuthOptions = { onSignUpStarted, onSignUpFailed, onSignedUp };

function watchAuthentication() {
  watchUser((user) => {
    if (signUpInProgress) return;
    if (!user) {
      signedInEmail = null;
      if (window.location.hash !== HOME_HASH) window.history.replaceState(null, '', HOME_HASH);
      if (pendingApprovalUid) return renderPendingApproval(pendingApprovalUid, clearPending);
      return renderAuth('signin', authOptions);
    }
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      void signOutUnapprovedUser();
      return;
    }
    signedInEmail = user.email;
    void renderCurrentRoute();
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

window.addEventListener('hashchange', () => {
  if (skipNextHashRender) {
    skipNextHashRender = false;
    return;
  }
  if (signedInEmail) void renderCurrentRoute();
});

watchAuthentication();
