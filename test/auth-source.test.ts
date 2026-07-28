import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : /\.(ts|css)$/.test(entry.name) ? [path] : [];
  });
}

test('Google authentication is absent from the source tree', () => {
  const source = sourceFiles('src')
    .filter((path) => statSync(path).isFile())
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');

  expect(source).not.toMatch(/GoogleAuthProvider|googleProvider|signInWithPopup|signInWithRedirect|Sign in with Google/);
});
