import type { SessionStatus } from './practice-session';

export function shouldShowMoveGuide(isReview: boolean, status: SessionStatus): boolean {
  if (status === 'complete' || status === 'needs-clean-run') return false;
  return !isReview || status === 'retrying';
}
