import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { describe, afterAll, beforeAll, test } from 'vitest';

const projectId = 'chess-practice-rules-test';
let env: Awaited<ReturnType<typeof initializeTestEnvironment>>;

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'config/access'), { approvedUid: 'owner' }));
});
afterAll(async () => env?.cleanup());

describe('progress rules', () => {
  test('approved owner can read own progress', async () => {
    const db = env.authenticatedContext('owner').firestore();
    await env.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), 'users/owner/courses/london'), { complete: false }));
    await assertSucceeds(getDoc(doc(db, 'users/owner/courses/london')));
  });
  test('unauthenticated and other accounts are denied', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'users/owner/courses/london')));
    await assertFails(getDoc(doc(env.authenticatedContext('other').firestore(), 'users/owner/courses/london')));
  });
});
