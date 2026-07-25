import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signOut } from 'firebase/auth';
import { afterAll, beforeAll, test, expect } from 'vitest';

let auth: ReturnType<typeof getAuth>;

beforeAll(() => {
  const app = getApps()[0] ?? initializeApp({ apiKey: 'demo-key', projectId: 'chess-practice-auth-test' });
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
});
afterAll(async () => { if (auth.currentUser) await signOut(auth); });

test('emulator preserves signed-in user until sign out', async () => {
  await createUserWithEmailAndPassword(auth, `owner-${Date.now()}@example.com`, 'password123');
  expect(auth.currentUser).not.toBeNull();
  await signOut(auth);
  expect(auth.currentUser).toBeNull();
});
