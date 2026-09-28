// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * `EventsListIsland` (plan B11b) — `/events/list`. `AuthIsland`/`AuthGate` are
 * pass-throughs (their own suites cover them); every data hook is mocked so this
 * proves THIS island's logic.
 *
 * Ported from the EventList part of the legacy `src/app/__tests__/page.test.tsx`
 * (a `describe.skip` on `main` — it asserted a `state.expenses`-embedded fixture
 * the real component never read):
 *   KEPT    — "displays event information correctly": every event's name, one
 *             "View details" affordance per event linking to it, and its
 *             participant count.
 *   CHANGED — no `renderWithAppContext`/`AppProvider`; events come from
 *             `useEvents`, expenses from `useExpenses` grouped by `eventId`, and
 *             "Participants: 0" (an artefact of the fixture's `members: []`, which
 *             a real event can never have — `memberIds` has at least the creator)
 *             is "N participants".
 *   NEW     — sort by date/name/total with an order toggle and a year filter, all
 *             keyboard operable; totals converted into the display currency and
 *             computed over every expense of the event (ADR 0013); loading /
 *             empty / error+retry states; participants disclosure; links.
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useEvents, useExpenses, useProfiles, useDisplayConversion } = vi.hoisted(() => ({
  useEvents: vi.fn(),
  useExpenses: vi.fn(),
  useProfiles: vi.fn(),
  useDisplayConversion: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useEvents', () => ({ useEvents }));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/currency/useDisplayConversion', () => ({ useDisplayConversion }));

const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { EventTimeline } = vi.hoisted(() => ({
  EventTimeline: vi.fn(() => <div data-testid="event-timeline" />),
}));
vi.mock('@/components/features/events/EventTimeline', () => ({ EventTimeline }));

const { default: EventsListIsland } = await import('./EventsListIsland');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NOW = '2026-09-28T00:00:00.000Z';

const localDate = (calendarDate: string) => {
  const [y, m, d] = calendarDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString();
};

function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return { memberIds: ['u1'], kind: 'event', createdBy: 'u1', createdAt: NOW, ...overrides };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy' | 'eventId'>): Expense {
  return {
    groupId: null,
    description: 'Dinner',
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    date: '2023-06-16',
    memberIds: [overrides.paidBy],
    createdBy: overrides.paidBy,
    createdAt: NOW,
    settledAt: null,
    ...overrides,
  };
}

const EVENTS: Event[] = [
  makeEvent({ id: 'ev1', name: 'Team Trip', description: 'Offsite', startDate: '2023-06-15', endDate: '2023-06-20', memberIds: ['u1', 'u2'] }),
  makeEvent({ id: 'ev2', name: 'Conference', startDate: '2023-07-10', endDate: '2023-07-15', memberIds: ['u1'] }),
  makeEvent({ id: 'ev3', name: 'Reunion', startDate: '2025-03-01', memberIds: ['u1', 'u2', 'u3'] }),
];

const EXPENSES: Expense[] = [
  // Team Trip: 100 USD (unsettled) + 50 EUR (settled, x2 = 100 USD) + 40 USD that does not name u1 => total 240, unsettled 140.
  makeExpense({ id: 'x1', eventId: 'ev1', amount: 100, paidBy: 'u1', memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }] }),
  makeExpense({ id: 'x2', eventId: 'ev1', amount: 50, currency: 'EUR', paidBy: 'u2', memberIds: ['u1', 'u2'], settledAt: '2023-06-18T00:00:00.000Z' }),
  makeExpense({ id: 'x3', eventId: 'ev1', amount: 40, paidBy: 'u2', memberIds: ['u2', 'u3'] }),
  // Conference: 150 EUR (x2 = 300 USD), unsettled.
  makeExpense({ id: 'x4', eventId: 'ev2', amount: 150, currency: 'EUR', paidBy: 'u1' }),
  // An expense with no event is never counted anywhere.
  makeExpense({ id: 'x5', eventId: null, amount: 9999, paidBy: 'u1' }),
];

const PROFILES = [
  { id: 'u1', name: 'Ana', avatarUrl: null },
  { id: 'u2', name: 'Beto', avatarUrl: null },
  { id: 'u3', name: 'Caro', avatarUrl: null },
];

const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);

