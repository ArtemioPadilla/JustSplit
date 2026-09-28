import { describe, expect, it } from 'vitest';
import { resolveEventParticipants, resolveMemberIds, violatesAddedMembersRule } from './expenseParticipants';

/**
 * Plan B10 coordinator review, rewritten for plan B2d (ADR 0013): an expense's
 * event is a real column and RLS knows event membership, so `?event=` offers
 * EVERY event member — the friend filter, the "N people aren't your friends"
 * count and the edit block are gone. What remains is the mirror of the
 * database's rule for people ADDED to a row (`guard_expenses` /
 * `expenses_insert`): group member when the row has a group; otherwise an event
 * member or an accepted friend when it has an event; otherwise an accepted
 * friend. UX only — RLS stays the sole authority.
 */
describe('resolveEventParticipants (?event= offers every event member)', () => {
  const group = { id: 'g1', memberIds: ['u1', 'u2', 'u3'], currency: 'EUR' };

  it('a no-group event: every event member is a candidate, whether or not they are the caller\'s friend', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2', 'u3'] }, undefined);
    expect(result.candidateIds).toEqual(['u1', 'u2', 'u3']);
    expect(result.groupId).toBeUndefined();
  });

  it('a no-group event uses the event preferredCurrency', () => {
    const result = resolveEventParticipants({ memberIds: ['u1'], preferredCurrency: 'MXN' }, undefined);
    expect(result.currency).toBe('MXN');
    expect(result.groupId).toBeUndefined();
  });

  it('an event in a group whose members are all in that group is still a group expense: group id + currency, event members as candidates', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'], groupId: 'g1' }, group);
    expect(result).toEqual({ candidateIds: ['u1', 'u2'], groupId: 'g1', currency: 'EUR' });
  });

  it('an event in a group with a member who left that group cannot be a group expense (member_ids ⊆ group): it stays an event expense with every member', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2', 'u9'], groupId: 'g1', preferredCurrency: 'MXN' }, group);
    expect(result.candidateIds).toEqual(['u1', 'u2', 'u9']);
    expect(result.groupId).toBeUndefined();
    expect(result.currency).toBe('MXN');
  });

  it('an event whose group the viewer cannot see (null) is an event expense with every member', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'], groupId: 'g1', preferredCurrency: 'MXN' }, null);
    expect(result).toEqual({ candidateIds: ['u1', 'u2'], groupId: undefined, currency: 'MXN' });
  });

  it('returns no candidates yet (never guesses) while an event\'s group is still loading', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'], groupId: 'g1' }, undefined);
    expect(result.candidateIds).toEqual([]);
  });
});

describe('violatesAddedMembersRule (the guard_expenses / expenses_insert rule for ADDED members, mirrored)', () => {
  const base = { uid: 'u1', acceptedFriendIds: ['u2'] };

  it('a row with no group and no event: an added member must be an accepted friend', () => {
    expect(violatesAddedMembersRule(['u1', 'u2'], ['u1'], base)).toBe(false);
    expect(violatesAddedMembersRule(['u1', 'u2', 'u3'], ['u1'], base)).toBe(true);
  });

  it('only ADDED members are checked: existing non-friends never block an edit', () => {
    expect(violatesAddedMembersRule(['u1', 'u2', 'u3'], ['u1', 'u3'], base)).toBe(false);
    expect(violatesAddedMembersRule(['u1', 'u3'], ['u1', 'u2', 'u3'], base)).toBe(false); // removals are free
  });

  it('a create is the same rule with nothing previous: everyone but the caller must be a friend', () => {
    expect(violatesAddedMembersRule(['u1', 'u2'], [], base)).toBe(false);
    expect(violatesAddedMembersRule(['u1', 'u3'], [], base)).toBe(true);
  });

  it('never asks the caller to be their own friend', () => {
    expect(violatesAddedMembersRule(['u1'], [], { uid: 'u1', acceptedFriendIds: [] })).toBe(false);
  });

  it('a group row: an added member must be in the group, friend or not', () => {
    const ctx = { ...base, groupMemberIds: ['u1', 'u3'] };
    expect(violatesAddedMembersRule(['u1', 'u3'], ['u1'], ctx)).toBe(false); // u3: group member, not a friend
    expect(violatesAddedMembersRule(['u1', 'u2'], ['u1'], ctx)).toBe(true); // u2: a friend, but not in the group
  });

  it('an event row without a group: an added member is an event member OR an accepted friend', () => {
    const ctx = { ...base, eventMemberIds: ['u1', 'u4'] };
    expect(violatesAddedMembersRule(['u1', 'u4'], ['u1'], ctx)).toBe(false); // event member
    expect(violatesAddedMembersRule(['u1', 'u2'], ['u1'], ctx)).toBe(false); // friend
    expect(violatesAddedMembersRule(['u1', 'u5'], ['u1'], ctx)).toBe(true); // neither
  });

  it('the group wins when a row has both a group and an event (the database branches on group_id first)', () => {
    const ctx = { ...base, groupMemberIds: ['u1', 'u3'], eventMemberIds: ['u1', 'u4'] };
    expect(violatesAddedMembersRule(['u1', 'u4'], ['u1'], ctx)).toBe(true);
    expect(violatesAddedMembersRule(['u1', 'u3'], ['u1'], ctx)).toBe(false);
  });
});

describe('resolveMemberIds (what memberIds an expense is written with)', () => {
  it('create, group expense: the group\'s own memberIds (unchanged from B10)', () => {
    const ids = resolveMemberIds({ mode: 'create', participantIds: ['u1'], paidBy: 'u1', uid: 'u1', groupMemberIds: ['u1', 'u2', 'u3'] });
    expect(ids.slice().sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('create, no group: participants ∪ payer ∪ the caller', () => {
    const ids = resolveMemberIds({ mode: 'create', participantIds: ['u2'], paidBy: 'u3', uid: 'u1' });
    expect(ids.slice().sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('edit, group expense: never drops anyone (a removed member still on it stays), and adds only new participants or the payer, not everyone who joined later', () => {
    const ids = resolveMemberIds({
      mode: 'edit',
      participantIds: ['u1', 'u3'],
      paidBy: 'u1',
      uid: 'u1',
      groupMemberIds: ['u1', 'u2', 'u4'], // u3 left the group; u4 joined after the expense
      existingMemberIds: ['u1', 'u2', 'u3'],
    });
    expect(ids.slice().sort()).toEqual(['u1', 'u2', 'u3']);
  });

  it('edit, no group: participants ∪ payer (an unticked participant leaves the row), plus the editor only if they were already on it', () => {
    const named = resolveMemberIds({ mode: 'edit', participantIds: ['u1', 'u2'], paidBy: 'u1', uid: 'u1', existingMemberIds: ['u1', 'u2', 'u3'] });
    expect(named.slice().sort()).toEqual(['u1', 'u2']);
    // An event member editing a row that never named them is NOT added to it.
    const outsider = resolveMemberIds({ mode: 'edit', participantIds: ['u1', 'u2'], paidBy: 'u1', uid: 'u9', existingMemberIds: ['u1', 'u2'] });
    expect(outsider.slice().sort()).toEqual(['u1', 'u2']);
    const editorOnRow = resolveMemberIds({ mode: 'edit', participantIds: ['u2'], paidBy: 'u2', uid: 'u1', existingMemberIds: ['u1', 'u2'] });
    expect(editorOnRow.slice().sort()).toEqual(['u1', 'u2']);
  });
});
