import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';

/**
 * Plan B12 (risk:high), rewritten for plan B2d (ADR 0013): `repos.groups.remove`
 * is a PLAIN delete. `group_id` is a foreign key ON DELETE SET NULL
 * (`db/migrations/20260928000011_membership_foreign_keys.sql`), so the database
 * ungroups every expense, event and settlement itself, atomically — including
 * rows the admin cannot see and rows naming people the admin is not friends
 * with. The old friendship preflight, the read-everything-then-ungroup batch and
 * `GroupDeleteBlockedByFriendshipError` are gone.
 *
 * Kept (client-side safety, never authorization; RLS is the authority, CLAUDE.md
 * rule 8): the fresh-read admin preflight, and the post-delete re-read —
 * `expense_groups_delete` denies a non-admin as a silent 0-row delete, so "the
 * call didn't error" is never proof the group is gone.
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const groups = await import('./groups');
const expenses = await import('./expenses');
const events = await import('./events');
const { storageAdapter } = await import('@/lib/data/adapter');

const NOW = '2026-09-28T00:00:00.000Z';

function groupBase(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Roommates',
    type: 'friends' as const,
    currency: 'USD',
    members: [
      { userId: 'u1', displayName: 'Ana', role: 'owner' as const, joinedAt: NOW },
      { userId: 'u2', displayName: 'Beto', role: 'member' as const, joinedAt: NOW },
    ],
    totalExpenses: 0,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    ...overrides,
  };
}

function expenseBase(overrides: Record<string, unknown> = {}) {
  return {
    groupId: 'g-placeholder',
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
    groupId: 'g-placeholder',
    memberIds: ['u1'],
    kind: 'event',
    createdBy: 'u1',
    ...overrides,
  };
}

function signIn(uid: string) {
  $user.set({ uid, email: null, displayName: null, photoURL: null, emailVerified: true });
}

beforeEach(() => {
  $user.set(null);
});

afterEach(() => {
  $user.set(null);
  vi.restoreAllMocks();
});

describe('repos.groups.remove', () => {
  it('deletes an admin-only group with no rows in one batch', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1'], adminIds: ['u1'], members: [groupBase().members[0]] }));
    signIn('u1');

    await groups.remove(group.id);

    expect(await groups.get(group.id)).toBeNull();
  });

  it('deletes the group and leaves every expense and event ungrouped (the foreign key does it), with no friendship needed', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ groupId: group.id, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }] }));
    const event = await events.create(eventBase({ groupId: group.id, memberIds: ['u1', 'u2'] }));
    // No friendships row at all between u1 and u2.
    signIn('u1');

    await groups.remove(group.id);

    expect(await groups.get(group.id)).toBeNull();
    expect((await expenses.get(expense.id))?.groupId).toBeNull();
    expect((await events.get(event.id))?.groupId).toBeNull();
  });

  it('is a single delete: it never reads the group\'s rows or the admin\'s friendships and never sends a batch', async () => {
    const group = await groups.create(groupBase());
    await expenses.create(expenseBase({ groupId: group.id, memberIds: ['u1', 'u2'] }));
    signIn('u1');
    const querySpy = vi.spyOn(storageAdapter!, 'query');
    const batchSpy = vi.spyOn(storageAdapter!, 'batchWrite');
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await groups.remove(group.id);

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith('expense_groups', group.id);
    expect(batchSpy).not.toHaveBeenCalled();
    expect(querySpy).not.toHaveBeenCalled();
  });

  it('denies a non-admin, and nothing is deleted or changed', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ groupId: group.id, memberIds: ['u1', 'u2'] }));
    signIn('u2');

    await expect(groups.remove(group.id)).rejects.toMatchObject({ name: 'GroupDeleteNotAllowedError' });

    expect(await groups.get(group.id)).not.toBeNull();
    expect((await expenses.get(expense.id))?.groupId).toBe(group.id);
  });

  it('deletes a group whose rows name people the admin is not friends with, and ungroups a row the admin is not on (the old friendship block is gone)', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2', 'u3'], adminIds: ['u1'] }));
    const withStranger = await expenses.create(
      expenseBase({ groupId: group.id, memberIds: ['u1', 'u3'], paidBy: 'u1', splits: [{ userId: 'u1', amount: 50 }, { userId: 'u3', amount: 50 }] }),
    );
    const notOnAdmin = await expenses.create(
      expenseBase({ groupId: group.id, memberIds: ['u2', 'u3'], paidBy: 'u2', createdBy: 'u2', splits: [{ userId: 'u2', amount: 50 }, { userId: 'u3', amount: 50 }] }),
    );
    signIn('u1');

    await groups.remove(group.id);

    expect(await groups.get(group.id)).toBeNull();
    expect((await expenses.get(withStranger.id))?.groupId).toBeNull();
    expect((await expenses.get(notOnAdmin.id))?.groupId).toBeNull();
  });

  it('reports failure honestly when the delete op is a silent no-op and the group is still there after the batch', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1'], adminIds: ['u1'], members: [groupBase().members[0]] }));
    signIn('u1');
    // Simulate RLS's silent 0-row delete (`expense_groups_delete` denies a
    // non-admin without an error): the call reports success, but the row never
    // actually left.
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument').mockResolvedValue({ id: group.id, success: true });

    await expect(groups.remove(group.id)).rejects.toMatchObject({ name: 'GroupDeleteVerificationFailedError' });

    deleteSpy.mockRestore();
  });

  it('throws a typed not-found error for an unknown id', async () => {
    signIn('u1');
    await expect(groups.remove('does-not-exist')).rejects.toMatchObject({ name: 'GroupNotFoundError' });
  });
});
