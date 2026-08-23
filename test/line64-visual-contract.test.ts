import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const approvedPreviews = {
  'Line_64/line-64-home-preview.png': 'da0f523d5ff5447d6b3a35e5370efa32a21d438b90edc56892ef6c95d9fa03f2',
  'Line_64/line-64-course-preview.png': '520974615102fed5d4ccf080c8b90414b854e1cf39c19655ce1083474c5ab002',
  'Line_64/line-64-practice-preview.png': '47ffa347d3b1b1b7605b5300de0b935616d37e939641da7928981b363ae37cc9',
  'Line_64/line-64-queue-preview.png': 'a2920bc5c666c22eea50e4a894162f255ba43d89a1b47685472b052cf88c91fd',
  'Line_64/line-64-preview.png': 'ea11a0104dfdcc941eec3a4381714d1c6dffe136d560e18b948c40839d003f68',
} as const;

describe('tracked LINE/64 visual contract', () => {
  test('approved preview baselines change only with an explicit hash update', () => {
    for (const [path, expected] of Object.entries(approvedPreviews)) {
      const actual = createHash('sha256').update(readFileSync(path)).digest('hex');
      expect(actual, path).toBe(expected);
    }
  });

  test('Course Review keeps the exported due-review control treatment', () => {
    const reference = readFileSync('Line_64/line-64-course.html', 'utf8');
    const production = readFileSync('src/screens/course.ts', 'utf8');
    expect(reference).toContain('id="practice-due-reviews"');
    expect(reference).toContain('class="button ghost"');
    expect(production).toContain('id="course-review" class="button ghost"');
  });

  test('production uses the canonical exported color tokens', () => {
    const production = readFileSync('src/style.css', 'utf8');
    const reference = readFileSync('Line_64/colors_and_type.css', 'utf8');
    for (const token of ['--bg', '--surface', '--fg', '--muted', '--border', '--hint']) {
      const value = reference.match(new RegExp(`${token}: (oklch\\([^;]+\\));`))?.[1];
      expect(value, token).toBeTruthy();
      expect(production).toContain(`${token}: ${value};`);
    }
  });
});
