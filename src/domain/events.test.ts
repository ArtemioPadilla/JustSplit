import { describe, expect, it } from 'vitest';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import {
  buildCreateEventInput,
  buildEventPatch,
  eventBalances,
  eventCandidateIds,
  eventStartDate,
  eventStats,
  eventYears,
  expensesByEvent,
  filterEventsByYear,
  settlementProgressPercent,
  settlementsByEvent,
  sortEvents,
  validateEventDates,
} from './events';

/**
 * Pure events selectors and payload builders (plan B11b). No legacy suite
 * covered these (the legacy list/detail pages computed all of it inline in
 * `useMemo`/`useEffect`); the ported `EventDetail.test.tsx` and
 * `EventList` tests exercise the components on top of them.
 *
 * ADR 0013: every member of an event sees every expense of it, so totals,
 * balances and progress are computed over ALL the event's expenses and are the
 * same for every viewer — nothing here takes a viewer id.
 */

const identity = (amount: number, _currency: string): number => amount;

function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    memberIds: ['u1'],
    kind: 'event',
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
    id: 's1',
    groupId: null,
    currency: 'USD',
    date: '2026-06-05',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: '2026-06-05T00:00:00.000Z',
    eventId: 'e1',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy'>): Expense {
  return {
    groupId: null,
    description: 'Dinner',
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    date: '2026-06-02',
    memberIds: ['u1', 'u2'],
    createdBy: overrides.paidBy,
    createdAt: '2026-06-02T00:00:00.000Z',
    settledAt: null,
    eventId: 'e1',
    ...overrides,
  };
}

describe('eventStartDate', () => {
  it('prefers startDate, falls back to date, and treats null (a DB column) like absent', () => {
    expect(eventStartDate(makeEvent({ id: 'e', name: 'n', startDate: '2026-06-01', date: '2026-05-01' }))).toBe('2026-06-01');
    expect(eventStartDate(makeEvent({ id: 'e', name: 'n', date: '2026-05-01' }))).toBe('2026-05-01');
    expect(eventStartDate({ startDate: null, date: null } as unknown as Event)).toBeUndefined();
  });
});