function live<T>(data: T[] | undefined, overrides: Record<string, unknown> = {}) {
  return { data, isError: false, isRetrying: false, refetch: vi.fn(), ...overrides };
}

function titles(): string[] {
  return screen.getAllByRole('article').map((article) => within(article).getByRole('heading', { level: 2 }).textContent ?? '');
}

beforeEach(() => {
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);
  $preferredCurrency.set('USD');

  useEvents.mockReturnValue(live(EVENTS));
  useExpenses.mockReturnValue(live(EXPENSES));
  useProfiles.mockReturnValue({ data: PROFILES, isError: false, isFetching: false, refetch: vi.fn() });
  useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: false, refresh: vi.fn() });
});

afterEach(() => {
  vi.clearAllMocks();
  $user.set(null);
  $authReady.set(false);
});

describe('EventsListIsland — chrome and states', () => {
  it('has an h1 and a "New event" link to /events/new in every content state', () => {
    for (const state of [live(undefined), live([]), live(undefined, { isError: true }), live(EVENTS)]) {
      useEvents.mockReturnValue(state);
      const { unmount } = render(<EventsListIsland />);
      expect(screen.getByRole('heading', { level: 1, name: 'Events' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /new event/i })).toHaveAttribute('href', '/events/new');
      unmount();
    }
  });

  it('shows a busy skeleton while events or expenses load, never an empty state', () => {
    useEvents.mockReturnValue(live(undefined));
    const { container, unmount } = render(<EventsListIsland />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(/no events yet/i)).not.toBeInTheDocument();
    unmount();

    useEvents.mockReturnValue(live(EVENTS));
    useExpenses.mockReturnValue(live(undefined));
    const again = render(<EventsListIsland />);
    expect(again.container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows an empty state whose primary action creates the first event', () => {
    useEvents.mockReturnValue(live([]));
    render(<EventsListIsland />);
    expect(screen.getByText(/no events yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create your first event/i })).toHaveAttribute('href', '/events/new');
  });

  it.each([
    ['events', () => useEvents.mockReturnValue(live(undefined, { isError: true }))],
    ['expenses', () => useExpenses.mockReturnValue(live(undefined, { isError: true }))],
    ['profiles', () => useProfiles.mockReturnValue({ data: undefined, isError: true, isFetching: false, refetch: vi.fn() })],
  ])('shows an error state with a retry when %s fail to load (a failed query is not an empty list)', async (_name, fail) => {
    fail();
    render(<EventsListIsland />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    expect(screen.queryByText(/no events yet/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeEnabled();
  });

  it('Retry refetches every query and is disabled (and busy) while a retry is in flight', async () => {
    const eventsRefetch = vi.fn();
    const expensesRefetch = vi.fn();
    const profilesRefetch = vi.fn();
    useEvents.mockReturnValue(live(undefined, { isError: true, refetch: eventsRefetch }));
    useExpenses.mockReturnValue(live(EXPENSES, { refetch: expensesRefetch }));
    useProfiles.mockReturnValue({ data: PROFILES, isError: false, isFetching: false, refetch: profilesRefetch });
    const { unmount } = render(<EventsListIsland />);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(eventsRefetch).toHaveBeenCalledTimes(1);
    expect(expensesRefetch).toHaveBeenCalledTimes(1);
    expect(profilesRefetch).toHaveBeenCalledTimes(1);
    unmount();

    useEvents.mockReturnValue(live(undefined, { isError: true, isRetrying: true }));
    render(<EventsListIsland />);
    const retry = screen.getByRole('button', { name: /retry/i });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('aria-busy', 'true');
  });
});

describe('EventsListIsland — ported from page.test.tsx (EventList)', () => {
  it('displays event information correctly: every name, a details link to each, and its participant count', () => {
    render(<EventsListIsland />);
    expect(titles()).toEqual(expect.arrayContaining(['Team Trip', 'Conference', 'Reunion']));

    const detailLinks = screen.getAllByRole('link', { name: /view details/i });
    expect(detailLinks).toHaveLength(3);
    const team = screen.getByRole('article', { name: /team trip/i });
    expect(within(team).getByRole('link', { name: /view details/i })).toHaveAttribute('href', '/events/ev1');
    expect(within(team).getByRole('link', { name: 'Team Trip' })).toHaveAttribute('href', '/events/ev1');

    expect(within(team).getByText('2 participants')).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: /conference/i })).getByText('1 participant')).toBeInTheDocument();
  });
});

