import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { afterAll, beforeAll, describe, test, expect } from 'vitest';

let auth: ReturnType<typeof getAuth>;

beforeAll(() => {
  const app = getApps()[0] ?? initializeApp({ apiKey: 'demo-key', projectId: 'chess-practice-auth-test' });
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
});
afterAll(async () => { if (auth.currentUser) await signOut(auth); });

describe('email/password authentication emulator contract', () => {
  test('preserves a signed-in user until sign out', async () => {
    await createUserWithEmailAndPassword(auth, `owner-${Date.now()}@example.com`, 'password123');
    expect(auth.currentUser).not.toBeNull();
    await signOut(auth);
    expect(auth.currentUser).toBeNull();
  });

  test('signs in with the created account and password', async () => {
    const email = `owner-${Date.now()}@example.com`;
    await createUserWithEmailAndPassword(auth, email, 'password123');
    await signOut(auth);

    const credential = await signInWithEmailAndPassword(auth, email, 'password123');
    expect(credential.user.email).toBe(email);
    await signOut(auth);
  });

  test('rejects a wrong password with the legacy error code', async () => {
    const email = `owner-${Date.now()}@example.com`;
    await createUserWithEmailAndPassword(auth, email, 'password123');
    await signOut(auth);

    await expect(signInWithEmailAndPassword(auth, email, 'wrong-password')).rejects.toMatchObject({ code: 'auth/wrong-password' });
  });

  test('rejects a duplicate email during account creation', async () => {
    const email = `owner-${Date.now()}@example.com`;
    await createUserWithEmailAndPassword(auth, email, 'password123');
    await expect(createUserWithEmailAndPassword(auth, email, 'password123')).rejects.toMatchObject({ code: 'auth/email-already-in-use' });
    await signOut(auth);
  });

});