describe('years and the date filter', () => {
  const events = [
    makeEvent({ id: 'a', name: 'A', startDate: '2026-03-01' }),
    makeEvent({ id: 'b', name: 'B', startDate: '2025-12-31' }),
    makeEvent({ id: 'c', name: 'C', date: '2026-07-04' }),
    makeEvent({ id: 'd', name: 'D' }),
  ];

  it('lists each distinct start year once, newest first, ignoring undated events', () => {
    expect(eventYears(events)).toEqual([2026, 2025]);
  });

  it('reads the year of a calendar date locally (Dec 31 stays 2025, Jan 1 is not shifted back a year)', () => {
    expect(eventYears([makeEvent({ id: 'x', name: 'X', startDate: '2026-01-01' })])).toEqual([2026]);
  });

  it('filters to one year; "all" keeps everything, including undated events', () => {
    expect(filterEventsByYear(events, 2026).map((e) => e.id)).toEqual(['a', 'c']);
    expect(filterEventsByYear(events, 2025).map((e) => e.id)).toEqual(['b']);
    expect(filterEventsByYear(events, 'all').map((e) => e.id)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('sortEvents', () => {
  const events = [
    makeEvent({ id: 'a', name: 'beach', startDate: '2026-03-01' }),
    makeEvent({ id: 'b', name: 'Álamo', startDate: '2026-05-01' }),
    makeEvent({ id: 'c', name: 'camp' }),
    makeEvent({ id: 'd', name: 'dinner', startDate: '2025-01-15' }),
  ];
  const totals = { a: 10, b: 300, c: 0, d: 50 };

  it('sorts by date, newest first by default; an undated event is always last, in either order', () => {
    expect(sortEvents(events, { field: 'date', order: 'desc' }, totals).map((e) => e.id)).toEqual(['b', 'a', 'd', 'c']);
    expect(sortEvents(events, { field: 'date', order: 'asc' }, totals).map((e) => e.id)).toEqual(['d', 'a', 'b', 'c']);
  });

  it('sorts by name, ignoring case and accents', () => {
    expect(sortEvents(events, { field: 'name', order: 'asc' }, totals).map((e) => e.name)).toEqual(['Álamo', 'beach', 'camp', 'dinner']);
    expect(sortEvents(events, { field: 'name', order: 'desc' }, totals).map((e) => e.name)).toEqual(['dinner', 'camp', 'beach', 'Álamo']);
  });

  it('sorts by the given per-event total (a missing total counts as 0)', () => {
    expect(sortEvents(events, { field: 'total', order: 'desc' }, totals).map((e) => e.id)).toEqual(['b', 'd', 'a', 'c']);
    expect(sortEvents(events, { field: 'total', order: 'asc' }, { a: 5 }).map((e) => e.id)).toEqual(['b', 'c', 'd', 'a']);
  });

  it('breaks ties by name so a re-sort never shuffles equal rows, and does not mutate its input', () => {
    const tied = [makeEvent({ id: 'x', name: 'zeta', startDate: '2026-01-01' }), makeEvent({ id: 'y', name: 'alpha', startDate: '2026-01-01' })];
    const copy = [...tied];
    expect(sortEvents(tied, { field: 'date', order: 'desc' }, {}).map((e) => e.name)).toEqual(['alpha', 'zeta']);
    expect(tied).toEqual(copy);
  });
});

describe('expensesByEvent', () => {
  it('groups expenses by eventId and drops the ones with none (null, undefined)', () => {
    const grouped = expensesByEvent([
      makeExpense({ id: '1', amount: 1, paidBy: 'u1', eventId: 'e1' }),
      makeExpense({ id: '2', amount: 1, paidBy: 'u1', eventId: 'e2' }),
      makeExpense({ id: '3', amount: 1, paidBy: 'u1', eventId: 'e1' }),
      makeExpense({ id: '4', amount: 1, paidBy: 'u1', eventId: null }),
      makeExpense({ id: '5', amount: 1, paidBy: 'u1', eventId: undefined }),
    ]);
    expect(grouped.get('e1')?.map((e) => e.id)).toEqual(['1', '3']);
    expect(grouped.get('e2')?.map((e) => e.id)).toEqual(['2']);
    expect(grouped.size).toBe(2);
  });
});

describe('settlementsByEvent', () => {
  it('groups settlements by eventId and drops the ones with none (null, undefined) — the event scope counts only its own', () => {
    const grouped = settlementsByEvent([
      makeSettlement({ id: '1', fromUserId: 'u2', toUserId: 'u1', amount: 1, eventId: 'e1' }),
      makeSettlement({ id: '2', fromUserId: 'u2', toUserId: 'u1', amount: 1, eventId: 'e2' }),
      makeSettlement({ id: '3', fromUserId: 'u2', toUserId: 'u1', amount: 1, eventId: 'e1' }),
      makeSettlement({ id: '4', fromUserId: 'u2', toUserId: 'u1', amount: 1, eventId: null }),
      makeSettlement({ id: '5', fromUserId: 'u2', toUserId: 'u1', amount: 1, eventId: undefined }),
    ]);
    expect(grouped.get('e1')?.map((x) => x.id)).toEqual(['1', '3']);
    expect(grouped.get('e2')?.map((x) => x.id)).toEqual(['2']);
    expect(grouped.size).toBe(2);
  });
});

describe('eventStats (over ALL the event\'s expenses and settlements, ADR 0013 + 0014 — no viewer argument)', () => {
  // u1 paid 100 split 50/50 with u2 (u2 owes 50); u2 paid a legacy-settled 50 split 25/25 (u1's 25 was settled);
  // u2 paid 25 for u2 alone.
  const expenses = [
    makeExpense({ id: '1', amount: 100, paidBy: 'u1', splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }] }),
    makeExpense({ id: '2', amount: 50, paidBy: 'u2', settledAt: '2026-06-03T00:00:00.000Z', splits: [{ userId: 'u1', amount: 25 }, { userId: 'u2', amount: 25 }] }),
    makeExpense({ id: '3', amount: 25, paidBy: 'u2', splits: [{ userId: 'u2', amount: 25 }] }),
  ];

  it('counts, totals (legacy settled included) and reports what is still owed, what has been settled and the share', () => {
    expect(eventStats(expenses, [], identity)).toEqual({
      count: 3,
      total: 175,
      outstanding: 50,
      settled: 25,
      settledPercentage: 33.33,
      settledUp: false,
    });
  });

  it('a payment lowers what is still owed and raises the settled share by exactly its amount', () => {
    const stats = eventStats(expenses, [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 20 })], identity);
    expect(stats).toMatchObject({ outstanding: 30, settled: 45, settledPercentage: 60, settledUp: false });
  });

  it('is settled up (100) once every debt is paid', () => {
    const stats = eventStats(expenses, [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 50 })], identity);
    expect(stats).toMatchObject({ outstanding: 0, settled: 75, settledPercentage: 100, settledUp: true });
  });

  it('converts every amount and settlement into the display currency before summing, and rounds to cents', () => {
    const mixed = [
      makeExpense({ id: '1', amount: 10, paidBy: 'u1', currency: 'EUR', splits: [{ userId: 'u1', amount: 5 }, { userId: 'u2', amount: 5 }] }),
      makeExpense({ id: '2', amount: 10, paidBy: 'u1', currency: 'USD', splits: [{ userId: 'u1', amount: 5 }, { userId: 'u2', amount: 5 }] }),
    ];
    const stats = eventStats(mixed, [], (amount, currency) => (currency === 'EUR' ? amount * 1.111 : amount));
    expect(stats.total).toBe(21.11);
    expect(Number.isInteger(Math.round(stats.outstanding * 100))).toBe(true);
    expect(stats.outstanding * 100).toBeCloseTo(Math.round(stats.outstanding * 100), 6); // whole cents, no float dust
  });

  it('reads "nothing to settle" (null percentage) for an event with nothing owed and nothing settled', () => {
    expect(eventStats([], [], identity)).toEqual({ count: 0, total: 0, outstanding: 0, settled: 0, settledPercentage: null, settledUp: true });
    const solo = [makeExpense({ id: '1', amount: 10, paidBy: 'u1', splits: [{ userId: 'u1', amount: 10 }] })];
    expect(eventStats(solo, [], identity)).toMatchObject({ outstanding: 0, settled: 0, settledPercentage: null });
  });

  it('a legacy settled expense alone reads as fully settled', () => {
    const legacy = [makeExpense({ id: '1', amount: 100, paidBy: 'u1', settledAt: '2026-06-03T00:00:00.000Z', splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }] })];
    expect(eventStats(legacy, [], identity)).toMatchObject({ outstanding: 0, settled: 50, settledPercentage: 100, settledUp: true });
  });
});

