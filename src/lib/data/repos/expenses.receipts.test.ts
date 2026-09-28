import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B10 (risk:high — this touches `src/lib/data/repos/expenses.ts`),
 * spec D10 "Images". The create-with-receipts ordering is fixed:
 * **insert the row (client-generated id, `images: []`) -> upload objects ->
 * `updateDocument(id, { images })`** — the storage `receipts_expenses_insert`
 * policy looks the expense up by id in `public.expenses`, so an upload
 * attempted before the row exists is denied. This suite proves the ordering
 * against the in-memory adapter plus a FAKE storage double that rejects an
 * upload for any expense id it hasn't "seen" via a successful insert — the
 * same shape of proof `expenses.remove.test.ts` uses for the delete
 * ordering.
 *
 * Also covers: partial-upload failure (the row keeps whichever receipts DID
 * upload), a same-id retry never duplicating the row (`setDocument` on the
 * same id is an upsert, not an insert — the client-generated-id design's
 * whole point), and the edit-flow's `addReceipts`/`removeReceipt` (patch
 * `images` BEFORE deleting the object, per the ADR 0005 amendment this issue
 * adds).
 */
const { uploadReceipt, removeReceiptObject } = vi.hoisted(() => ({
  uploadReceipt: vi.fn(),
  removeReceiptObject: vi.fn(),
}));
vi.mock('@/lib/data/storage', () => ({ uploadReceipt, removeReceiptObject }));

vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const expenses = await import('./expenses');

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

/** A fake file — `uploadReceipt`/`removeReceiptObject` are mocked, so the real Blob shape never matters. */
function fakeFile(name: string): Blob {
  return { name } as unknown as Blob;
}

beforeEach(() => {
  uploadReceipt.mockReset();
  removeReceiptObject.mockReset();
  removeReceiptObject.mockResolvedValue(undefined);
});

