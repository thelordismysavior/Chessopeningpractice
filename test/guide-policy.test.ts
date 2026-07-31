import { describe, expect, test } from 'vitest';
import { shouldShowMoveGuide } from '../src/guide-policy';

describe('Practice Mode guide policy', () => {
  test('Learn reveals and Drill withholds the guide without changing Drill Phase', () => {
    expect(shouldShowMoveGuide('recall', 'active', 0, 'learn')).toBe(true);
    expect(shouldShowMoveGuide('teach', 'active', 3, 'drill')).toBe(false);
    expect(shouldShowMoveGuide('review', 'active', 3, 'drill')).toBe(false);
  });

  test('completion never renders a guide', () => {
    expect(shouldShowMoveGuide('recall', 'complete', 3, 'learn')).toBe(false);
  });
});