describe('EventsListIsland — per-event figures (ADR 0013: every expense of the event, same for every viewer)', () => {
  it('shows the total in the display currency with its code, summed over all of the event\'s expenses, and the unsettled amount', () => {
    render(<EventsListIsland />);
    const team = screen.getByRole('article', { name: /team trip/i });
    // 100 + 50 EUR x2 + 40 (which does not name the viewer) = 240; unsettled = 100 + 40 = 140.
    expect(within(team).getByText('USD 240.00')).toBeInTheDocument();
    expect(within(team).getByText('USD 140.00')).toBeInTheDocument();
    const conference = screen.getByRole('article', { name: /conference/i });
    expect(within(conference).getAllByText('USD 300.00')).toHaveLength(2);
  });

  it('never counts an expense that belongs to no event, nor another event\'s', () => {
    render(<EventsListIsland />);
    expect(screen.queryByText(/9999/)).not.toBeInTheDocument();
    const reunion = screen.getByRole('article', { name: /reunion/i });
    expect(within(reunion).getAllByText('USD 0.00').length).toBeGreaterThan(0);
  });

  it('shows the settled share as a labelled progress bar with text', () => {
    render(<EventsListIsland />);
    const team = screen.getByRole('article', { name: /team trip/i });
    expect(within(team).getByRole('progressbar', { name: /settlement progress/i })).toHaveAttribute('aria-valuenow', '33');
    expect(within(team).getByText(/33% settled/i)).toBeInTheDocument();
  });

  it('gives each event\'s timeline exactly that event\'s expenses, in the display currency', () => {
    render(<EventsListIsland />);
    const calls = (EventTimeline.mock.calls as unknown as Array<[{ expenses: Array<{ id: string }>; currency: string }]>).map(([props]) => props);
    const idsPerCall = calls.map((props) => props.expenses.map((e) => e.id).sort().join(','));
    expect(idsPerCall).toEqual(expect.arrayContaining(['x1,x2,x3', 'x4', '']));
    expect(new Set(calls.map((props) => props.currency))).toEqual(new Set(['USD']));
  });

  it('shows the date range in the visitor\'s locale, a single date without an end, and "No dates set" for an undated event', () => {
    useEvents.mockReturnValue(live([...EVENTS, makeEvent({ id: 'ev9', name: 'Someday' })]));
    render(<EventsListIsland />);
    expect(within(screen.getByRole('article', { name: /team trip/i })).getByText(`${localDate('2023-06-15')} – ${localDate('2023-06-20')}`)).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: /reunion/i })).getByText(localDate('2025-03-01'))).toBeInTheDocument();
    expect(within(screen.getByRole('article', { name: /someday/i })).getByText(/no dates set/i)).toBeInTheDocument();
  });

  it('shows the description when there is one', () => {
    render(<EventsListIsland />);
    expect(within(screen.getByRole('article', { name: /team trip/i })).getByText('Offsite')).toBeInTheDocument();
  });

  it('shows skeletons instead of unconverted numbers until the rates are ready', () => {
    useDisplayConversion.mockReturnValue({ convert, ready: false, approximate: false, refresh: vi.fn() });
    render(<EventsListIsland />);
    expect(screen.queryByText('USD 240.00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-timeline')).not.toBeInTheDocument();
    // The structure is already there (no jump when the numbers arrive).
    expect(screen.getAllByRole('article')).toHaveLength(3);
  });

  it('flags approximate rates', () => {
    useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: true, refresh: vi.fn() });
    render(<EventsListIsland />);
    expect(screen.getByText(/approximate rates/i)).toBeInTheDocument();
  });

  it('seeds the display currency from the visitor\'s preferred one', () => {
    $preferredCurrency.set('MXN');
    render(<EventsListIsland />);
    expect(screen.getByLabelText(/display currency/i)).toHaveValue('MXN');
    expect(useDisplayConversion).toHaveBeenLastCalledWith(expect.arrayContaining(['USD', 'EUR']), 'MXN');
  });
});

