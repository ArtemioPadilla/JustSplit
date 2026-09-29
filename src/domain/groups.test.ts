import { describe, expect, it } from 'vitest';
import {
  MAX_GROUP_MEMBERS,
  buildCreateGroupInput,
  ROLE_LABELS,
  computeAdminIds,
  displayedRole,
  filterAttachableEvents,
  filterAttachableExpenses,
  isEventAttachable,
  isExpenseAttachable,
  isLastAdmin,
  withAddedMembers,
  withRemovedMember,
} from './groups';
import type { ExpenseGroup, ExpenseGroupMember } from '@/schemas/group';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';

/**
 * Pure group-membership-lifecycle helpers (plan B12, risk:high). Pulled out
 * of `GroupForm`/`GroupDetailView` so `adminIds` derivation, the attach
 * filters, and the member-removal preflight logic are each provable in one
 * place, the same reasoning as `domain/friends.ts` (B13) and
 * `domain/expenseParticipants.ts` (B10).
 */

const NOW = '2026-09-28T00:00:00.000Z';

function member(overrides: Partial<ExpenseGroupMember> = {}): ExpenseGroupMember {
  return { userId: 'u1', displayName: 'Ana', role: 'member', joinedAt: NOW, ...overrides };
}

function group(overrides: Partial<ExpenseGroup> = {}): ExpenseGroup {
  return {
    id: 'g1',
    name: 'Roommates',
    type: 'friends',
    currency: 'USD',
    members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'member' })],
    totalExpenses: 0,
    memberIds: ['u1', 'u2'],
    adminIds: ['u1'],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    groupId: null,
    description: 'Tacos',
    amount: 100,
    currency: 'USD',
    paidBy: 'u1',
    splitType: 'equal',
    splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }],
    date: '2026-09-28',
    memberIds: ['u1', 'u2'],
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

function event(overrides: Partial<Event> = {}): Event {
  return {
    id: 'ev1',
    name: 'Trip',
    groupId: null,
    memberIds: ['u1', 'u2'],
    kind: 'event',
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

describe('computeAdminIds', () => {
  it('includes owner and admin roles, never moderator/member', () => {
    const members = [
      member({ userId: 'u1', role: 'owner' }),
      member({ userId: 'u2', role: 'admin' }),
      member({ userId: 'u3', role: 'moderator' }),
      member({ userId: 'u4', role: 'member' }),
    ];
    expect(computeAdminIds(members)).toEqual(['u1', 'u2']);
  });

  // B19b: deny by default. A role outside the enum (a raw jsonb value that
  // skipped parsing) never counts as an admin.
  it('grants nothing to a role outside the enum', () => {
    const members = [
      member({ userId: 'u1', role: 'owner' }),
      member({ userId: 'u2', role: 'user' as unknown as 'member' }),
      member({ userId: 'u3', role: undefined as unknown as 'member' }),
    ];
    expect(computeAdminIds(members)).toEqual(['u1']);
  });
});

describe('buildCreateGroupInput', () => {
  it('builds the universal ExpenseGroup create payload with the creator as owner and invitees as member', () => {
    const input = buildCreateGroupInput({
      name: 'Roommates',
      description: 'Shared rent',
      currency: 'MXN',
      creator: { userId: 'u1', displayName: 'Ana' },
      invitees: [{ userId: 'u2', displayName: 'Beto' }],
      now: NOW,
    });

    expect(input.type).toBe('friends');
    expect(input.currency).toBe('MXN');
    expect(input.members).toEqual([
      { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: NOW },
      { userId: 'u2', displayName: 'Beto', role: 'member', joinedAt: NOW, invitedBy: 'u1' },
    ]);
    expect(input.memberIds).toEqual(['u1', 'u2']);
    expect(input.adminIds).toEqual(['u1']);
    expect(input.settings).toEqual({ defaultSplitType: 'equal', simplifyDebts: true, maxMembers: MAX_GROUP_MEMBERS });
    expect(input.totalExpenses).toBe(0);
    expect(input.createdBy).toBe('u1');
  });

  it('derives adminIds from members[] roles, never drifting even with no invitees', () => {
    const input = buildCreateGroupInput({
      name: 'Solo',
      currency: 'USD',
      creator: { userId: 'u1', displayName: 'Ana' },
      invitees: [],
      now: NOW,
    });
    expect(input.memberIds).toEqual(['u1']);
    expect(input.adminIds).toEqual(['u1']);
  });
});

describe('withAddedMembers', () => {
  it('appends invitees as role member and recomputes memberIds/adminIds', () => {
    const patch = withAddedMembers(group(), [{ userId: 'u3', displayName: 'Caro' }], 'u1', NOW);
    expect(patch.members.map((m) => m.userId)).toEqual(['u1', 'u2', 'u3']);
    expect(patch.members[2]).toEqual({ userId: 'u3', displayName: 'Caro', role: 'member', joinedAt: NOW, invitedBy: 'u1' });
    expect(patch.memberIds).toEqual(['u1', 'u2', 'u3']);
    expect(patch.adminIds).toEqual(['u1']);
  });
});

describe('withRemovedMember', () => {
  it('drops the member and recomputes memberIds/adminIds', () => {
    const patch = withRemovedMember(group(), 'u2');
    expect(patch.members.map((m) => m.userId)).toEqual(['u1']);
    expect(patch.memberIds).toEqual(['u1']);
    expect(patch.adminIds).toEqual(['u1']);
  });

  it('recomputes adminIds even when the removed member was itself an admin', () => {
    const g = group({
      members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'admin' })],
      adminIds: ['u1', 'u2'],
    });
    const patch = withRemovedMember(g, 'u2');
    expect(patch.adminIds).toEqual(['u1']);
  });
});

