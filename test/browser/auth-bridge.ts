import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/firebase';

export function signInForBrowserTest(email: string, password: string): Promise<void> {
  return signInWithEmailAndPassword(auth, email, password).then(() => undefined);
}
