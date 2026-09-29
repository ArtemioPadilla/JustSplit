import { describe, expect, it, vi } from 'vitest';

/**
 * B19b: a group row whose `members[]` carries a role outside
 * `owner|admin|moderator|member` (the RLS fixtures wrote `'user'`, and until
 * migration 016 the database accepted it) must still load: `get` and
 * `listForUser` used to throw a ZodError, which `GroupDetailView` showed as
 * "Something went wrong loading this group" for the whole page.
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const groups = await import('./groups');
const { storageAdapter } = await import('@/lib/data/adapter');

const NOW = '2026-09-28T00:00:00.000Z';

async function seedWithUnknownRole(id: string) {
  await storageAdapter!.setDocument('expense_groups', id, {
    name: 'Legacy',
    type: 'friends',
    currency: 'USD',
    members: [
      { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
      { userId: 'u2', displayName: 'Beto', role: 'user', joinedAt: NOW },
    ],
    totalExpenses: 0,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    createdAt: NOW,
  });
}

describe('repos.groups with an unknown stored member role (B19b)', () => {
  it('get() resolves the group and reads the unknown role as "member"', async () => {
    await seedWithUnknownRole('legacy-get');
    const group = await groups.get('legacy-get');
    expect(group?.members.map((m) => m.role)).toEqual(['owner', 'member']);
    expect(group?.adminIds).toEqual(['u1']);
  });

  it('listForUser() returns the group instead of failing the whole list', async () => {
    await seedWithUnknownRole('legacy-list');
    const list = await groups.listForUser('u2');
    expect(list.map((g) => g.id)).toContain('legacy-list');
  });
});
