import { describe, expect, it } from 'vitest';
import {
  MAX_GROUP_MEMBERS,
  buildCreateGroupInput,
  computeAdminIds,
  filterAttachableEvents,
  filterAttachableExpenses,
  isEventAttachable,
  isExpenseAttachable,
  isLastAdmin,
  memberRemovalBlockerCount,
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

describe('memberRemovalBlockerCount', () => {
  it('counts group expenses and events that still carry the member in memberIds', () => {
    const expenses = [expense({ id: 'e1', memberIds: ['u1', 'u2'] }), expense({ id: 'e2', memberIds: ['u1'] })];
    const events = [event({ id: 'ev1', memberIds: ['u1', 'u2'] })];
    expect(memberRemovalBlockerCount('u2', expenses, events)).toBe(2);
  });

  it('returns 0 when the member appears in no group row', () => {
    const expenses = [expense({ id: 'e1', memberIds: ['u1'] })];
    expect(memberRemovalBlockerCount('u2', expenses, [])).toBe(0);
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
