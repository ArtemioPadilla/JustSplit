import { describe, expect, it } from 'vitest';
import { resolveEventParticipants, violatesNoGroupInvariant } from './expenseParticipants';

/**
 * Plan B10 coordinator review (risk:high): the `?event=` participant pool
 * must never offer someone the `expenses_insert`/`_update` RLS policy would
 * reject. `eventId` has no column (an overflow key) — RLS knows nothing
 * about event membership, so the pool has to be derived from the policy's
 * OWN two branches instead:
 *   - the event's group (`event.groupId` not null): a group expense, same
 *     rule as `?group=` — candidates are the group's members, restricted to
 *     who's actually in the event too (falling back to the whole group if
 *     that intersection is empty, e.g. an event with no group members yet).
 *   - no group: every member other than the caller must be an accepted
 *     friend of the caller (`db/migrations/20260928000004_rls_policies.sql`,
 *     `expenses_insert`/`_update` WITH CHECK, `group_id is null` branch).
 */
describe('resolveEventParticipants — event with a group (spec: same rule as ?group=)', () => {
  const group = { id: 'g1', memberIds: ['u1', 'u2', 'u3'], currency: 'EUR' };

  it('intersects the event and group member lists', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'], groupId: 'g1' }, group, [], 'u1');
    expect(result).toMatchObject({ candidateIds: ['u1', 'u2'], groupId: 'g1', currency: 'EUR', excludedNonFriendCount: 0 });
  });

  it('falls back to the whole group when the intersection is empty', () => {
    const result = resolveEventParticipants({ memberIds: ['u9'], groupId: 'g1' }, group, [], 'u1');
    expect(result.candidateIds).toEqual(['u1', 'u2', 'u3']);
  });

  it('never excludes anyone for not being a friend — group membership is the only rule', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2', 'u3'], groupId: 'g1' }, group, [], 'u1');
    expect(result.excludedNonFriendCount).toBe(0);
    expect(result.candidateIds).toContain('u3');
  });

  it('returns no candidates yet (never the whole group) while the group itself has not resolved', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'], groupId: 'g1' }, undefined, [], 'u1');
    expect(result.candidateIds).toEqual([]);
  });
});

describe('resolveEventParticipants — event with no group (spec: every other member must be an accepted friend)', () => {
  it('offers only event members who are the caller or an accepted friend', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2', 'u3'] }, undefined, ['u2'], 'u1');
    expect(result.candidateIds).toEqual(['u1', 'u2']);
    expect(result.candidateIds).not.toContain('u3');
  });

  it('counts the excluded (non-friend) members for the notice, without naming them', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2', 'u3', 'u4'] }, undefined, ['u2'], 'u1');
    expect(result.excludedNonFriendCount).toBe(2); // u3 and u4
  });

  it('excludedNonFriendCount is 0 when every member is already a friend or the caller', () => {
    const result = resolveEventParticipants({ memberIds: ['u1', 'u2'] }, undefined, ['u2'], 'u1');
    expect(result.excludedNonFriendCount).toBe(0);
  });

  it('uses the event preferredCurrency for the no-group case', () => {
    const result = resolveEventParticipants({ memberIds: ['u1'], preferredCurrency: 'MXN' }, undefined, [], 'u1');
    expect(result.currency).toBe('MXN');
    expect(result.groupId).toBeUndefined();
  });
});

describe('violatesNoGroupInvariant (the RLS group_id is null WITH CHECK, mirrored client-side)', () => {
  it('is false when every other member is an accepted friend', () => {
    expect(violatesNoGroupInvariant(['u1', 'u2'], ['u2'], 'u1')).toBe(false);
  });

  it('is true when a member other than the caller is not an accepted friend', () => {
    expect(violatesNoGroupInvariant(['u1', 'u2', 'u3'], ['u2'], 'u1')).toBe(true);
  });

  it('is false for the caller alone', () => {
    expect(violatesNoGroupInvariant(['u1'], [], 'u1')).toBe(false);
  });

  it('never flags the caller themself as a required friend', () => {
    expect(violatesNoGroupInvariant(['u1'], [], 'u1')).toBe(false);
  });
});
