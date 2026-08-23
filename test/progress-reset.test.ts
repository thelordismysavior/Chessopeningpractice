import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  commit: vi.fn<() => Promise<void>>(),
  delete: vi.fn(),
  getDoc: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../src/firebase', () => ({ auth: mocks.auth, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: mocks.getDoc,
  runTransaction: vi.fn(),
  writeBatch: mocks.writeBatch,
}));

import { loadProgress, resetAllProgress } from '../src/progress';

describe('progress loading', () => {
  afterEach(() => vi.useRealTimers());

  test('stops waiting when Firestore never responds', async () => {
    vi.useFakeTimers();
    mocks.auth.currentUser = { uid: 'owner' };
    mocks.getDoc.mockReturnValue(new Promise(() => undefined));

    const result = expect(loadProgress('london')).rejects.toThrow('Progress took too long to load.');
    await vi.runAllTimersAsync();
    await result;
  });
});

describe('reset all progress', () => {
  beforeEach(() => {
    mocks.auth.currentUser = { uid: 'owner' };
    mocks.commit.mockReset().mockResolvedValue();
    mocks.delete.mockReset();
    mocks.writeBatch.mockReset().mockReturnValue({ delete: mocks.delete, commit: mocks.commit });
  });

  test('deletes every course in one committed batch', async () => {
    await resetAllProgress(['london', 'caro-kann']);

    expect(mocks.writeBatch).toHaveBeenCalledOnce();
    expect(mocks.delete.mock.calls).toEqual([
      ['users/owner/courses/london'],
      ['users/owner/courses/caro-kann'],
    ]);
    expect(mocks.commit).toHaveBeenCalledOnce();
  });

  test('requires a signed-in learner', async () => {
    mocks.auth.currentUser = null;

    await expect(resetAllProgress(['london'])).rejects.toThrow('Sign in before resetting progress.');
    expect(mocks.writeBatch).not.toHaveBeenCalled();
  });
});