describe('settlementProgressPercent (what the bar shows)', () => {
  it('is null for "nothing to settle", 100 only when settled up, and never rounds an open balance up to 100', () => {
    expect(settlementProgressPercent({ settledPercentage: null, settledUp: true })).toBeNull();
    expect(settlementProgressPercent({ settledPercentage: 100, settledUp: true })).toBe(100);
    expect(settlementProgressPercent({ settledPercentage: 99.6, settledUp: false })).toBe(99);
    expect(settlementProgressPercent({ settledPercentage: 66.67, settledUp: false })).toBe(67);
    expect(settlementProgressPercent({ settledPercentage: 0, settledUp: false })).toBe(0);
  });
});

describe('eventBalances (the ledger: over splits[], net of the event\'s settlements)', () => {
  it('credits the payer the whole amount and debits each participant their own split', () => {
    const balances = eventBalances(
      [
        makeExpense({
          id: '1',
          amount: 100,
          paidBy: 'u1',
          splitType: 'exact',
          splits: [
            { userId: 'u1', amount: 20 },
            { userId: 'u2', amount: 80 },
          ],
        }),
      ],
      [],
      identity,
    );
    expect(balances).toEqual({ u1: 80, u2: -80 });
  });

  it('counts a payer who is not in the split (they paid for the others)', () => {
    const balances = eventBalances([makeExpense({ id: '1', amount: 30, paidBy: 'u3', splits: [{ userId: 'u1', amount: 15 }, { userId: 'u2', amount: 15 }] })], [], identity);
    expect(balances).toEqual({ u3: 30, u1: -15, u2: -15 });
  });

  it('skips legacy settled expenses and nets several expenses together', () => {
    const balances = eventBalances(
      [
        makeExpense({ id: '1', amount: 40, paidBy: 'u1', splits: [{ userId: 'u1', amount: 20 }, { userId: 'u2', amount: 20 }] }),
        makeExpense({ id: '2', amount: 20, paidBy: 'u2', splits: [{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: 10 }] }),
        makeExpense({ id: '3', amount: 999, paidBy: 'u2', settledAt: '2026-06-03T00:00:00.000Z', splits: [{ userId: 'u1', amount: 999 }] }),
      ],
      [],
      identity,
    );
    expect(balances).toEqual({ u1: 10, u2: -10 });
  });

  it('converts each expense from its own currency, and rounds away float dust', () => {
    const balances = eventBalances(
      [makeExpense({ id: '1', amount: 10, paidBy: 'u1', currency: 'EUR', splits: [{ userId: 'u1', amount: 3.3333 }, { userId: 'u2', amount: 6.6667 }] })],
      [],
      (amount) => amount * 1.1,
    );
    expect(balances).toEqual({ u1: 7.33, u2: -7.33 });
  });

  it('is empty when nothing is owed and nothing was paid', () => {
    expect(eventBalances([makeExpense({ id: '1', amount: 5, paidBy: 'u1', settledAt: '2026-06-03T00:00:00.000Z' })], [], identity)).toEqual({});
  });

  it('three-person expense, one pair settles: the third person\'s debt is intact', () => {
    const dinner = makeExpense({ id: '1', amount: 90, paidBy: 'u1', splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }, { userId: 'u3', amount: 30 }] });
    const balances = eventBalances([dinner], [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 30 })], identity);
    expect(balances).toEqual({ u1: 30, u2: 0, u3: -30 });
  });

  it('a partial payment, and a payment in another currency, move balances by the converted amount', () => {
    const dinner = makeExpense({ id: '1', amount: 90, paidBy: 'u1', splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }, { userId: 'u3', amount: 30 }] });
    const eurToUsd = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);
    const balances = eventBalances([dinner], [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 10, currency: 'EUR' })], eurToUsd);
    expect(balances).toEqual({ u1: 40, u2: -10, u3: -30 });
  });
});

