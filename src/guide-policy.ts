import type { DrillPhase, DrillStatus } from './line-drill';

export function shouldShowMoveGuide(phase: DrillPhase, status: DrillStatus, hintVisible: boolean): boolean {
  if (status === 'complete') return false;
  if (phase === 'teach') return true;
  return hintVisible || status === 'retrying';
}
