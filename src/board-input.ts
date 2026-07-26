export function resolveBoardDrop(origin: string, target: string | null, moved: boolean, locked = false): string | null {
  if (locked || !moved || !target || target === origin) return null;
  return `${origin}${target}`;
}

export function isDragPastThreshold(
  pressX: number,
  pressY: number,
  currentX: number,
  currentY: number,
  threshold: number,
): boolean {
  return Math.hypot(currentX - pressX, currentY - pressY) >= threshold;
}
