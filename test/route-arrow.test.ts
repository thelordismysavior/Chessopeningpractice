import { describe, expect, test } from 'vitest';
import { routeArrowGeometry } from '../src/route-arrow';

function tip(geometry: { left: number; top: number; width: number; angle: number }): { x: number; y: number } {
  const radians = geometry.angle * Math.PI / 180;
  return {
    x: geometry.left + Math.cos(radians) * geometry.width,
    y: geometry.top + Math.sin(radians) * geometry.width,
  };
}

describe('route arrow geometry', () => {
  test('places the tip on the destination-square center for a long move', () => {
    const geometry = routeArrowGeometry(6.25, 56.25, 93.75, 56.25);
    expect(geometry).not.toBeNull();
    const end = tip(geometry!);
    expect(end.x).toBeCloseTo(93.75);
    expect(end.y).toBeCloseTo(56.25);
    expect(geometry!.head).toBeCloseTo(2.25);
  });

  test('starts outside the piece but inside the origin square', () => {
    const geometry = routeArrowGeometry(6.25, 56.25, 93.75, 56.25);
    expect(geometry).not.toBeNull();
    const startDistance = Math.hypot(geometry!.left - 6.25, geometry!.top - 56.25);
    expect(startDistance).toBeCloseTo(3.5);
    expect(startDistance).toBeLessThan(6.25);
  });

  test('relaxes the start inset on short spans so the tip stays on destination center', () => {
    const geometry = routeArrowGeometry(0, 0, 5, 0);
    expect(geometry).not.toBeNull();
    const startDistance = Math.hypot(geometry!.left, geometry!.top);
    expect(startDistance).toBeLessThan(3.5);
    expect(startDistance).toBeCloseTo(1.25);
    const end = tip(geometry!);
    expect(end.x).toBeCloseTo(5);
    expect(end.y).toBeCloseTo(0);
  });

  test('returns null when the span is zero', () => {
    expect(routeArrowGeometry(40, 40, 40, 40)).toBeNull();
  });
});
