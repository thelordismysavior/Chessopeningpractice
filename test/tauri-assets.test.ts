import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('Tauri bundle assets', () => {
  test('provides the default icon required by generate_context', () => {
    const icon = readFileSync('src-tauri/icons/icon.png');

    expect(icon.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  test('exposes the Tauri CLI script required by the Android Gradle task', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.tauri).toBe('tauri');
  });
});
