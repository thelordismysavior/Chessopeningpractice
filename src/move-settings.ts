export const MOVE_DURATION_DEFAULT = 200;
export const MOVE_DURATION_MIN = 0;
export const MOVE_DURATION_MAX = 2000;
export const MOVE_DURATION_STEP = 50;
export const MOVE_DURATION_STORAGE_KEY = 'chess-practice.move-duration';

export const MOVE_BEAT_BEFORE_REPLY = 120;
export const MOVE_BEAT_AFTER_REPLY = 150;
export const MOVE_BEAT_AFTER_REPLY_TEACHING = 300;

export type MoveBeats = { beforeReply: number; afterReply: number };

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function normalizeMoveDuration(value: unknown): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return MOVE_DURATION_DEFAULT;
  return Math.min(MOVE_DURATION_MAX, Math.max(MOVE_DURATION_MIN, Math.round(parsed / MOVE_DURATION_STEP) * MOVE_DURATION_STEP));
}

function browserStorage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadMoveDuration(storage: StorageLike | null = browserStorage()): number {
  if (!storage) return MOVE_DURATION_DEFAULT;
  try {
    return normalizeMoveDuration(storage.getItem(MOVE_DURATION_STORAGE_KEY));
  } catch {
    return MOVE_DURATION_DEFAULT;
  }
}

export function saveMoveDuration(value: unknown, storage: StorageLike | null = browserStorage()): number {
  const duration = normalizeMoveDuration(value);
  try {
    storage?.setItem(MOVE_DURATION_STORAGE_KEY, String(duration));
  } catch {
    // Device storage is a preference, not a reason to stop practice.
  }
  return duration;
}

export function effectiveMoveDuration(storedDuration: number, reducedMotion: boolean): number {
  return reducedMotion ? 0 : normalizeMoveDuration(storedDuration);
}

// Beats key off the stored preference rather than the effective duration: a reduced-motion learner
// still needs time to read the reply, and only an explicit zero means "no tempo at all".
export function moveBeats(storedDuration: number, teaching: boolean): MoveBeats {
  if (normalizeMoveDuration(storedDuration) === 0) return { beforeReply: 0, afterReply: 0 };
  return {
    beforeReply: MOVE_BEAT_BEFORE_REPLY,
    afterReply: teaching ? MOVE_BEAT_AFTER_REPLY_TEACHING : MOVE_BEAT_AFTER_REPLY,
  };
}
