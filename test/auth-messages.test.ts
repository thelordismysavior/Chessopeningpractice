import { describe, expect, test } from 'vitest';
import { authErrorMessage } from '../src/auth-messages';

describe('authErrorMessage', () => {
  test('uses the same sentence for modern and legacy invalid credentials', () => {
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toBe('Email or password is incorrect.');
    expect(authErrorMessage({ code: 'auth/user-not-found' })).toBe('Email or password is incorrect.');
    expect(authErrorMessage({ code: 'auth/wrong-password' })).toBe('Email or password is incorrect.');
  });

  test('maps validation, throttling, and network failures', () => {
    expect(authErrorMessage({ code: 'auth/invalid-email' })).toBe("That doesn't look like an email address.");
    expect(authErrorMessage({ code: 'auth/email-already-in-use' })).toBe('An account already exists for this email — sign in instead.');
    expect(authErrorMessage({ code: 'auth/weak-password' })).toBe('Use at least 8 characters.');
    expect(authErrorMessage({ code: 'auth/too-many-requests' })).toBe('Too many attempts. Wait a minute and try again.');
    expect(authErrorMessage({ code: 'auth/network-request-failed' })).toBe("Can't reach the server. Check your connection.");
  });

  test('falls back for an unknown error code', () => {
    expect(authErrorMessage({ code: 'auth/something-new' })).toBe('Something went wrong. Try again.');
    expect(authErrorMessage(new Error('not a Firebase error'))).toBe('Something went wrong. Try again.');
  });
});
