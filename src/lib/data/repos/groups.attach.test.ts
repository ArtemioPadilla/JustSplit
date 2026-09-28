import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';

/**
 * Plan B12: attaching existing rows to a group. `attachExpenses`/
 * `attachEvents` offer only rows the D10 membership-mirror invariant
 * already allows (`isExpenseAttachable`/`isEventAttachable`,
 * `src/domain/groups.ts`) — anything else is skipped rather than sent to a
 * doomed write. One `batchWrite` for every batch, then a re-read verifies
 * each attempted id before it is counted as attached ("never claim success
 * for rows that didn't change").
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const groups = await import('./groups');
const expenses = await import('./expenses');
const events = await import('./events');
const { storageAdapter } = await import('@/lib/data/adapter');

function groupBase(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Roommates',
    type: 'friends' as const,
    currency: 'USD',
    members: [{ userId: 'u1', displayName: 'Ana', role: 'owner' as const, joinedAt: '2026-09-28T00:00:00.000Z' }],
    totalExpenses: 0,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    ...overrides,
  };
}

function expenseBase(overrides: Record<string, unknown> = {}) {
  return {
    groupId: null as string | null,
    description: 'Tacos',
    amount: 100,
    currency: 'USD',
    paidBy: 'u1',
    splitType: 'equal' as const,
    splits: [{ userId: 'u1', amount: 100 }],
    date: '2026-09-28',
    memberIds: ['u1'],
    createdBy: 'u1',
    ...overrides,
  };
}

function eventBase(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Trip',
    groupId: null as string | null,
    memberIds: ['u1'],
    kind: 'event',
    createdBy: 'u1',
    ...overrides,
  };
}

beforeEach(() => {
  $user.set({ uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: true });
});

afterEach(() => {
  $user.set(null);
  vi.restoreAllMocks();
});

describe('repos.groups.attachExpenses', () => {
  it('attaches an eligible ungrouped expense, writing groupId and the group memberIds', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ paidBy: 'u1', splits: [{ userId: 'u1', amount: 100 }] }));

    const result = await groups.attachExpenses(group.id, [expense.id]);

    expect(result).toEqual({ attached: [expense.id], skipped: [] });
    const fresh = await expenses.get(expense.id);
    expect(fresh?.groupId).toBe(group.id);
    expect(fresh?.memberIds).toEqual(group.memberIds);
  });

  it('skips an expense whose participants are not a subset of the group memberIds', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2'] }));
    const expense = await expenses.create(
      expenseBase({ paidBy: 'u1', memberIds: ['u1', 'u3'], splits: [{ userId: 'u1', amount: 50 }, { userId: 'u3', amount: 50 }] }),
    );

    const result = await groups.attachExpenses(group.id, [expense.id]);

    expect(result).toEqual({ attached: [], skipped: [expense.id] });
    expect((await expenses.get(expense.id))?.groupId).toBeNull();
  });

  it('skips an expense that already belongs to another group', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ groupId: 'g-other', paidBy: 'u1', splits: [{ userId: 'u1', amount: 100 }] }));

    const result = await groups.attachExpenses(group.id, [expense.id]);

    expect(result).toEqual({ attached: [], skipped: [expense.id] });
    expect((await expenses.get(expense.id))?.groupId).toBe('g-other');
  });

  it('attaches several rows in one batch, and never claims success for a row the batch left unchanged', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2'] }));
    const eligible = await expenses.create(expenseBase({ paidBy: 'u1', splits: [{ userId: 'u1', amount: 100 }] }));
    const alsoEligible = await expenses.create(expenseBase({ paidBy: 'u2', memberIds: ['u2'], splits: [{ userId: 'u2', amount: 100 }] }));

    const batchSpy = vi.spyOn(storageAdapter!, 'batchWrite').mockResolvedValueOnce({ success: true, count: 1 });
    // Simulate a batch that only actually applied the FIRST op (e.g. a
    // partial real-adapter apply the RPC still reported as "success").
    const original = storageAdapter!.updateDocument.bind(storageAdapter);
    batchSpy.mockImplementationOnce(async (ops) => {
      await original(ops[0]!.collection, ops[0]!.id, ops[0]!.data ?? {});
      return { success: true, count: 1 };
    });

    const result = await groups.attachExpenses(group.id, [eligible.id, alsoEligible.id]);

    expect(result.attached).toEqual([eligible.id]);
    expect(result.skipped).toEqual([alsoEligible.id]);
    batchSpy.mockRestore();
  });

  it('throws a typed not-found error for an unknown group id', async () => {
    await expect(groups.attachExpenses('does-not-exist', [])).rejects.toMatchObject({ name: 'GroupNotFoundError' });
  });
});

describe('repos.groups.attachEvents', () => {
  it('attaches an eligible ungrouped event, writing groupId only', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2'] }));
    const event = await events.create(eventBase({ memberIds: ['u1', 'u2'] }));

    const result = await groups.attachEvents(group.id, [event.id]);

    expect(result).toEqual({ attached: [event.id], skipped: [] });
    expect((await events.get(event.id))?.groupId).toBe(group.id);
  });

  it('skips an event whose memberIds are not a subset of the group memberIds', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2'] }));
    const event = await events.create(eventBase({ memberIds: ['u1', 'u3'] }));

    const result = await groups.attachEvents(group.id, [event.id]);

    expect(result).toEqual({ attached: [], skipped: [event.id] });
    expect((await events.get(event.id))?.groupId).toBeNull();
  });
});
