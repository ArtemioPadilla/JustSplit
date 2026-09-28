import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';

/**
 * Plan B5b, spec D10: `repos.expenses.remove` must delete the storage
 * objects under `expenses/{id}/` BEFORE the row — once the row is gone, no
 * `storage.objects` policy can reach them (they'd be orphaned unreachable
 * forever). A storage failure must stop the row delete, for the same
 * reason in reverse: never leave a dangling row with receipts nobody
 * cleaned up on a retry path that assumes the row is still there.
 *
 * `src/tests/rls/storage.test.ts` proves the same order against the real
 * database; this file proves the repo wires it in that order at all,
 * against the in-memory adapter.
 *
 * Plan B9 (risk:high, ADR 0005 amendment "delete ordering preflight"): the
 * storage `receipts_expenses_delete` policy is member-wide (B10 relies on
 * it for image edits), but the `expenses_delete` row policy only allows the
 * creator or payer. Before this fix, a member who is neither could wipe
 * every receipt via `removeReceipts(id)` and then have the row delete
 * silently denied by RLS (0 rows affected, no thrown error) — a permanent,
 * partial data loss. `remove()` now fetches the fresh row first and refuses
 * BEFORE touching storage when the caller is neither the creator nor the
 * payer. This is a client-side safety preflight against a destructive
 * partial operation, never authorization — RLS still denies the row delete
 * on its own (CLAUDE.md rule 8).
 */
const { removeReceipts } = vi.hoisted(() => ({ removeReceipts: vi.fn() }));
vi.mock('@/lib/data/storage', () => ({ removeReceipts }));

vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const expenses = await import('./expenses');
const { storageAdapter } = await import('@/lib/data/adapter');

function base(overrides: Record<string, unknown> = {}) {
  return {
    groupId: null as string | null,
    description: 'Tacos',
    amount: 100,
    currency: 'MXN',
    paidBy: 'u1',
    splitType: 'equal' as const,
    splits: [{ userId: 'u1', amount: 100 }],
    date: '2026-09-28',
    memberIds: ['u1'],
    createdBy: 'u1',
    ...overrides,
  };
}

beforeEach(() => {
  removeReceipts.mockReset();
  removeReceipts.mockResolvedValue(undefined);
  $user.set(null);
});

afterEach(() => {
  $user.set(null);
});

function signIn(uid: string) {
  $user.set({ uid, email: null, displayName: null, photoURL: null, emailVerified: true });
}

describe('repos.expenses.remove', () => {
  it('calls removeReceipts(id) before deleting the row, for the creator', async () => {
    const created = await expenses.create(base({ createdBy: 'u1', paidBy: 'u1', memberIds: ['u1'] }));
    signIn('u1');
    const calls: string[] = [];
    removeReceipts.mockImplementation(async (id: string) => {
      expect(id).toBe(created.id);
      calls.push('removeReceipts');
    });
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument').mockImplementation(async (_collection, docId) => {
      calls.push('deleteDocument');
      return { id: docId, success: true };
    });

    await expenses.remove(created.id);

    expect(calls).toEqual(['removeReceipts', 'deleteDocument']);
    deleteSpy.mockRestore();
  });

  it('the payer (not the creator) may also delete, in the same order', async () => {
    const created = await expenses.create(
      base({ createdBy: 'u1', paidBy: 'u2', memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 100 }] }),
    );
    signIn('u2');
    const calls: string[] = [];
    removeReceipts.mockImplementation(async () => {
      calls.push('removeReceipts');
    });
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument').mockImplementation(async (_collection, docId) => {
      calls.push('deleteDocument');
      return { id: docId, success: true };
    });

    await expenses.remove(created.id);

    expect(calls).toEqual(['removeReceipts', 'deleteDocument']);
    deleteSpy.mockRestore();
  });

  it('stops the row delete when removeReceipts fails, so objects are never orphaned unreachable', async () => {
    const created = await expenses.create(base({ createdBy: 'u1', paidBy: 'u1', memberIds: ['u1'] }));
    signIn('u1');
    removeReceipts.mockRejectedValue(new Error('storage down'));
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await expect(expenses.remove(created.id)).rejects.toThrow('storage down');

    expect(deleteSpy).not.toHaveBeenCalled();
    // The row is untouched — a retry can still find it and its receipts.
    expect(await expenses.get(created.id)).not.toBeNull();
    deleteSpy.mockRestore();
  });

  it('a member who is neither creator nor payer never touches storage, and gets a typed error', async () => {
    const created = await expenses.create(
      base({ createdBy: 'u1', paidBy: 'u1', memberIds: ['u1', 'u3'], splits: [{ userId: 'u1', amount: 100 }] }),
    );
    signIn('u3');
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await expect(expenses.remove(created.id)).rejects.toMatchObject({ name: 'ExpenseDeleteNotAllowedError' });

    expect(removeReceipts).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await expenses.get(created.id)).not.toBeNull();
    deleteSpy.mockRestore();
  });

  it('throws a typed not-found error for an unknown id, without touching storage', async () => {
    signIn('u1');
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await expect(expenses.remove('does-not-exist')).rejects.toMatchObject({ name: 'ExpenseNotFoundError' });

    expect(removeReceipts).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    deleteSpy.mockRestore();
  });
});
