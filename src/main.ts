import './style.css';
import { signOutUser, watchUser } from './firebase';
import { COURSES, coursesById } from './courses';
import { loadProgress } from './progress';
import { courseReview, reviewQueue } from './review-queue';
import { positionIsDue } from './review-schedule';
import { hashForRoute, hashForScreen, HOME_HASH, parseHash, type HashRoute } from './router';
import { app, escapeHtml, resetPageScroll } from './screens/shell';
import { renderAuth, renderPendingApproval, type AuthOptions } from './screens/auth';
import { renderDashboard } from './screens/dashboard';
import { renderCourse } from './screens/course';
import { renderLines } from './screens/lines';
import { renderSettings } from './screens/settings';
import { renderAccount } from './screens/account';
import { renderSources } from './screens/sources';
import { startPractice } from './screens/practice';
import { renderReviewQueue } from './screens/review-queue';
import { renderBrowse } from './screens/browse';
import { renderResult } from './screens/result';
import { loadResultSummary } from './result';
import { disposeActiveLinePreview } from './line-preview';
import type { Navigate, Screen } from './screens/navigation';

let signedInEmail: string | null = null;
let pendingApprovalUid: string | null = null;
let signUpInProgress = false;
let routeGeneration = 0;

async function renderScreen(screen: Screen): Promise<void> {
  switch (screen.name) {
    case 'dashboard':
      return renderDashboard(navigate, signedInEmail);
    case 'course':
      return renderCourse(navigate, signedInEmail, screen);
    case 'lines':
      return renderLines(navigate, signedInEmail);
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
    case 'result':
      return renderResult(navigate, signedInEmail, screen.summary);
    case 'browse':
      return renderBrowse(navigate, signedInEmail, screen);
    default:
      return renderDashboard(navigate, signedInEmail);
  }
}

async function screenForRoute(route: HashRoute): Promise<Screen> {
  if (route.name === 'dashboard') return { name: 'dashboard' };
  if (route.name === 'course') {
    const course = coursesById[route.courseId];
    return { name: 'course', course, progress: await loadProgress(course.id) };
  }
  if (route.name === 'lines') return { name: 'lines' };
  if (route.name === 'settings') return { name: 'settings' };
  if (route.name === 'account') return { name: 'account' };
  if (route.name === 'sources') return { name: 'sources' };
  if (route.name === 'review-queue') return { name: 'review-queue' };
  if (route.name === 'result') {
    const summary = loadResultSummary();
    if (!summary) {
      window.history.replaceState(null, '', HOME_HASH);
      return { name: 'dashboard' };
    }
    return { name: 'result', summary };
  }
  if (route.name === 'browse') return { name: 'browse', courseId: route.courseId, lineId: route.lineId, study: route.study };

  const course = coursesById[route.courseId];
  const requestedVariation = route.variationId ? course.lessons[route.level].variations.find((variation) => variation.id === route.variationId) : undefined;
  if (requestedVariation?.kind === 'reference') return { name: 'browse', courseId: course.id, lineId: requestedVariation.id, study: true };
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
  const scope = route.runScope ?? 'queue';
  const entries = await Promise.all(COURSES.map(async (candidate) => [candidate.id, await loadProgress(candidate.id)] as const));
  const progressByCourse = Object.fromEntries(entries) as Parameters<typeof reviewQueue>[0];
  const storedGroups = route.runGroups ?? (scope === 'course' ? courseReview(course, progress).groups : reviewQueue(progressByCourse).dueGroups);
  const runIndex = route.runIndex ?? 0;
  const groups = scope === 'course'
    ? storedGroups.map((group) => ({
      ...group,
      positionIds: group.courseId === course.id ? group.positionIds.filter((id) => positionIsDue(progress.positions[id])) : [],
    }))
    : storedGroups;
  const index = scope === 'course'
    ? groups.findIndex((group, candidateIndex) => candidateIndex >= runIndex && group.positionIds.length > 0)
    : runIndex;
  if (scope === 'course' && index < 0) return { name: 'course', course, progress };
  const group = groups[index];
  return {
    name: 'practice',
    course,
    level: route.level,
    progress,
    variationId: scope === 'course' ? group?.variationId : route.variationId,
    reviewPositionIds: scope === 'course' ? group?.positionIds : route.reviewPositionIds ?? group?.positionIds,
    run: group ? { groups, index, scope } : undefined,
    entryHandoff: route.entryHandoff,
  };
}

async function renderCurrentRoute(): Promise<void> {
  const generation = ++routeGeneration;
  disposeActiveLinePreview();
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
    window.location.hash = nextHash;
    return;
  }
  await renderCurrentRoute();
};

function renderAuthError(message: string, retry: () => void) {
  disposeActiveLinePreview();
  resetPageScroll();
  document.title = 'LINE/64 · Error';
  app.innerHTML = `<main class="error-page" role="alert"><p class="eyebrow">Authentication unavailable</p><h1>We lost the signal.</h1><p class="lede">${escapeHtml(message)}</p><button id="retry-auth">Try again</button></main>`;
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
      disposeActiveLinePreview();
      signedInEmail = null;
      if (window.location.hash !== HOME_HASH) window.history.replaceState(null, '', HOME_HASH);
      if (pendingApprovalUid) return renderPendingApproval(pendingApprovalUid, clearPending);
      return renderAuth('signin', authOptions);
    }
    if (user.email !== import.meta.env.VITE_APPROVED_EMAIL) {
      disposeActiveLinePreview();
      void signOutUnapprovedUser();
      return;
    }
    signedInEmail = user.email;
    void renderCurrentRoute();
  }, (error) => renderAuthError(error.message || 'Check your connection and try again.', watchAuthentication));
}

window.addEventListener('hashchange', () => {
  if (signedInEmail) void renderCurrentRoute();
});

watchAuthentication();