describe('eventCandidateIds (registered users only; the creator is always included)', () => {
  it('lists the caller first, then the pool, once each', () => {
    expect(eventCandidateIds({ uid: 'me', poolIds: ['f1', 'f2', 'me', 'f1'] })).toEqual(['me', 'f1', 'f2']);
  });

  it('is just the caller when the pool is empty (no friends yet, or a group of one)', () => {
    expect(eventCandidateIds({ uid: 'me', poolIds: [] })).toEqual(['me']);
  });

  it('on edit keeps every CURRENT member visible, friend or not, so they can be seen and removed', () => {
    expect(eventCandidateIds({ uid: 'me', poolIds: ['f1'], existingMemberIds: ['me', 'stranger', 'f1'] })).toEqual(['me', 'stranger', 'f1']);
  });

  it('does not offer anyone outside the pool as an addition (no free-text, no non-friends)', () => {
    const ids = eventCandidateIds({ uid: 'me', poolIds: ['f1'], existingMemberIds: ['me'] });
    expect(ids).not.toContain('stranger');
  });
});

describe('validateEventDates', () => {
  it('requires a start date', () => {
    expect(validateEventDates('', '')).toBe('Choose a start date.');
  });

  it('accepts a start alone, an equal end, or a later end', () => {
    expect(validateEventDates('2026-06-01', '')).toBeNull();
    expect(validateEventDates('2026-06-01', '2026-06-01')).toBeNull();
    expect(validateEventDates('2026-06-01', '2026-06-10')).toBeNull();
  });

  it('rejects an end before the start', () => {
    expect(validateEventDates('2026-06-10', '2026-06-01')).toBe('The end date can’t be before the start date.');
  });

  it('rejects a value that is not a calendar date', () => {
    expect(validateEventDates('June first', '')).toBe('Choose a start date.');
    expect(validateEventDates('2026-06-01', 'soon')).toBe('Enter the end date as a real date, or leave it empty.');
  });
});