describe('isLastAdmin', () => {
  it('is true only when the member is the SOLE admin', () => {
    expect(isLastAdmin('u1', ['u1'])).toBe(true);
    expect(isLastAdmin('u1', ['u1', 'u2'])).toBe(false);
    expect(isLastAdmin('u2', ['u1'])).toBe(false);
  });
});

describe('isExpenseAttachable / filterAttachableExpenses', () => {
  it('offers only UNGROUPED expenses whose splits ∪ paidBy ⊆ group.memberIds', () => {
    const g = group({ memberIds: ['u1', 'u2'] });
    const attachable = expense({ id: 'e1', groupId: null, paidBy: 'u1', splits: [{ userId: 'u1', amount: 100 }] });
    const alreadyGrouped = expense({ id: 'e2', groupId: 'g-other', paidBy: 'u1', splits: [{ userId: 'u1', amount: 100 }] });
    const outsideParticipant = expense({ id: 'e3', groupId: null, paidBy: 'u1', splits: [{ userId: 'u3', amount: 100 }] });

    expect(isExpenseAttachable(attachable, g)).toBe(true);
    expect(isExpenseAttachable(alreadyGrouped, g)).toBe(false);
    expect(isExpenseAttachable(outsideParticipant, g)).toBe(false);

    expect(filterAttachableExpenses([attachable, alreadyGrouped, outsideParticipant], g)).toEqual([attachable]);
  });
});

describe('isEventAttachable / filterAttachableEvents', () => {
  it('offers only UNGROUPED events whose memberIds ⊆ group.memberIds', () => {
    const g = group({ memberIds: ['u1', 'u2'] });
    const attachable = event({ id: 'ev1', groupId: null, memberIds: ['u1', 'u2'] });
    const alreadyGrouped = event({ id: 'ev2', groupId: 'g-other', memberIds: ['u1'] });
    const outsideParticipant = event({ id: 'ev3', groupId: null, memberIds: ['u1', 'u3'] });

    expect(isEventAttachable(attachable, g)).toBe(true);
    expect(isEventAttachable(alreadyGrouped, g)).toBe(false);
    expect(isEventAttachable(outsideParticipant, g)).toBe(false);

    expect(filterAttachableEvents([attachable, alreadyGrouped, outsideParticipant], g)).toEqual([attachable]);
  });
});

/**
 * Plan B19c (risk:high, ADR 0015): the displayed role comes from `admin_ids`, never from the stored
 * `members[].role`. Any member can edit `members[]` (ordinary jsonb field; `guard_expense_groups` only
 * gates `member_ids`, `admin_ids` and `created_by`), so that label is user-writable: it can lie in a badge
 * and, worse, `computeAdminIds` over it used to feed `admin_ids` on the next admin membership patch.
 * Authority is `admin_ids` (RLS and the guard read it); the owner is the immutable `created_by`.
 */
