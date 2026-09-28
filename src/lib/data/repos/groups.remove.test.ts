import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';

/**
 * Plan B12 (risk:high, ADR 0002 amendment "group membership lifecycle"):
 * `repos.groups.remove` deletes a group by ungrouping every one of its
 * expenses/events (`groupId = null`) and deleting the row itself in ONE
 * `batchWrite`, same "one atomic batch" contract B14's settle-up will use.
 *
 * Preflights BEFORE any write (mirrors `expenses.remove.test.ts`'s own
 * "delete ordering preflight" pattern, ADR 0005 amendment — client-side
 * safety checks against a destructive PARTIAL operation, never
 * authorization; RLS is still the sole authority, CLAUDE.md rule 8):
 *   (a) the caller must be a fresh-read admin of the group;
 *   (b) ungrouping must never leave an expense/event whose OTHER members
 *       (per `violatesNoGroupInvariant`) are not accepted friends of the
 *       acting admin — the no-group `expenses_update`/`events_update` WITH
 *       CHECK would reject it row by row otherwise, leaving the group
 *       half-ungrouped and undeletable.
 *
 * Post-write: `batch_write`'s DELETE op is a silent no-op when denied
 * (`db/migrations/20260928000008_batch_write.sql`) — this suite proves
 * `remove()` re-reads the group afterwards and reports failure honestly
 * when it is still there, rather than claiming success.
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const groups = await import('./groups');
const expenses = await import('./expenses');
const events = await import('./events');
const friendships = await import('./friendships');
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

  it('ungroups every group expense/event and deletes the group, when the actor is friends with every other member', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ groupId: group.id, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }] }));
    const event = await events.create(eventBase({ groupId: group.id, memberIds: ['u1', 'u2'] }));
    await friendships.create({ users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1' });
    signIn('u1');

    await groups.remove(group.id);

    expect(await groups.get(group.id)).toBeNull();
    expect((await expenses.get(expense.id))?.groupId).toBeNull();
    expect((await events.get(event.id))?.groupId).toBeNull();
  });

  it('denies a non-admin, and nothing is deleted or changed', async () => {
    const group = await groups.create(groupBase());
    const expense = await expenses.create(expenseBase({ groupId: group.id, memberIds: ['u1', 'u2'] }));
    signIn('u2');

    await expect(groups.remove(group.id)).rejects.toMatchObject({ name: 'GroupDeleteNotAllowedError' });

    expect(await groups.get(group.id)).not.toBeNull();
    expect((await expenses.get(expense.id))?.groupId).toBe(group.id);
  });

  it('blocks deletion when ungrouping would leave a row whose other members are not the admin\'s accepted friends', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1', 'u2', 'u3'], adminIds: ['u1'] }));
    const expense = await expenses.create(
      expenseBase({ groupId: group.id, memberIds: ['u1', 'u3'], paidBy: 'u1', splits: [{ userId: 'u1', amount: 50 }, { userId: 'u3', amount: 50 }] }),
    );
    // u1 and u3 are NOT accepted friends — no friendships row at all.
    signIn('u1');

    await expect(groups.remove(group.id)).rejects.toMatchObject({ name: 'GroupDeleteBlockedByFriendshipError' });

    expect(await groups.get(group.id)).not.toBeNull();
    expect((await expenses.get(expense.id))?.groupId).toBe(group.id);
  });

  it('reports failure honestly when the delete op is a silent no-op and the group is still there after the batch', async () => {
    const group = await groups.create(groupBase({ memberIds: ['u1'], adminIds: ['u1'], members: [groupBase().members[0]] }));
    signIn('u1');
    // Simulate batch_write's own "delete is a silent no-op when denied"
    // contract: the RPC reports success, but the row never actually left.
    const batchSpy = vi.spyOn(storageAdapter!, 'batchWrite').mockResolvedValue({ success: true, count: 1 });

    await expect(groups.remove(group.id)).rejects.toMatchObject({ name: 'GroupDeleteVerificationFailedError' });

    batchSpy.mockRestore();
  });

  it('throws a typed not-found error for an unknown id', async () => {
    signIn('u1');
    await expect(groups.remove('does-not-exist')).rejects.toMatchObject({ name: 'GroupNotFoundError' });
  });
});
