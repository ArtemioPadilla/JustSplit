import { beforeEach, describe, expect, it, vi } from 'vitest';

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
 */
const { removeReceipts } = vi.hoisted(() => ({ removeReceipts: vi.fn() }));
vi.mock('@/lib/data/storage', () => ({ removeReceipts }));

vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const expenses = await import('./expenses');
const { storageAdapter } = await import('@/lib/data/adapter');

const base = {
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
};

beforeEach(() => {
  removeReceipts.mockReset();
  removeReceipts.mockResolvedValue(undefined);
});

describe('repos.expenses.remove', () => {
  it('calls removeReceipts(id) before deleting the row', async () => {
    const created = await expenses.create(base);
    const calls: string[] = [];
    removeReceipts.mockImplementation(async (id: string) => {
      expect(id).toBe(created.id);
      calls.push('removeReceipts');
    });
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument').mockImplementation(async () => {
      calls.push('deleteDocument');
    });

    await expenses.remove(created.id);

    expect(calls).toEqual(['removeReceipts', 'deleteDocument']);
    deleteSpy.mockRestore();
  });

  it('stops the row delete when removeReceipts fails, so objects are never orphaned unreachable', async () => {
    const created = await expenses.create(base);
    removeReceipts.mockRejectedValue(new Error('storage down'));
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await expect(expenses.remove(created.id)).rejects.toThrow('storage down');

    expect(deleteSpy).not.toHaveBeenCalled();
    // The row is untouched — a retry can still find it and its receipts.
    expect(await expenses.get(created.id)).not.toBeNull();
    deleteSpy.mockRestore();
  });
});
