export function resolveBoardDrop(origin: string, target: string | null, moved: boolean, locked = false): string | null {
  if (locked || !moved || !target || target === origin) return null;
  return `${origin}${target}`;
}