describe('buildCreateEventInput (RLS: created_by = uid, creator in member_ids, kind text)', () => {
  const base = {
    name: '  Cancún  ',
    description: '  Beach week ',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    preferredCurrency: 'MXN',
    uid: 'me',
    memberIds: ['f1', 'f2'],
  };

  it('trims text, writes date and startDate together, kind "event", createdBy = uid, and puts the creator first in memberIds', () => {
    expect(buildCreateEventInput(base)).toEqual({
      name: 'Cancún',
      description: 'Beach week',
      date: '2026-06-01',
      startDate: '2026-06-01',
      endDate: '2026-06-08',
      preferredCurrency: 'MXN',
      kind: 'event',
      groupId: null,
      memberIds: ['me', 'f1', 'f2'],
      createdBy: 'me',
    });
  });

  it('adds the creator even when the picker did not include them, and never twice', () => {
    expect(buildCreateEventInput({ ...base, memberIds: [] }).memberIds).toEqual(['me']);
    expect(buildCreateEventInput({ ...base, memberIds: ['me', 'f1', 'f1'] }).memberIds).toEqual(['me', 'f1']);
  });

  it('omits an empty description and end date instead of writing empty strings', () => {
    const input = buildCreateEventInput({ ...base, description: '   ', endDate: '' });
    expect(input).not.toHaveProperty('description');
    expect(input).not.toHaveProperty('endDate');
  });

  it('carries the group from ?group= (the RLS insert check needs every member in it) and null otherwise', () => {
    expect(buildCreateEventInput({ ...base, groupId: 'g1' }).groupId).toBe('g1');
    expect(buildCreateEventInput(base).groupId).toBeNull();
  });
});

describe('buildEventPatch(event, values, editorId) (only what changed; null clears a column)', () => {
  const event = makeEvent({
    id: 'e1',
    name: 'Cancún',
    description: 'Beach week',
    date: '2026-06-01',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    preferredCurrency: 'MXN',
    memberIds: ['me', 'f1'],
    createdBy: 'me',
  });
  const same = {
    name: 'Cancún',
    description: 'Beach week',
    startDate: '2026-06-01',
    endDate: '2026-06-08',
    preferredCurrency: 'MXN',
    memberIds: ['me', 'f1'],
  };

  it('is empty when nothing changed (the form then just navigates back)', () => {
    expect(buildEventPatch(event, same, 'me')).toEqual({});
  });

  it('carries only the changed fields, trimmed', () => {
    expect(buildEventPatch(event, { ...same, name: '  Cancún 2026 ' }, 'me')).toEqual({ name: 'Cancún 2026' });
    expect(buildEventPatch(event, { ...same, preferredCurrency: 'USD' }, 'me')).toEqual({ preferredCurrency: 'USD' });
  });

  it('keeps date in step with startDate when the start moves', () => {
    expect(buildEventPatch(event, { ...same, startDate: '2026-06-02' }, 'me')).toEqual({ startDate: '2026-06-02', date: '2026-06-02' });
  });

  it('clears the description and the end date with null, not undefined', () => {
    expect(buildEventPatch(event, { ...same, description: '  ', endDate: '' }, 'me')).toEqual({ description: null, endDate: null });
  });

  it('treats a description or end date the row never had as unchanged when still empty', () => {
    const bare = makeEvent({ id: 'e2', name: 'Bare', startDate: '2026-06-01', memberIds: ['me'], createdBy: 'me' });
    expect(buildEventPatch(bare, { name: 'Bare', description: '', startDate: '2026-06-01', endDate: '', preferredCurrency: 'USD', memberIds: ['me'] }, 'me')).toEqual({ preferredCurrency: 'USD' });
  });

  it('writes memberIds when someone was added or removed, keeping the existing order and appending additions', () => {
    expect(buildEventPatch(event, { ...same, memberIds: ['f1', 'me', 'f2'] }, 'me')).toEqual({ memberIds: ['me', 'f1', 'f2'] });
    expect(buildEventPatch(event, { ...same, memberIds: ['me'] }, 'me')).toEqual({ memberIds: ['me'] });
  });

  it('does not write memberIds for a mere reordering', () => {
    expect(buildEventPatch(event, { ...same, memberIds: ['f1', 'me'] }, 'me')).toEqual({});
  });

  it('never drops the editor: RLS requires the actor to still be a member after the update, so an unticked editor is kept', () => {
    expect(buildEventPatch(event, { ...same, memberIds: ['f1'] }, 'me')).toEqual({});
  });
});
