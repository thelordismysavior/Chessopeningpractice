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

/** A press only cuts the tempo when it is a real move intent, judged against the settled position. */
export function resolveTempoCut(settling: boolean, settledPieceColor: 'w' | 'b' | null, selectableColor: 'w' | 'b'): 'ignore' | 'cut' {
  return settling && settledPieceColor === selectableColor ? 'cut' : 'ignore';
}
