import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const hosting = JSON.parse(readFileSync('firebase.json', 'utf8')) as { hosting: { public: string; rewrites: unknown[] } };
const tauri = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')) as { build: { beforeBuildCommand: string; frontendDist: string } };

describe('v1 release wiring', () => {
  test('serves the production frontend through Firebase Hosting', () => {
    expect(hosting.hosting.public).toBe('dist');
    expect(hosting.hosting.rewrites).toContainEqual({ source: '**', destination: '/index.html' });
  });

  test('points Tauri at the production frontend build', () => {
    expect(tauri.build).toMatchObject({ beforeBuildCommand: 'npm run build', frontendDist: '../dist' });
    expect(existsSync('src-tauri/gen/android')).toBe(true);
  });

  test('keeps v1 free of live data, import, offline, editor, and APK features', () => {
    const source = [...readSourceFiles('src'), ...readSourceFiles('src-tauri')].join('\n');
    expect(source).not.toMatch(/fetch\s*\(|xmlhttprequest|pgn|offline|course.?editor|apk/i);
  });
});

function readSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return ['target', 'gen'].includes(entry.name) ? [] : readSourceFiles(file);
    return /\.(css|json|rs|ts)$/.test(entry.name) ? [readFileSync(file, 'utf8')] : [];
  });
}
