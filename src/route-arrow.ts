export type RouteArrowGeometry = {
  left: number;
  top: number;
  width: number;
  angle: number;
  head: number;
};

const SQUARE = 12.5;
const START_INSET = 0.28 * SQUARE;
const HEAD = 0.18 * SQUARE;
const MIN_SHAFT = 0.12 * SQUARE;

export function routeArrowGeometry(fromX: number, fromY: number, toX: number, toY: number): RouteArrowGeometry | null {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const span = Math.hypot(dx, dy);
  if (span === 0) return null;

  const startInset = Math.min(START_INSET, Math.max(0, span - HEAD - MIN_SHAFT));
  const width = span - startInset;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  return {
    left: fromX + dx / span * startInset,
    top: fromY + dy / span * startInset,
    width,
    angle,
    head: HEAD,
  };
}