describe('displayedRole', () => {
  const g = group({
    members: [
      member({ userId: 'u1', role: 'owner' }),
      member({ userId: 'u2', role: 'admin' }), // a forged label: u2 is NOT in adminIds
      member({ userId: 'u3', role: 'member' }), // an unlabelled admin: u3 IS in adminIds
      member({ userId: 'u4', role: 'owner' }), // a forged owner
      member({ userId: 'u5', role: 'moderator' }),
    ],
    memberIds: ['u1', 'u2', 'u3', 'u4', 'u5'],
    adminIds: ['u1', 'u3'],
    createdBy: 'u1',
  });

  it('is Admin exactly when the id is in admin_ids, whatever the stored label says', () => {
    expect(displayedRole(g, 'u3')).toBe('admin');
    expect(displayedRole(g, 'u2')).toBe('member');
  });

  it('the creator who is an admin is the Owner (created_by is immutable); nobody else is, whatever they are labelled', () => {
    expect(displayedRole(g, 'u1')).toBe('owner');
    expect(displayedRole(g, 'u4')).toBe('member');
  });

  it('a creator who is no longer an admin is a Member: the label never claims power the person does not have', () => {
    expect(displayedRole({ ...g, adminIds: ['u3'] }, 'u1')).toBe('member');
  });

  it('a stored moderator (nothing writes one) reads as Member', () => {
    expect(displayedRole(g, 'u5')).toBe('member');
  });

  it('a person who is not in the group at all is a Member (deny by default)', () => {
    expect(displayedRole(g, 'nobody')).toBe('member');
  });

  it('has one label per displayed role', () => {
    expect(ROLE_LABELS).toEqual({ owner: 'Owner', admin: 'Admin', member: 'Member' });
  });
});

describe('membership patches never derive admin_ids from the stored labels (B19c)', () => {
  // u2 edited members[] to call themselves admin; admin_ids (the authority) still says only u1.
  const forged = group({
    members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'admin' })],
    adminIds: ['u1'],
  });

  it('adding a member keeps admin_ids exactly as it is: a forged label is not promoted', () => {
    const patch = withAddedMembers(forged, [{ userId: 'u3', displayName: 'Caro' }], 'u1', NOW);
    expect(patch.adminIds).toEqual(['u1']);
  });

  it('removing a member removes that id from admin_ids and adds nobody: a forged label is not promoted', () => {
    const patch = withRemovedMember(group({ ...forged, members: [...forged.members, member({ userId: 'u3' })], memberIds: ['u1', 'u2', 'u3'] }), 'u3');
    expect(patch.adminIds).toEqual(['u1']);
  });

  it('removing an admin drops them from admin_ids', () => {
    const g = group({
      members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'member' })],
      adminIds: ['u1', 'u2'],
    });
    expect(withRemovedMember(g, 'u2').adminIds).toEqual(['u1']);
  });

  it('rewrites every stored label from admin_ids, so a forged one is healed whenever an admin touches membership', () => {
    const patch = withAddedMembers(forged, [{ userId: 'u3', displayName: 'Caro' }], 'u1', NOW);
    expect(patch.members.map((m) => [m.userId, m.role])).toEqual([
      ['u1', 'owner'],
      ['u2', 'member'],
      ['u3', 'member'],
    ]);
  });

  it('labels an admin who is not the creator "admin" and a creator who lost admin_ids "member", so the stored labels stay consistent with admin_ids', () => {
    const g = group({
      members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'member' }), member({ userId: 'u3', role: 'owner' })],
      memberIds: ['u1', 'u2', 'u3'],
      adminIds: ['u2', 'u3'],
      createdBy: 'u1',
    });
    const patch = withAddedMembers(g, [], 'u2', NOW);
    expect(patch.members.map((m) => [m.userId, m.role])).toEqual([
      ['u1', 'member'],
      ['u2', 'admin'],
      ['u3', 'admin'],
    ]);
  });

  it('keeps every other field of a member (name, joinedAt, invitedBy)', () => {
    const g = group({ members: [member({ userId: 'u1', role: 'owner' }), member({ userId: 'u2', role: 'member', invitedBy: 'u1' })] });
    const patch = withRemovedMember({ ...g, members: [...g.members, member({ userId: 'u3' })] }, 'u3');
    expect(patch.members[1]).toEqual({ userId: 'u2', displayName: 'Ana', role: 'member', joinedAt: NOW, invitedBy: 'u1' });
  });
});