describe('repos.expenses.generateId', () => {
  it('returns an id the caller can reuse across a create + upload + patch sequence', () => {
    const id = expenses.generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('repos.expenses.createWithReceipts (ordering: insert -> upload -> patch images)', () => {
  it('inserts the row BEFORE attempting any upload — a fake storage double that rejects uploads for unknown ids still succeeds', async () => {
    // The fake looks the expense up through the SAME memory adapter
    // createWithReceipts writes to — exactly what the real
    // `receipts_expenses_insert` RLS policy does server-side (looks the row
    // up by id in `public.expenses`). If createWithReceipts ever uploaded
    // BEFORE inserting the row, this fake would reject and the test would
    // fail for the right reason (failedUploadCount 1, not 0).
    uploadReceipt.mockImplementation(async (expenseId: string, file: Blob) => {
      const row = await expenses.get(expenseId);
      if (!row) throw new Error(`storage: expense "${expenseId}" not found (insert policy denial)`);
      return `expenses/${expenseId}/${(file as unknown as { name: string }).name}`;
    });

    const id = expenses.generateId();
    const result = await expenses.createWithReceipts(id, base(), [fakeFile('a.jpg')]);

    expect(result.failedUploadCount).toBe(0);
    expect(result.expense.images).toEqual([`expenses/${id}/a.jpg`]);
    expect((await expenses.get(id))?.images).toEqual([`expenses/${id}/a.jpg`]);
  });

  it('inserts the row even with zero files, so a caption-only expense with no receipts still saves', async () => {
    const id = expenses.generateId();
    const result = await expenses.createWithReceipts(id, base(), []);
    expect(result.failedUploadCount).toBe(0);
    expect(result.expense.images).toEqual([]);
    expect(uploadReceipt).not.toHaveBeenCalled();
  });

  it('partial failure: keeps the successful uploads in images and reports the failed count, never claiming full success', async () => {
    uploadReceipt
      .mockResolvedValueOnce('expenses/x/ok.jpg')
      .mockRejectedValueOnce(new Error('network error'));

    const id = expenses.generateId();
    const result = await expenses.createWithReceipts(id, base(), [fakeFile('ok.jpg'), fakeFile('bad.jpg')]);

    expect(result.failedUploadCount).toBe(1);
    expect(result.expense.images).toEqual(['expenses/x/ok.jpg']);
    expect((await expenses.get(id))?.images).toEqual(['expenses/x/ok.jpg']);
  });

  it('a same-id retry never creates a duplicate row and preserves images already uploaded by the first attempt', async () => {
    uploadReceipt.mockResolvedValue('expenses/x/first.jpg');
    const id = expenses.generateId();

    await expenses.createWithReceipts(id, base(), [fakeFile('first.jpg')]);
    // Retry with the SAME id (the form reuses the id across a resubmit) and
    // no new files — simulates a caller re-invoking after some later step
    // failed, e.g. the network dropped right after the first success.
    const second = await expenses.createWithReceipts(id, base(), []);

    expect(second.expense.id).toBe(id);
    expect(second.expense.images).toEqual(['expenses/x/first.jpg']); // not wiped back to []
    expect(uploadReceipt).toHaveBeenCalledTimes(1); // no re-upload of files already gone from the retry's file list
  });

  it('double submit with the same id and the same files is not rejected and never duplicates the row', async () => {
    uploadReceipt.mockResolvedValue('expenses/x/a.jpg');
    const id = expenses.generateId();
    const input = base();

    const [first, second] = await Promise.all([
      expenses.createWithReceipts(id, input, [fakeFile('a.jpg')]),
      expenses.createWithReceipts(id, input, [fakeFile('a.jpg')]),
    ]);

    expect(first.expense.id).toBe(id);
    expect(second.expense.id).toBe(id);
    // Only one row exists for this id — get() returns the single upserted row.
    const stored = await expenses.get(id);
    expect(stored?.id).toBe(id);
  });

  it('the insert itself failing rejects before any upload is attempted', async () => {
    const id = expenses.generateId();
    await expect(expenses.createWithReceipts(id, base({ description: 123 }), [fakeFile('a.jpg')])).rejects.toThrow();
    expect(uploadReceipt).not.toHaveBeenCalled();
  });
});

describe('repos.expenses.addReceipts (edit: the row already exists, upload directly)', () => {
  it('uploads and appends to any existing images via a partial patch', async () => {
    const created = await expenses.create(base({ images: ['expenses/x/old.jpg'] }));
    uploadReceipt.mockResolvedValue('expenses/x/new.jpg');

    const result = await expenses.addReceipts(created.id, [fakeFile('new.jpg')]);

    expect(result.failedUploadCount).toBe(0);
    expect(result.expense.images).toEqual(['expenses/x/old.jpg', 'expenses/x/new.jpg']);
  });

  it('throws a typed not-found error for an unknown id, without uploading', async () => {
    await expect(expenses.addReceipts('does-not-exist', [fakeFile('a.jpg')])).rejects.toMatchObject({
      name: 'ExpenseNotFoundError',
    });
    expect(uploadReceipt).not.toHaveBeenCalled();
  });

  it('partial failure on edit also keeps successful uploads and reports the failed count', async () => {
    const created = await expenses.create(base());
    uploadReceipt.mockRejectedValue(new Error('network error'));

    const result = await expenses.addReceipts(created.id, [fakeFile('bad.jpg')]);

    expect(result.failedUploadCount).toBe(1);
    expect(result.expense.images).toEqual([]);
  });
});

describe('repos.expenses.removeReceipt (patch images BEFORE deleting the object, ADR 0005 amendment)', () => {
  it('patches images to drop the path, then deletes the object, in that order', async () => {
    const created = await expenses.create(base({ images: ['expenses/x/a.jpg', 'expenses/x/b.jpg'] }));
    const calls: string[] = [];
    removeReceiptObject.mockImplementation(async () => {
      calls.push('removeReceiptObject');
      // By the time the object is deleted, the patch must already be visible.
      expect((await expenses.get(created.id))?.images).toEqual(['expenses/x/b.jpg']);
    });

    const updated = await expenses.removeReceipt(created.id, 'expenses/x/a.jpg');

    calls.push('done');
    expect(updated?.images).toEqual(['expenses/x/b.jpg']);
    expect(removeReceiptObject).toHaveBeenCalledWith('expenses/x/a.jpg');
    expect(calls).toEqual(['removeReceiptObject', 'done']);
  });

  it('a failed object delete leaves the patch applied — never a dangling reference, only an unreferenced object', async () => {
    const created = await expenses.create(base({ images: ['expenses/x/a.jpg'] }));
    removeReceiptObject.mockRejectedValue(new Error('storage down'));

    await expect(expenses.removeReceipt(created.id, 'expenses/x/a.jpg')).rejects.toThrow('storage down');

    // The patch already landed — images no longer references the path,
    // even though the underlying object is still sitting in storage.
    expect((await expenses.get(created.id))?.images).toEqual([]);
  });

  it('throws a typed not-found error for an unknown id', async () => {
    await expect(expenses.removeReceipt('does-not-exist', 'expenses/x/a.jpg')).rejects.toMatchObject({
      name: 'ExpenseNotFoundError',
    });
    expect(removeReceiptObject).not.toHaveBeenCalled();
  });
});
