import type { DrillPhase, DrillStatus } from './line-drill';

export type PracticeMode = 'learn' | 'drill';

export function shouldShowMoveGuide(phase: DrillPhase, status: DrillStatus, hintLevel: number | boolean, mode?: PracticeMode): boolean {
  if (status === 'complete') return false;
  if (mode) return mode === 'learn';
  if (phase === 'teach') return true;
  return typeof hintLevel === 'number' ? hintLevel >= 3 : hintLevel;
}
