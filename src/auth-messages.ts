const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-email': "That doesn't look like an email address.",
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already exists for this email — sign in instead.',
  'auth/weak-password': 'Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': "Can't reach the server. Check your connection.",
};

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? (error as { code?: unknown }).code
    : undefined;
  return typeof code === 'string' ? AUTH_ERROR_MESSAGES[code] ?? 'Something went wrong. Try again.' : 'Something went wrong. Try again.';
}
