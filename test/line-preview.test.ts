import { describe, expect, test } from 'vitest';
import { COURSES } from '../src/courses';
import { planLinePreviewAdvance } from '../src/line-preview';

describe('line preview advance planning', () => {
  const variation = COURSES[0].lessons.beginner.variations[0];

  test('plans the authored move and the connecting opponent reply', () => {
    const advance = planLinePreviewAdvance(variation.positions, 0);

    expect(advance?.authored.afterFen).toBeTruthy();
    expect(advance?.reply?.afterFen).toBe(variation.positions[1].fen);
    expect(advance?.nextIndex).toBe(1);
    expect(advance?.completed).toBe(false);
  });

  test('keeps the final authored move enabled and marks the completed state', () => {
    const lastIndex = variation.positions.length - 1;
    const advance = planLinePreviewAdvance(variation.positions, lastIndex);

    expect(advance?.authored).toBeTruthy();
    expect(advance?.reply).toBeNull();
    expect(advance?.nextIndex).toBeNull();
    expect(advance?.completed).toBe(true);
  });
});
