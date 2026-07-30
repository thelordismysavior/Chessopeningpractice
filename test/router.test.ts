import { describe, expect, test } from 'vitest';
import { hashForRoute, parseHash } from '../src/router';

describe('Result route', () => {
  test('round-trips the addressable hash', () => {
    expect(parseHash('#/result')).toEqual({ name: 'result' });
    expect(hashForRoute({ name: 'result' })).toBe('#/result');
  });
});
