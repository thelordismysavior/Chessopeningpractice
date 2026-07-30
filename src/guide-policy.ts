import type { DrillPhase, DrillStatus } from './line-drill';

export function shouldShowMoveGuide(phase: DrillPhase, status: DrillStatus, hintLevel: number | boolean): boolean {
  if (status === 'complete') return false;
  if (phase === 'teach') return true;
  return typeof hintLevel === 'number' ? hintLevel >= 3 : hintLevel;
}
