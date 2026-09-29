import { describe, expect, it } from 'vitest';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import { balancesWithUser } from './dashboard';
import {
  exceedsOwed,
  isParty,
  newestFirst,
  pairwiseLists,
  pairwiseSuggestions,
  parseSettlementsScope,
  recordingRoute,
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

/**
 * The personal view is PAIRWISE (plan B14b, ADR 0014 §5): one row per other
 * person, from `balancesWithUser` — the dashboard's own maths — with no
 * cross-person simplification. Two people therefore always see the same number
 * for the debt between them.
 */
describe('pairwise personal view', () => {
  const ANA = 'u1';
  const BETO = 'u2';
  const CARLA = 'u3';
  const expense = (over: Partial<Expense> & Pick<Expense, 'id' | 'paidBy' | 'amount' | 'splits' | 'memberIds'>): Expense => ({
    groupId: null,
    description: 'x',
    currency: 'USD',
    splitType: 'equal',
    date: '2026-09-01',
    createdBy: over.paidBy,
    createdAt: '2026-09-01T00:00:00.000Z',
    ...over,
  });
  // The live-run fixture that showed Beto "You owe Ana 80" and Ana "Beto owes you 60".
  const EXPENSES: Expense[] = [
    expense({ id: 'p1', paidBy: ANA, amount: 90, memberIds: [ANA, BETO, CARLA], splits: [{ userId: ANA, amount: 30 }, { userId: BETO, amount: 30 }, { userId: CARLA, amount: 30 }] }),
    expense({ id: 'e1', paidBy: CARLA, amount: 40, memberIds: [BETO, CARLA], splits: [{ userId: BETO, amount: 20 }, { userId: CARLA, amount: 20 }] }),
    expense({ id: 'e2', paidBy: ANA, amount: 60, memberIds: [ANA, BETO], splits: [{ userId: ANA, amount: 30 }, { userId: BETO, amount: 30 }] }),
  ];
  const ids = (rows: { memberIds: string[] }[], uid: string) => rows.filter((r) => r.memberIds.includes(uid));
  const identity = (amount: number) => amount;
  const suggestionsFor = (uid: string, settlements: Settlement[] = []) =>
    pairwiseSuggestions(balancesWithUser(ids(EXPENSES, uid) as Expense[], ids(settlements, uid) as Settlement[], uid, {}, identity), uid);

  it('is one row per person with a non-zero balance, "You owe P" or "P owes you", with no cross-person simplification', () => {
    expect(suggestionsFor(BETO)).toEqual([
      { fromUser: BETO, toUser: ANA, amount: 60 },
      { fromUser: BETO, toUser: CARLA, amount: 20 },
    ]);
    expect(suggestionsFor(ANA)).toEqual([
      { fromUser: CARLA, toUser: ANA, amount: 30 },
      { fromUser: BETO, toUser: ANA, amount: 60 },
    ].sort((a, b) => b.amount - a.amount));
  });

  it('two people see the same number, in opposite directions, for the debt between them', () => {
    const amountBetween = (rows: ReturnType<typeof pairwiseSuggestions>, a: string, b: string) =>
      rows.find((row) => (row.fromUser === a && row.toUser === b) || (row.fromUser === b && row.toUser === a));
    for (const [x, y] of [[ANA, BETO], [ANA, CARLA], [BETO, CARLA]] as const) {
      const seenByX = amountBetween(suggestionsFor(x), x, y);
      const seenByY = amountBetween(suggestionsFor(y), x, y);
      expect(seenByX, `${x} sees ${y}`).toBeDefined();
      expect(seenByX).toEqual(seenByY);
    }
  });

  it('counts a settlement between exactly the two people, whatever its event, and ignores one between two others', () => {
    const settlements = [
      { id: 's1', fromUserId: BETO, toUserId: ANA, amount: 10, currency: 'USD', date: '2026-09-02', memberIds: [BETO, ANA], createdBy: BETO, createdAt: 'x', groupId: null, eventId: 'ev1' },
      { id: 's2', fromUserId: CARLA, toUserId: BETO, amount: 5, currency: 'USD', date: '2026-09-02', memberIds: [CARLA, BETO], createdBy: CARLA, createdAt: 'x', groupId: null },
    ] as Settlement[];
    expect(suggestionsFor(BETO, settlements)).toEqual([
      { fromUser: BETO, toUser: ANA, amount: 50 },
      { fromUser: BETO, toUser: CARLA, amount: 25 },
    ]);
    // Ana does not see the Beto-Carla payment, and the Beto-Ana one lowers what Beto owes her by the same 10.
    expect(suggestionsFor(ANA, settlements)).toEqual([
      { fromUser: BETO, toUser: ANA, amount: 50 },
      { fromUser: CARLA, toUser: ANA, amount: 30 },
    ].sort((a, b) => b.amount - a.amount));
  });

  it('a partial payment leaves the rest, and paying it all removes the row', () => {
    const paid = (amount: number) =>
      [{ id: 's', fromUserId: BETO, toUserId: ANA, amount, currency: 'USD', date: '2026-09-02', memberIds: [BETO, ANA], createdBy: BETO, createdAt: 'x', groupId: null }] as Settlement[];
    expect(suggestionsFor(BETO, paid(60)).map((row) => row.toUser)).toEqual([CARLA]);
  });

  it('agrees with balancesWithUser for every person (what the dashboard shows)', () => {
    for (const uid of [ANA, BETO, CARLA]) {
      const balances = balancesWithUser(ids(EXPENSES, uid) as Expense[], [], uid, {}, identity);
      const rows = pairwiseSuggestions(balances, uid);
      expect(rows).toHaveLength(balances.length);
      for (const { userId, balance } of balances) {
        const row = rows.find((r) => (balance > 0 ? r.fromUser === userId : r.toUser === userId));
        expect(row?.amount, `${uid} with ${userId}`).toBe(Math.abs(balance));
      }
    }
  });

  it('orders largest first, ties by person', () => {
    const rows = pairwiseSuggestions(
      [
        { userId: 'b', name: 'b', balance: -10 },
        { userId: 'a', name: 'a', balance: 10 },
        { userId: 'c', name: 'c', balance: 25 },
      ],
      'me',
    );
    expect(rows.map((row) => row.amount)).toEqual([25, 10, 10]);
    expect(rows.map((row) => (row.fromUser === 'me' ? row.toUser : row.fromUser))).toEqual(['c', 'a', 'b']);
  });

  it('is empty when nobody has a balance with the viewer', () => {
    expect(pairwiseSuggestions([], 'me')).toEqual([]);
  });

  it('pairwiseLists splits the same rows into people you owe and people who owe you, largest first', () => {
    expect(
      pairwiseLists([
        { userId: 'a', name: 'a', balance: 10 },
        { userId: 'b', name: 'b', balance: -30 },
        { userId: 'c', name: 'c', balance: 25 },
        { userId: 'd', name: 'd', balance: -5 },
      ]),
    ).toEqual({
      youOwe: [
        { userId: 'b', amount: 30 },
        { userId: 'd', amount: 5 },
      ],
      oweYou: [
        { userId: 'c', amount: 25 },
        { userId: 'a', amount: 10 },
      ],
    });
  });
});

/**
 * Where a pairwise row can be recorded (plan B14b, review): `settlements_insert`
 * lets the creator name an accepted friend with no event, or a fellow member of
 * the event the row carries (migration 015). A button that RLS always denies is a
 * dead end, so each row gets exactly one route: record directly, record inside
 * its one event, or go to the event(s) to settle.
 */
describe('recordingRoute', () => {
  const V = 'v';
  const P = 'p';
  const owedBy = (id: string, paidBy: string, debtor: string, eventId?: string | null) => ({
    id,
    paidBy,
    splits: [{ userId: paidBy, amount: 10 }, { userId: debtor, amount: 10 }],
    eventId,
  });
  const paid = (id: string, from: string, to: string, eventId?: string | null) => ({ id, fromUserId: from, toUserId: to, eventId });
  const route = (over: Partial<Parameters<typeof recordingRoute>[0]>) =>
    recordingRoute({ viewerId: V, otherId: P, isFriend: false, expenses: [], settlements: [], ...over });

  it('a friend is recorded directly, whatever events the debt came from', () => {
    expect(route({ isFriend: true, expenses: [owedBy('a', V, P, 'e1'), owedBy('b', P, V, 'e2')] })).toEqual({ kind: 'direct' });
    expect(route({ isFriend: true, expenses: [owedBy('a', V, P, null)] })).toEqual({ kind: 'direct' });
    expect(route({ isFriend: true })).toEqual({ kind: 'direct' });
  });

  it('not a friend, and everything linking the two carries the same event: record inside that event', () => {
    expect(route({ expenses: [owedBy('a', V, P, 'e1'), owedBy('b', P, V, 'e1')], settlements: [paid('s', V, P, 'e1')] })).toEqual({
      kind: 'event',
      eventId: 'e1',
    });
  });

  it('a single expense in one event is enough', () => {
    expect(route({ expenses: [owedBy('a', P, V, 'e1')] })).toEqual({ kind: 'event', eventId: 'e1' });
  });

  it('not a friend and the debt spans several events: settle from the events (sorted, unique)', () => {
    expect(route({ expenses: [owedBy('a', V, P, 'e2'), owedBy('b', V, P, 'e1'), owedBy('c', P, V, 'e2')] })).toEqual({
      kind: 'from-events',
      eventIds: ['e1', 'e2'],
    });
  });

  it('a settlement in another event counts as linking the two', () => {
    expect(route({ expenses: [owedBy('a', V, P, 'e1')], settlements: [paid('s', P, V, 'e2')] })).toEqual({
      kind: 'from-events',
      eventIds: ['e1', 'e2'],
    });
  });

  it('one row with no event among event rows is not "the same event": settle from the events that exist', () => {
    expect(route({ expenses: [owedBy('a', V, P, 'e1'), owedBy('b', V, P, null)] })).toEqual({ kind: 'from-events', eventIds: ['e1'] });
    expect(route({ expenses: [owedBy('a', V, P, 'e1')], settlements: [paid('s', V, P, undefined)] })).toEqual({ kind: 'from-events', eventIds: ['e1'] });
  });

  it('not a friend and no event anywhere: no route into an event at all', () => {
    expect(route({ expenses: [owedBy('a', V, P, null)] })).toEqual({ kind: 'from-events', eventIds: [] });
    expect(route({})).toEqual({ kind: 'from-events', eventIds: [] });
  });

  it('ignores what does not link the two: an expense with no split between them, a legacy settled one, a payment between others', () => {
    const bystander = { id: 'x', paidBy: 'q', splits: [{ userId: 'q', amount: 5 }, { userId: P, amount: 5 }], eventId: 'other' };
    const legacy = { ...owedBy('l', V, P, 'legacy'), settledAt: '2026-01-01T00:00:00.000Z' };
    expect(route({ expenses: [owedBy('a', V, P, 'e1'), bystander, legacy], settlements: [paid('s', 'q', P, 'other')] })).toEqual({
      kind: 'event',
      eventId: 'e1',
    });
  });

  it('the payer\'s own share is not a link: an expense where only V and a third person split does not name P', () => {
    const own = { id: 'o', paidBy: V, splits: [{ userId: V, amount: 10 }, { userId: 'q', amount: 10 }], eventId: 'e9' };
    expect(route({ expenses: [own, owedBy('a', V, P, 'e1')] })).toEqual({ kind: 'event', eventId: 'e1' });
  });

  it('every route is exactly one of direct, event or from-events (no branch is left without a next step)', () => {
    const cases = [
      route({ isFriend: true }),
      route({ expenses: [owedBy('a', V, P, 'e1')] }),
      route({ expenses: [owedBy('a', V, P, 'e1'), owedBy('b', V, P, 'e2')] }),
      route({}),
    ];
    for (const c of cases) expect(['direct', 'event', 'from-events']).toContain(c.kind);
  });
});
