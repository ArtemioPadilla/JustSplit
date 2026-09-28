import { describe, expect, it, vi } from 'vitest';

/**
 * Plan B5a: `src/lib/data/repos/*` are plain async functions over the
 * `StorageAdapter` interface, Zod-validated (plan B3). Mocking
 * `@/lib/data/adapter` swaps in the in-memory adapter (one shared instance
 * for the whole file — every collection's ids below are distinct enough to
 * not collide) so these tests never touch Supabase.
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const groups = await import('./groups');
const expenses = await import('./expenses');
const settlements = await import('./settlements');
const events = await import('./events');
const friendships = await import('./friendships');

describe('repos.groups', () => {
  it('create validates the write-input schema, then get() rehydrates it with server timestamps', async () => {
    const created = await groups.create({
      name: 'Roomies',
      type: 'community',
      currency: 'MXN',
      members: [{ userId: 'u1', displayName: 'Ada', role: 'admin', joinedAt: '2026-09-28T00:00:00.000Z' }],
      totalExpenses: 0,
      memberIds: ['u1'],
      adminIds: ['u1'],
      createdBy: 'u1',
    });
    expect(created.name).toBe('Roomies');
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const fetched = await groups.get(created.id);
    expect(fetched).toEqual(created);
  });

  it('listForUser queries memberIds array-contains uid (ADR 0002 canonical query)', async () => {
    const g = await groups.create({
      name: 'Trip fund',
      type: 'friends',
      currency: 'MXN',
      members: [],
      totalExpenses: 0,
      memberIds: ['listforuser-u1'],
      adminIds: ['listforuser-u1'],
      createdBy: 'listforuser-u1',
    });
    const list = await groups.listForUser('listforuser-u1');
    expect(list.map((x) => x.id)).toContain(g.id);
  });

  it('update() is a partial patch', async () => {
    const g = await groups.create({
      name: 'Before',
      type: 'friends',
      currency: 'MXN',
      members: [],
      totalExpenses: 0,
      memberIds: ['u1'],
      adminIds: ['u1'],
      createdBy: 'u1',
    });
    const updated = await groups.update(g.id, { name: 'After' });
    expect(updated?.name).toBe('After');
    expect(updated?.currency).toBe('MXN');
  });

  it('remove() deletes the row', async () => {
    const g = await groups.create({
      name: 'Gone',
      type: 'friends',
      currency: 'MXN',
      members: [],
      totalExpenses: 0,
      memberIds: ['u1'],
      adminIds: ['u1'],
      createdBy: 'u1',
    });
    await groups.remove(g.id);
    expect(await groups.get(g.id)).toBeNull();
  });
});

describe('repos.expenses', () => {
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
    eventId: 'trip-1',
  };

  it('create + get roundtrip, including the eventId overflow key (spec D9/D10)', async () => {
    const created = await expenses.create(base);
    const fetched = await expenses.get(created.id);
    expect(fetched).toMatchObject({ description: 'Tacos', eventId: 'trip-1' });
  });

  it(
    "update() merges an overflow-key patch into extra without erasing other overflow keys — " +
      'a settledAt update leaves eventId intact (deferred B3 test, plan B5a)',
    async () => {
      const created = await expenses.create(base);
      const updated = await expenses.update(created.id, { settledAt: '2026-09-28T00:00:00.000Z' });
      expect(updated).toMatchObject({ eventId: 'trip-1', settledAt: '2026-09-28T00:00:00.000Z' });
    },
  );

  it('listForGroup and listForEvent use the canonical groupId==id / eventId==id queries (ADR 0002)', async () => {
    const grouped = await expenses.create({ ...base, groupId: 'g1', eventId: undefined });
    const eventScoped = await expenses.create({ ...base, eventId: 'trip-2' });

    const byGroup = await expenses.listForGroup('g1');
    expect(byGroup.map((x) => x.id)).toEqual([grouped.id]);

    const byEvent = await expenses.listForEvent('trip-2');
    expect(byEvent.map((x) => x.id)).toEqual([eventScoped.id]);
  });
});

describe('repos.settlements', () => {
  it('create + get roundtrip; settlements are immutable (no update export, D10)', async () => {
    const created = await settlements.create({
      groupId: null,
      fromUserId: 'u2',
      toUserId: 'u1',
      amount: 50,
      currency: 'MXN',
      date: '2026-09-28',
      memberIds: ['u1', 'u2'],
      createdBy: 'u2',
    });
    expect(await settlements.get(created.id)).toMatchObject({ fromUserId: 'u2', toUserId: 'u1' });
    expect((settlements as Record<string, unknown>).update).toBeUndefined();
  });
});

describe('repos.events', () => {
  it('create + get roundtrip, including the kind column', async () => {
    const created = await events.create({
      name: 'Cancun',
      memberIds: ['u1'],
      kind: 'trip',
      createdBy: 'u1',
    });
    expect(await events.get(created.id)).toMatchObject({ name: 'Cancun', kind: 'trip' });
  });

  it('listForGroup uses groupId == id', async () => {
    const e = await events.create({ name: 'Team offsite', groupId: 'g1', memberIds: ['u1'], kind: 'event', createdBy: 'u1' });
    const list = await events.listForGroup('g1');
    expect(list.map((x) => x.id)).toContain(e.id);
  });
});

describe('repos.friendships', () => {
  it('create + get roundtrip; listForUser uses users array-contains uid', async () => {
    const f = await friendships.create({ users: ['u1', 'friend-u2'], status: 'pending', requestedBy: 'u1' });
    expect(await friendships.get(f.id)).toMatchObject({ status: 'pending' });
    const list = await friendships.listForUser('friend-u2');
    expect(list.map((x) => x.id)).toContain(f.id);
  });

  it('update() changes status (accept/reject)', async () => {
    const f = await friendships.create({ users: ['u3', 'u4'], status: 'pending', requestedBy: 'u3' });
    const accepted = await friendships.update(f.id, { status: 'accepted' });
    expect(accepted?.status).toBe('accepted');
  });
});
