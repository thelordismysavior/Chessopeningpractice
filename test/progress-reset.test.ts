import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: 'owner' } as { uid: string } | null },
  commit: vi.fn<() => Promise<void>>(),
  delete: vi.fn(),
  writeBatch: vi.fn(),
}));

vi.mock('../src/firebase', () => ({ auth: mocks.auth, db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: unknown, ...segments: string[]) => segments.join('/'),
  getDoc: vi.fn(),
  runTransaction: vi.fn(),
  writeBatch: mocks.writeBatch,
}));

import { resetAllProgress } from '../src/progress';

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