describe('EventsListIsland — sorting and filtering (keyboard operable, native controls)', () => {
  it('sorts by date, newest first, by default', () => {
    render(<EventsListIsland />);
    expect(titles()).toEqual(['Reunion', 'Conference', 'Team Trip']);
    expect(screen.getByLabelText(/sort by/i)).toHaveValue('date');
  });

  it('sorts by name from the select (A to Z first), then reverses with the order button', async () => {
    render(<EventsListIsland />);
    await userEvent.selectOptions(screen.getByLabelText(/sort by/i), 'name');
    expect(titles()).toEqual(['Conference', 'Reunion', 'Team Trip']);

    await userEvent.click(screen.getByRole('button', { name: /sort order/i }));
    expect(titles()).toEqual(['Team Trip', 'Reunion', 'Conference']);
  });

  it('sorts by total, highest first, over the converted totals', async () => {
    render(<EventsListIsland />);
    await userEvent.selectOptions(screen.getByLabelText(/sort by/i), 'total');
    // Conference 300, Team Trip 240, Reunion 0.
    expect(titles()).toEqual(['Conference', 'Team Trip', 'Reunion']);
  });

  it('names the current order and what activating the button does, and flips it', async () => {
    render(<EventsListIsland />);
    const button = screen.getByRole('button', { name: /sort order/i });
    expect(button).toHaveAccessibleName(/newest first.*oldest first/i);
    await userEvent.click(button);
    expect(screen.getByRole('button', { name: /sort order/i })).toHaveAccessibleName(/oldest first.*newest first/i);
    expect(titles()).toEqual(['Team Trip', 'Conference', 'Reunion']);
  });

  it('is operable entirely from the keyboard: the order control is a real button (Enter and Space) and both filters are native selects', async () => {
    const user = userEvent.setup();
    render(<EventsListIsland />);
    const button = screen.getByRole('button', { name: /sort order/i });
    button.focus();
    await user.keyboard('{Enter}');
    expect(titles()).toEqual(['Team Trip', 'Conference', 'Reunion']);
    await user.keyboard(' ');
    expect(titles()).toEqual(['Reunion', 'Conference', 'Team Trip']);

    // A native <select> is keyboard operable by the platform (arrows, type-ahead); a custom widget would need its own tests.
    expect(screen.getByLabelText(/sort by/i).tagName).toBe('SELECT');
    expect(screen.getByLabelText(/^date$/i).tagName).toBe('SELECT');
  });

  it('filters by start year, offering only years that have an event, and says how many match', async () => {
    render(<EventsListIsland />);
    const filter = screen.getByLabelText(/^date$/i);
    expect(within(filter).getAllByRole('option').map((o) => o.textContent)).toEqual(['All dates', '2025', '2023']);
    expect(screen.getByRole('status')).toHaveTextContent('3 events');

    await userEvent.selectOptions(filter, '2023');
    expect(titles()).toEqual(['Conference', 'Team Trip']);
    expect(screen.getByRole('status')).toHaveTextContent('2 events');

    await userEvent.selectOptions(filter, '2025');
    expect(titles()).toEqual(['Reunion']);
    expect(screen.getByRole('status')).toHaveTextContent('1 event');
  });
});

describe('EventsListIsland — participants disclosure', () => {
  it('keeps the participant names hidden until asked, with a named, aria-expanded toggle', async () => {
    render(<EventsListIsland />);
    const team = screen.getByRole('article', { name: /team trip/i });
    const toggle = within(team).getByRole('button', { name: /show participants for team trip/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(team).getByText('Beto')).not.toBeVisible();

    await userEvent.click(toggle);
    expect(within(team).getByRole('button', { name: /hide participants for team trip/i })).toHaveAttribute('aria-expanded', 'true');
    expect(within(team).getByText('Beto')).toBeVisible();
    expect(within(team).getByText('Ana')).toBeVisible();
  });

  it('falls back to "Unknown" for a member whose profile did not resolve', async () => {
    useProfiles.mockReturnValue({ data: [PROFILES[0]], isError: false, isFetching: false, refetch: vi.fn() });
    render(<EventsListIsland />);
    const team = screen.getByRole('article', { name: /team trip/i });
    await userEvent.click(within(team).getByRole('button', { name: /show participants/i }));
    await waitFor(() => expect(within(team).getByText('Unknown')).toBeVisible());
  });
});
