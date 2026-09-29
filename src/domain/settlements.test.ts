import { describe, expect, it } from 'vitest';
import {
  exceedsOwed,
  isParty,
  newestFirst,
  parseSettlementsScope,
  splitBalances,
  viewerFirst,
} from './settlements';

/**
 * Pure helpers behind the `/settlements` island (plan B14): which scope the URL
 * asks for, how suggestions and history are ordered, who may record a payment,
 * and how balances are grouped. UX only: RLS decides what a viewer may write.
 */
describe('parseSettlementsScope', () => {
  it('no query is the personal view', () => {
    expect(parseSettlementsScope('')).toEqual({ scope: { kind: 'personal' }, groupRequested: false });
    expect(parseSettlementsScope('?')).toEqual({ scope: { kind: 'personal' }, groupRequested: false });
  });

  it('?event=<id> is the event scope', () => {
    expect(parseSettlementsScope('?event=ev1')).toEqual({ scope: { kind: 'event', eventId: 'ev1' }, groupRequested: false });
  });

  it('an empty or blank ?event= is the personal view, not an event with no id', () => {
    expect(parseSettlementsScope('?event=').scope).toEqual({ kind: 'personal' });
    expect(parseSettlementsScope('?event=%20%20').scope).toEqual({ kind: 'personal' });
  });

  it('?group=<id> keeps the personal view and asks for the "coming soon" note', () => {
    expect(parseSettlementsScope('?group=g1')).toEqual({ scope: { kind: 'personal' }, groupRequested: true });
  });

  it('?event and ?group together: the event scope wins and the note is still asked for', () => {
    expect(parseSettlementsScope('?event=ev1&group=g1')).toEqual({ scope: { kind: 'event', eventId: 'ev1' }, groupRequested: true });
  });

  it('ignores unrelated params and decodes the event id', () => {
    expect(parseSettlementsScope('?foo=1&event=a%2Fb').scope).toEqual({ kind: 'event', eventId: 'a/b' });
  });
});

describe('isParty', () => {
  const suggestion = { fromUser: 'u1', toUser: 'u2' };

  it('is true for the payer and for the payee', () => {
    expect(isParty(suggestion, 'u1')).toBe(true);
    expect(isParty(suggestion, 'u2')).toBe(true);
  });

  it('is false for anyone else, and denies by default with no viewer', () => {
    expect(isParty(suggestion, 'u3')).toBe(false);
    expect(isParty(suggestion, undefined)).toBe(false);
    expect(isParty(suggestion, '')).toBe(false);
  });
});

describe('viewerFirst', () => {
  it("puts the viewer's own suggestions first and keeps the greedy order inside each group", () => {
    const rows = [
      { id: 'a', fromUser: 'u2', toUser: 'u3' },
      { id: 'b', fromUser: 'u1', toUser: 'u3' },
      { id: 'c', fromUser: 'u3', toUser: 'u4' },
      { id: 'd', fromUser: 'u4', toUser: 'u1' },
    ];
    expect(viewerFirst(rows, 'u1').map((row) => row.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('does not mutate its input', () => {
    const rows = [
      { fromUser: 'u2', toUser: 'u3' },
      { fromUser: 'u1', toUser: 'u3' },
    ];
    const copy = [...rows];
    viewerFirst(rows, 'u1');
    expect(rows).toEqual(copy);
  });
});

describe('newestFirst', () => {
  const row = (id: string, date: string, createdAt: string) => ({ id, date, createdAt });

  it('orders by date descending, then by creation time descending', () => {
    const rows = [
      row('old', '2026-01-01', '2026-01-01T10:00:00.000Z'),
      row('new', '2026-03-01', '2026-03-01T08:00:00.000Z'),
      row('same-day-later', '2026-03-01', '2026-03-01T09:00:00.000Z'),
    ];
    expect(newestFirst(rows).map((r) => r.id)).toEqual(['same-day-later', 'new', 'old']);
  });

  it('does not mutate its input', () => {
    const rows = [row('a', '2026-01-01', 'x'), row('b', '2026-02-01', 'y')];
    newestFirst(rows);
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('splitBalances', () => {
  it('splits net balances into who owes and who is owed, largest first, as positive amounts', () => {
    expect(splitBalances({ u1: 50, u2: -30, u3: -20, u4: 5 })).toEqual({
      owes: [
        { userId: 'u2', amount: 30 },
        { userId: 'u3', amount: 20 },
      ],
      owed: [
        { userId: 'u1', amount: 50 },
        { userId: 'u4', amount: 5 },
      ],
    });
  });

  it('leaves out anyone within a cent of zero (they are settled up)', () => {
    expect(splitBalances({ u1: 0, u2: 0.004, u3: -0.004, u4: 10, u5: -10 })).toEqual({
      owes: [{ userId: 'u5', amount: 10 }],
      owed: [{ userId: 'u4', amount: 10 }],
    });
  });

  it('breaks ties by user id so the order is stable', () => {
    expect(splitBalances({ b: -10, a: -10 }).owes.map((entry) => entry.userId)).toEqual(['a', 'b']);
  });

  it('an empty scope has nobody in either list', () => {
    expect(splitBalances({})).toEqual({ owes: [], owed: [] });
  });
});

describe('exceedsOwed', () => {
  it('is true only when the amount is at least one cent above what is owed', () => {
    expect(exceedsOwed(30.01, 30)).toBe(true);
    expect(exceedsOwed(31, 30)).toBe(true);
  });

  it('a partial or exact payment is not an overpayment', () => {
    expect(exceedsOwed(10, 30)).toBe(false);
    expect(exceedsOwed(30, 30)).toBe(false);
  });

  it('compares whole cents, so float noise never flags an exact payment', () => {
    expect(exceedsOwed(0.1 + 0.2, 0.3)).toBe(false);
    expect(exceedsOwed(10.01, 10.0)).toBe(true);
  });
});
