import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { COURSES } from '../../src/courses';

export const TEST_ACCOUNT = { email: 'test@example.com', password: 'password123' };
const PROJECT_ID = 'demo-no-project';
const AUTH_URL = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';

type AuthResponse = { localId: string };

async function authRequest(path: string, body: object): Promise<AuthResponse> {
  const response = await fetch(`${AUTH_URL}/${path}?key=demo-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (response.ok) return response.json() as Promise<AuthResponse>;
  if (path === 'accounts:signUp' && response.status === 400) {
    const signIn = await fetch(`${AUTH_URL}/accounts:signInWithPassword?key=demo-key`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, returnSecureToken: true }),
    });
    if (signIn.ok) return signIn.json() as Promise<AuthResponse>;
  }
  throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
}

export async function testAccount(): Promise<AuthResponse> {
  return authRequest('accounts:signUp', { ...TEST_ACCOUNT, returnSecureToken: true });
}

export async function resetEmulatorProgress(): Promise<void> {
  const { localId } = await testAccount();
  const env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
  });
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'config/access'), { approvedUid: localId });
    await Promise.all(COURSES.map((course) => deleteDoc(doc(db, 'users', localId, 'courses', course.id))));
  });
  await env.cleanup();
}
