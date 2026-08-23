import { describe, expect, test } from 'vitest';
import { hashForRoute, parseHash } from '../src/router';

describe('Result route', () => {
  test('round-trips the addressable hash', () => {
    expect(parseHash('#/result')).toEqual({ name: 'result' });
    expect(hashForRoute({ name: 'result' })).toBe('#/result');
  });

  test('round-trips a Course Review run without losing its Course scope', () => {
    const route: Parameters<typeof hashForRoute>[0] = {
      name: 'practice',
      courseId: 'jobava-london',
      level: 'advanced',
      variationId: 'advanced-main',
      reviewPositionIds: ['advanced-main-1'],
      runIndex: 0,
      runGroups: [{ courseId: 'jobava-london', level: 'advanced', variationId: 'advanced-main', positionIds: ['advanced-main-1'] }],
      runScope: 'course',
    };

    expect(parseHash(hashForRoute(route))).toEqual(route);
  });
});
