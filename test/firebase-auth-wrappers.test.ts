import { beforeEach, describe, expect, test, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  auth: { name: 'auth' },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase/app', () => ({
  getApp: () => ({}),
  getApps: () => [],
  initializeApp: () => ({}),
}));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: {},
  connectAuthEmulator: vi.fn(),
  createUserWithEmailAndPassword: sdk.createUserWithEmailAndPassword,
  getAuth: () => sdk.auth,
  onAuthStateChanged: vi.fn(),
  sendPasswordResetEmail: sdk.sendPasswordResetEmail,
  setPersistence: vi.fn(),
  signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
  signOut: vi.fn(),
}));
vi.mock('firebase/firestore', () => ({
  connectFirestoreEmulator: vi.fn(),
  getFirestore: () => ({}),
}));

import { sendReset, signInWithEmail, signUpWithEmail } from '../src/firebase';

describe('Firebase email/password wrappers', () => {
  beforeEach(() => vi.clearAllMocks());

  test('delegates sign-in with the shared auth instance', async () => {
    const result = { user: { uid: 'owner' } };
    sdk.signInWithEmailAndPassword.mockResolvedValue(result);

    await expect(signInWithEmail('owner@example.com', 'password123')).resolves.toBe(result);
    expect(sdk.signInWithEmailAndPassword).toHaveBeenCalledWith(sdk.auth, 'owner@example.com', 'password123');
  });

  test('delegates sign-up and password reset without changing the SDK result', async () => {
    const credential = { user: { uid: 'owner' } };
    sdk.createUserWithEmailAndPassword.mockResolvedValue(credential);
    sdk.sendPasswordResetEmail.mockResolvedValue(undefined);

    await expect(signUpWithEmail('owner@example.com', 'password123')).resolves.toBe(credential);
    await expect(sendReset('owner@example.com')).resolves.toBeUndefined();
    expect(sdk.createUserWithEmailAndPassword).toHaveBeenCalledWith(sdk.auth, 'owner@example.com', 'password123');
    expect(sdk.sendPasswordResetEmail).toHaveBeenCalledWith(sdk.auth, 'owner@example.com');
  });
});
