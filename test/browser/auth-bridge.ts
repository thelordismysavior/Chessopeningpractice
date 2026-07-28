import { signInWithEmail } from '../../src/firebase';

export function signInForBrowserTest(email: string, password: string): Promise<void> {
  return signInWithEmail(email, password).then(() => undefined);
}
