import { describe, expect, it } from 'vitest';
import { acceptedFriendIds, otherUser, partitionFriendships } from './friends';
import type { Friendship } from '@/schemas/friendship';

/**
 * Plan B13: the "other user in a 2-person `friendship.users` tuple" logic
 * used to be duplicated inline in `ExpenseForm.tsx` (plan B10's own
 * `acceptedFriendIds` memo) — pulled out here as one pure helper module so
 * both the expense form's participant picker and the friends islands share
 * it exactly (this file's own test coverage, plus `ExpenseForm.test.tsx`
 * staying green after the refactor, are the only proof it's the same
 * logic).
 */

function friendship(overrides: Partial<Friendship> = {}): Friendship {
  return {
    id: 'f1',
    users: ['u1', 'u2'],
    status: 'pending',
    requestedBy: 'u1',
    createdAt: '2026-09-28T00:00:00.000Z',
    ...overrides,
  };
}

describe('otherUser', () => {
  it('returns the user on the row who is not the given uid', () => {
    expect(otherUser(friendship({ users: ['u1', 'u2'] }), 'u1')).toBe('u2');
    expect(otherUser(friendship({ users: ['u1', 'u2'] }), 'u2')).toBe('u1');
  });

  it('returns undefined when uid is not on the row at all', () => {
    expect(otherUser(friendship({ users: ['u1', 'u2'] }), 'u3')).toBeUndefined();
  });
});

describe('acceptedFriendIds', () => {
  it('returns the other user of every ACCEPTED row, ignoring pending/rejected ones', () => {
    const rows = [
      friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted' }),
      friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending' }),
      friendship({ id: 'f3', users: ['u1', 'u4'], status: 'rejected' }),
      friendship({ id: 'f4', users: ['u1', 'u5'], status: 'accepted' }),
    ];
    expect(acceptedFriendIds(rows, 'u1').sort()).toEqual(['u2', 'u5']);
  });

  it('returns an empty array for no rows', () => {
    expect(acceptedFriendIds([], 'u1')).toEqual([]);
  });
});

describe('partitionFriendships', () => {
  it('buckets accepted / received (pending, someone else requested) / sent (pending, I requested)', () => {
    const accepted = friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' });
    const received = friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u3' });
    const sent = friendship({ id: 'f3', users: ['u1', 'u4'], status: 'pending', requestedBy: 'u1' });
    const result = partitionFriendships([accepted, received, sent], 'u1');
    expect(result.accepted.map((f) => f.id)).toEqual(['f1']);
    expect(result.received.map((f) => f.id)).toEqual(['f2']);
    expect(result.sent.map((f) => f.id)).toEqual(['f3']);
  });

  it('drops a rejected row from every bucket (plan B13 / ADR 0006: neither pending nor accepted, not shown anywhere)', () => {
    const rejected = friendship({ id: 'f1', users: ['u1', 'u2'], status: 'rejected', requestedBy: 'u2' });
    const result = partitionFriendships([rejected], 'u1');
    expect(result.accepted).toEqual([]);
    expect(result.received).toEqual([]);
    expect(result.sent).toEqual([]);
  });
});
