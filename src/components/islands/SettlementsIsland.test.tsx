// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthUser } from '@cyber-eco/types';
import { balancesWithUser, involvingUser } from '@/domain/dashboard';
import type { Event } from '@/schemas/event';
import type { Friendship } from '@/schemas/friendship';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * `SettlementsIsland` (plan B14b) — `/settlements`, reading `?event=` and
 * `?group=` from `location.search`. `AuthIsland`/`AuthGate` are pass-throughs
 * (their own suites cover them, and the test supplies the `QueryClient` that
 * `AuthGate` would mount); the read hooks are mocked, while `useSettleUp` and
 * `useRemoveSettlement` are REAL over a mocked repo, so "calls `settle()` once
 * and nothing else" is proven on the real hook path. The ledger, `settle()` and
 * `remove()` are proven in B14a; this proves THIS island.
 *
 * Ported from the legacy `src/app/settlements/page.tsx` (no tests existed on
 * `main`): KEPT the three tabs, the display-currency selector and the
 * exchange-rates table. CHANGED "Mark as Settled" (which flagged expenses) to
 * "Record payment" (one insert, ADR 0014); the event filter dropdown to the
 * `?event=` scope; "Completed" to "Marked as paid by <name>" (a settlement is
 * an attestation, never a verified payment, ADR 0002). NEW: ?group= note,
 * overpayment notice, Undo, party-only actions.
 *
 * Two scopes, two kinds of suggestion (ADR 0014 §5): the PERSONAL view is
 * pairwise — one row per other person, the dashboard's `balancesWithUser`, so both
 * parties of a debt see the same number; the EVENT scope keeps the debt-simplified
 * `calculateSettlementsWithConversion`, which every event member sees identically.
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({
  default: function AuthGateStub({ children }: { children: React.ReactNode }) {
    const [client] = React.useState(() => new QueryClient({ defaultOptions: { mutations: { retry: false } } }));
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  },
}));

const { useExpenses, useEventExpenses, useSettlements, useEventSettlements, useEvent, useEvents, useFriends, useProfiles, useDisplayConversion } = vi.hoisted(() => ({
  useExpenses: vi.fn(),
  useEventExpenses: vi.fn(),
  useSettlements: vi.fn(),
  useEventSettlements: vi.fn(),
  useEvent: vi.fn(),
  useEvents: vi.fn(),
  useFriends: vi.fn(),
  useProfiles: vi.fn(),
  useDisplayConversion: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses, useEventExpenses }));
vi.mock('@/lib/data/hooks/useSettlements', () => ({ useSettlements, useEventSettlements }));
vi.mock('@/lib/data/hooks/useEvent', () => ({ useEvent }));
vi.mock('@/lib/data/hooks/useEvents', () => ({ useEvents }));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/currency/useDisplayConversion', () => ({ useDisplayConversion }));

const { settle, remove } = vi.hoisted(() => ({ settle: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/data/repos/settlements', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data/repos/settlements')>()),
  settle,
  remove,
}));

// Every export of the expenses repo becomes a spy: settling up must never write an expense.
const expensesRepo = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn(), batch: vi.fn() }));
vi.mock('@/lib/data/repos/expenses', () => expensesRepo);

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

// The real Combobox is slow and has its own suite; a select keeps this about the island.
vi.mock('@/components/features/currency/CurrencySelector', () => ({
  CurrencySelector: ({ value, onChange, label, id }: { value: string; onChange: (code: string) => void; label?: string; id?: string }) => (
    <div>
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {['USD', 'EUR', 'MXN'].map((code) => (
          <option key={code}>{code}</option>
        ))}
      </select>
    </div>
  ),
}));

const { default: SettlementsIsland } = await import('./SettlementsIsland');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NOW = '2026-09-28T00:00:00.000Z';

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy' | 'splits' | 'memberIds'>): Expense {
  return {
    groupId: null,
    description: 'Dinner',
    currency: 'USD',
    splitType: 'equal',
    date: '2026-09-01',
    createdBy: overrides.paidBy,
    createdAt: NOW,
    settledAt: null,
    eventId: null,
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'id' | 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
    groupId: null,
    currency: 'USD',
    date: '2026-09-10',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: NOW,
    eventId: null,
    ...overrides,
  };
}

// Personal scope. Ana (u1) is owed 30 by Beto (u2); Caro (u3) is owed 50 by Dan (u4) in an expense that only names Ana as a member.
// Greedy order is Dan→Caro (the bigger pair) first; the island must put Ana's own suggestion first.
const EXPENSES: Expense[] = [
  makeExpense({ id: 'x1', paidBy: 'u3', amount: 100, memberIds: ['u1', 'u3', 'u4'], splits: [{ userId: 'u3', amount: 50 }, { userId: 'u4', amount: 50 }] }),
  makeExpense({ id: 'x2', paidBy: 'u1', amount: 60, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }] }),
  // Names neither Ana nor anyone Ana shares with: not part of her personal view.
  makeExpense({ id: 'x3', paidBy: 'u8', amount: 999, memberIds: ['u8', 'u9'], splits: [{ userId: 'u8', amount: 499.5 }, { userId: 'u9', amount: 499.5 }] }),
];

const EVENT: Event = { id: 'ev1', name: 'Oaxaca trip', memberIds: ['u1', 'u2', 'u3', 'u4'], kind: 'event', createdBy: 'u1', createdAt: NOW };

// Event scope: the same shape, with the event's own id.
const EVENT_EXPENSES: Expense[] = [
  makeExpense({ id: 'y1', eventId: 'ev1', paidBy: 'u3', amount: 100, memberIds: ['u3', 'u4'], splits: [{ userId: 'u3', amount: 50 }, { userId: 'u4', amount: 50 }] }),
  makeExpense({ id: 'y2', eventId: 'ev1', paidBy: 'u1', amount: 60, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }] }),
];

// The live-run fixture behind the coordinator's must-fix: Ana paid 90 for Ana, Beto and Carla; in the Oaxaca event Carla paid 40 for
// Beto and Carla, and Ana paid 60 for Ana and Beto. Simplified over everything, Beto would have been told "You owe Ana 80" while
// Ana (whose rows do not include the Beto-Carla expense) saw "Beto owes you 60". Pairwise, both read 60.
const LIVE_EXPENSES: Expense[] = [
  makeExpense({ id: 'p1', paidBy: 'u1', amount: 90, memberIds: ['u1', 'u2', 'u3'], splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }, { userId: 'u3', amount: 30 }] }),
  makeExpense({ id: 'e1', eventId: 'ev1', paidBy: 'u3', amount: 40, memberIds: ['u2', 'u3'], splits: [{ userId: 'u2', amount: 20 }, { userId: 'u3', amount: 20 }] }),
  makeExpense({ id: 'e2', eventId: 'ev1', paidBy: 'u1', amount: 60, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }] }),
];

function friendship(a: string, b: string, status: Friendship['status'] = 'accepted'): Friendship {
  return { id: `f-${a}-${b}`, users: [a, b], status, requestedBy: a, createdAt: NOW };
}
// Ana is friends with Beto and with Caro; Beto and Caro are NOT friends (they only share the Oaxaca trip).
const FRIENDS: Friendship[] = [friendship('u1', 'u2'), friendship('u1', 'u3')];

const PROFILES = [
  { id: 'u1', name: 'Ana', avatarUrl: null },
  { id: 'u2', name: 'Beto', avatarUrl: null },
  { id: 'u3', name: 'Caro', avatarUrl: null },
  { id: 'u4', name: 'Dan', avatarUrl: null },
];

const RATES = { EUR: { rate: 2, isFallback: false } };
const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);

function live<T>(data: T[] | undefined, overrides: Record<string, unknown> = {}) {
  return { data, isError: false, isRetrying: false, refetch: vi.fn(), ...overrides };
}

function query<T>(data: T | null | undefined, overrides: Record<string, unknown> = {}) {
  return { data, isError: false, isLoading: data === undefined, refetch: vi.fn(), ...overrides };
}

function setUrl(search: string) {
  window.history.replaceState({}, '', `/settlements${search}`);
}

/** The event scope with its own rows (hooks for the personal scope are disabled by their undefined id). */
function eventScope(expenses: Expense[] = EVENT_EXPENSES, settlements: Settlement[] = []) {
  setUrl('?event=ev1');
  useExpenses.mockReturnValue(live<Expense>(undefined));
  useSettlements.mockReturnValue(live<Settlement>(undefined));
  useEvent.mockReturnValue(query(EVENT));
  useEventExpenses.mockReturnValue(live(expenses));
  useEventSettlements.mockReturnValue(live(settlements));
}

// `hidden: true`: while a modal dialog is open everything behind it is `aria-hidden`, which is what a screen reader should get.
function rows(listName: string): HTMLElement[] {
  return within(screen.getByRole('list', { name: listName, hidden: true })).getAllByRole('listitem', { hidden: true });
}

beforeEach(() => {
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);
  $preferredCurrency.set('USD');
  setUrl('');

  useExpenses.mockReturnValue(live(EXPENSES));
  useEventExpenses.mockReturnValue(live<Expense>(undefined));
  useSettlements.mockReturnValue(live<Settlement>([]));
  useEventSettlements.mockReturnValue(live<Settlement>(undefined));
  useEvent.mockReturnValue(query<Event>(undefined, { isLoading: false }));
  useEvents.mockReturnValue(live([EVENT]));
  useFriends.mockReturnValue(live(FRIENDS));
  useProfiles.mockReturnValue({ data: PROFILES, isError: false, isFetching: false, refetch: vi.fn() });
  useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: false, rates: RATES, refresh: vi.fn() });
  settle.mockResolvedValue({ id: 'new' });
  remove.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  $user.set(null);
  $authReady.set(false);
});

describe('SettlementsIsland — chrome and states', () => {
  it('has an h1 in every content state', () => {
    for (const state of [live<Expense>(undefined), live<Expense>([]), live<Expense>(undefined, { isError: true }), live(EXPENSES)]) {
      useExpenses.mockReturnValue(state);
      const { unmount } = render(<SettlementsIsland />);
      expect(screen.getByRole('heading', { level: 1, name: 'Settlements' })).toBeInTheDocument();
      unmount();
    }
  });

  it('shows a busy skeleton while anything loads — never the "all settled up" state, never a number', () => {
    for (const load of [
      () => useExpenses.mockReturnValue(live<Expense>(undefined)),
      () => useSettlements.mockReturnValue(live<Settlement>(undefined)),
      () => useProfiles.mockReturnValue({ data: undefined, isError: false, isFetching: true, refetch: vi.fn() }),
    ]) {
      load();
      const { container, unmount } = render(<SettlementsIsland />);
      expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
      expect(screen.queryByText(/all settled up/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('tab')).not.toBeInTheDocument();
      unmount();
      useExpenses.mockReturnValue(live(EXPENSES));
      useSettlements.mockReturnValue(live<Settlement>([]));
      useProfiles.mockReturnValue({ data: PROFILES, isError: false, isFetching: false, refetch: vi.fn() });
    }
  });

  it('shows no amount until the exchange rates are ready, only a busy placeholder', async () => {
    useDisplayConversion.mockReturnValue({ convert, ready: false, approximate: false, rates: {}, refresh: vi.fn() });
    const { container } = render(<SettlementsIsland />);
    await screen.findByRole('tab', { name: 'Pending' });
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.body).not.toHaveTextContent(/USD \d/);
    expect(screen.queryByText(/all settled up/i)).not.toBeInTheDocument();
  });

  it.each([
    ['expenses', () => useExpenses.mockReturnValue(live<Expense>(undefined, { isError: true }))],
    ['settlements', () => useSettlements.mockReturnValue(live<Settlement>(undefined, { isError: true }))],
    ['profiles', () => useProfiles.mockReturnValue({ data: undefined, isError: true, isFetching: false, refetch: vi.fn() })],
  ])('shows an error state with Retry when %s fail to load (a failed query is not an empty list)', async (_name, fail) => {
    fail();
    render(<SettlementsIsland />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong loading your settlements/i);
    expect(alert).not.toHaveTextContent(/error:|supabase|violates/i);
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('Retry refetches every query and is disabled and busy while one is retrying', async () => {
    const user = userEvent.setup();
    const refetchExpenses = vi.fn();
    const refetchSettlements = vi.fn();
    const refetchProfiles = vi.fn();
    useExpenses.mockReturnValue(live<Expense>(undefined, { isError: true, refetch: refetchExpenses }));
    useSettlements.mockReturnValue(live<Settlement>(undefined, { refetch: refetchSettlements }));
    useProfiles.mockReturnValue({ data: undefined, isError: false, isFetching: false, refetch: refetchProfiles });
    const { unmount } = render(<SettlementsIsland />);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchExpenses).toHaveBeenCalledTimes(1);
    expect(refetchSettlements).toHaveBeenCalledTimes(1);
    expect(refetchProfiles).toHaveBeenCalledTimes(1);
    unmount();

    useExpenses.mockReturnValue(live<Expense>(undefined, { isError: true, isRetrying: true, refetch: refetchExpenses }));
    render(<SettlementsIsland />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    expect(retry).toBeDisabled();
    expect(retry).toHaveAttribute('aria-busy', 'true');
  });
});

describe('SettlementsIsland — scope', () => {
  it('with no param it is the personal view: only rows that name the viewer', async () => {
    render(<SettlementsIsland />);
    expect(useExpenses).toHaveBeenCalledWith('u1');
    expect(useSettlements).toHaveBeenCalledWith('u1');
    expect(useEventExpenses).toHaveBeenCalledWith(undefined);
    expect(useEventSettlements).toHaveBeenCalledWith(undefined);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')).toHaveLength(1);
    expect(document.body).not.toHaveTextContent(/999|499/);
  });

  it('?event=<id> is the event scope: the event\'s own expenses and settlements, its name and a link back to it', async () => {
    setUrl('?event=ev1');
    useExpenses.mockReturnValue(live<Expense>(undefined));
    useSettlements.mockReturnValue(live<Settlement>(undefined));
    useEvent.mockReturnValue(query(EVENT));
    useEventExpenses.mockReturnValue(live(EVENT_EXPENSES));
    useEventSettlements.mockReturnValue(live<Settlement>([]));
    render(<SettlementsIsland />);
    expect(useEvent).toHaveBeenCalledWith('ev1');
    expect(useEventExpenses).toHaveBeenCalledWith('ev1');
    expect(useEventSettlements).toHaveBeenCalledWith('ev1');
    expect(useExpenses).toHaveBeenCalledWith(undefined);
    expect(useSettlements).toHaveBeenCalledWith(undefined);
    expect(await screen.findByRole('heading', { level: 2, name: 'Oaxaca trip' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to event/i })).toHaveAttribute('href', '/events/ev1');
    expect(rows('Suggested payments')).toHaveLength(2);
  });

  it('an event the viewer cannot see says so and links to the personal view — no dead end, not an error', async () => {
    setUrl('?event=nope');
    useExpenses.mockReturnValue(live<Expense>(undefined));
    useEvent.mockReturnValue(query<Event>(null));
    useEventExpenses.mockReturnValue(live<Expense>([]));
    useEventSettlements.mockReturnValue(live<Settlement>([]));
    render(<SettlementsIsland />);
    expect(await screen.findByText(/we couldn't find this event/i)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /your own settlements/i })).toHaveAttribute('href', '/settlements');
  });

  it('an event that fails to load shows the error state with Retry', async () => {
    setUrl('?event=ev1');
    const refetch = vi.fn();
    useEvent.mockReturnValue(query<Event>(undefined, { isError: true, isLoading: false, refetch }));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('?group= shows a visible, polite "coming soon" note and the personal view stays useful', async () => {
    setUrl('?group=g1');
    render(<SettlementsIsland />);
    const note = screen.getByText(/group settlements are coming soon/i);
    expect(note.closest('[role="status"]')).not.toBeNull();
    expect(useExpenses).toHaveBeenCalledWith('u1');
    expect(await screen.findByRole('list', { name: 'Suggested payments' })).toBeInTheDocument();
  });

  it('shows no group note without ?group=', async () => {
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(screen.queryByText(/group settlements/i)).not.toBeInTheDocument();
  });
});

describe('SettlementsIsland — tabs', () => {
  it('has Pending, Balances and History tabs, Pending first, and each panel is named by its tab', async () => {
    render(<SettlementsIsland />);
    const tabs = await screen.findAllByRole('tab');
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Pending', 'Balances', 'History']);
    expect(screen.getByRole('tab', { name: 'Pending' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Pending' })).toBeInTheDocument();
  });

  it('is keyboard operable: arrows move between tabs, Enter opens one', async () => {
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    const pending = await screen.findByRole('tab', { name: 'Pending' });
    pending.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Balances' })).toHaveFocus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByRole('tab', { name: 'History' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'History' })).toBeInTheDocument();
  });
});

describe('SettlementsIsland — pending tab', () => {
  it('words each suggestion "X owes Y <amount>" with the amount in the display currency, and marks the viewer "You"', async () => {
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    const [mine] = rows('Suggested payments');
    expect(mine).toHaveTextContent('Beto owes you');
    expect(mine).toHaveTextContent('USD 30.00');
  });

  it('is pairwise: one row per other person, and no simplification across people (Dan owes Caro is not the viewer\'s business)', async () => {
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')).toHaveLength(1);
    expect(document.body).not.toHaveTextContent(/Dan|Caro/);
    expect(screen.queryByText(/simplified across the event/i)).not.toBeInTheDocument();
  });

  it('every row is one the viewer is a party to, so each has "Record payment"', async () => {
    useExpenses.mockReturnValue(live(LIVE_EXPENSES));
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    for (const row of rows('Suggested payments')) expect(within(row).getByRole('button', { name: /record payment/i })).toBeInTheDocument();
    expect(screen.queryByText(/can mark this as paid/i)).not.toBeInTheDocument();
  });

  it("avatars carry each person's own initial — the viewer is \"A\" for Ana, never \"Y\" for \"You\"", async () => {
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    // Decorative avatars come first in a row's text: Beto's "B", then the viewer's own "A".
    expect(rows('Suggested payments')[0]!.textContent).toMatch(/^BABeto owes you/);
  });

  it('says "You owe" when the viewer is the payer', async () => {
    useExpenses.mockReturnValue(
      live([makeExpense({ id: 'x9', paidBy: 'u2', amount: 40, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 20 }, { userId: 'u2', amount: 20 }] })]),
    );
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')[0]).toHaveTextContent('You owe Beto');
    expect(rows('Suggested payments')[0]).toHaveTextContent('USD 20.00');
  });

  it('nets the scope\'s settlements: a recorded payment leaves only what is still owed', async () => {
    useSettlements.mockReturnValue(live([makeSettlement({ id: 's1', fromUserId: 'u2', toUserId: 'u1', amount: 10 })]));
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')[0]).toHaveTextContent('Beto owes you');
    expect(rows('Suggested payments')[0]).toHaveTextContent('USD 20.00');
  });

  it('converts a foreign-currency expense into the display currency', async () => {
    useExpenses.mockReturnValue(
      live([makeExpense({ id: 'x9', currency: 'EUR', paidBy: 'u1', amount: 20, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: 10 }] })]),
    );
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')[0]).toHaveTextContent('USD 20.00');
  });

  it('records a suggestion: settle() is called once with the suggestion rounded to 2 dp, and nothing else is written', async () => {
    useExpenses.mockReturnValue(
      live([makeExpense({ id: 'x9', paidBy: 'u1', amount: 100, memberIds: ['u1', 'u2', 'u3'], splits: [{ userId: 'u1', amount: 33.34 }, { userId: 'u2', amount: 33.33 }, { userId: 'u3', amount: 33.33 }] })]),
    );
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('33.33');
    expect(within(dialog).getByLabelText('Payment currency')).toHaveValue('USD');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith({ fromUserId: 'u2', toUserId: 'u1', amount: 33.33, currency: 'USD', date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) });
    expect(settle.mock.calls[0]![0]).not.toHaveProperty('eventId');
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
    expect(remove).not.toHaveBeenCalled();
    for (const write of Object.values(expensesRepo)) expect(write).not.toHaveBeenCalled();
  });

  it('records a partial amount as a smaller settlement', async () => {
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '12.5');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ fromUserId: 'u2', toUserId: 'u1', amount: 12.5 }));
  });

  it('warns without blocking when the amount is more than is owed', async () => {
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText('Amount');
    await user.clear(amount);
    await user.type(amount, '45');
    expect(await within(dialog).findByText(/this is more than beto owes you/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ amount: 45 })));
  });

  it('passes eventId when the scope is an event', async () => {
    setUrl('?event=ev1');
    useExpenses.mockReturnValue(live<Expense>(undefined));
    useSettlements.mockReturnValue(live<Settlement>(undefined));
    useEvent.mockReturnValue(query(EVENT));
    useEventExpenses.mockReturnValue(live(EVENT_EXPENSES));
    useEventSettlements.mockReturnValue(live<Settlement>([]));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ fromUserId: 'u2', toUserId: 'u1', eventId: 'ev1' }));
  });

  it('a denied insert leaves the list unchanged and says so in a plain sentence, never the raw error', async () => {
    settle.mockRejectedValue(new Error('RelationalSupabaseAdapter: setDocument(settlements/s1) failed: new row violates row-level security policy for table "settlements"'));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    const sentence = "You can't record this payment. Only the two people involved can, and they must be friends or share the event.";
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(sentence));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent(/row-level|violates/i);
    expect(rows('Suggested payments')).toHaveLength(1);
  });

  it('when nothing is left to settle it says so and links to adding an expense', async () => {
    useExpenses.mockReturnValue(live<Expense>([]));
    render(<SettlementsIsland />);
    expect(await screen.findByText("You're all settled up.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /add an expense/i })).toHaveAttribute('href', '/expenses/new');
    expect(screen.queryByRole('list', { name: 'Suggested payments' })).not.toBeInTheDocument();
  });

  it('in the event scope the add-expense link carries the event', async () => {
    setUrl('?event=ev1');
    useExpenses.mockReturnValue(live<Expense>(undefined));
    useSettlements.mockReturnValue(live<Settlement>(undefined));
    useEvent.mockReturnValue(query(EVENT));
    useEventExpenses.mockReturnValue(live<Expense>([]));
    useEventSettlements.mockReturnValue(live<Settlement>([]));
    render(<SettlementsIsland />);
    expect(await screen.findByRole('link', { name: /add an expense/i })).toHaveAttribute('href', '/expenses/new?event=ev1');
  });
});

describe('SettlementsIsland — balances tab', () => {
  async function openBalances() {
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    return user;
  }

  it('personal view: pairwise per person — people you owe and people who owe you, in the display currency', async () => {
    useExpenses.mockReturnValue(live(LIVE_EXPENSES));
    useProfiles.mockReturnValue({ data: PROFILES, isError: false, isFetching: false, refetch: vi.fn() });
    $user.set({ ...USER, uid: 'u2', displayName: 'Beto' });
    await openBalances();
    const items = (name: string) => within(screen.getByRole('list', { name })).getAllByRole('listitem');
    // Beto owes Ana 60 (Groceries 30 + Hotel 30) and Caro 20 (Mezcal tour); nobody owes Beto.
    expect(items('You owe')).toHaveLength(2);
    expect(items('You owe')[0]).toHaveTextContent(/Ana.*USD 60\.00/);
    expect(items('You owe')[1]).toHaveTextContent(/Caro.*USD 20\.00/);
    expect(screen.queryByRole('list', { name: 'Owe you' })).not.toBeInTheDocument();
  });

  it('personal view: the fixture with one person who owes the viewer', async () => {
    await openBalances();
    const oweYou = screen.getByRole('list', { name: 'Owe you' });
    expect(within(oweYou).getAllByRole('listitem')).toHaveLength(1);
    expect(within(oweYou).getByRole('listitem')).toHaveTextContent(/Beto.*USD 30\.00/);
    expect(screen.queryByRole('list', { name: 'You owe' })).not.toBeInTheDocument();
  });

  it('event scope keeps the net balances: who owes and who is owed across the event, with the viewer as "You"', async () => {
    eventScope();
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    const owes = screen.getByRole('list', { name: 'Owes' });
    const owed = screen.getByRole('list', { name: 'Is owed' });
    const items = (list: HTMLElement) => within(list).getAllByRole('listitem');
    // Largest first; the decorative avatar's initials also sit in each row's text, so match name then amount.
    expect(items(owes)).toHaveLength(2);
    expect(items(owes)[0]).toHaveTextContent(/Dan.*USD 50\.00/);
    expect(items(owes)[1]).toHaveTextContent(/Beto.*USD 30\.00/);
    expect(items(owed)).toHaveLength(2);
    expect(items(owed)[0]).toHaveTextContent(/Caro.*USD 50\.00/);
    expect(items(owed)[1]).toHaveTextContent(/You.*USD 30\.00/);
  });

  it('converts every amount into the display currency', async () => {
    useExpenses.mockReturnValue(
      live([makeExpense({ id: 'x9', currency: 'EUR', paidBy: 'u1', amount: 20, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: 10 }] })]),
    );
    await openBalances();
    expect(within(screen.getByRole('list', { name: 'Owe you' })).getByText('USD 20.00')).toBeInTheDocument();
  });

  it('lists the exchange rates used for every currency that was converted, and marks a fallback as approximate', async () => {
    useExpenses.mockReturnValue(
      live([makeExpense({ id: 'x9', currency: 'EUR', paidBy: 'u1', amount: 20, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 10 }, { userId: 'u2', amount: 10 }] })]),
    );
    useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: true, rates: { EUR: { rate: 2, isFallback: true } }, refresh: vi.fn() });
    await openBalances();
    const table = screen.getByRole('table', { name: 'Exchange rates used' });
    const cells = within(within(table).getAllByRole('row')[1]!).getAllByRole('cell');
    expect(cells.map((cell) => cell.textContent)).toEqual(['EUR', 'USD', '1 EUR = 2.0000 USD', 'Approximate']);
  });

  it('shows no rates table when nothing needed converting', async () => {
    useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: false, rates: {}, refresh: vi.fn() });
    await openBalances();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('says everyone is settled up when every balance is within a cent of zero', async () => {
    useExpenses.mockReturnValue(live<Expense>([]));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    expect(screen.getByText('Everyone is settled up.')).toBeInTheDocument();
  });

  it('shows no amount until the exchange rates are ready', async () => {
    const user = userEvent.setup();
    const view = render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'Balances' }));
    useDisplayConversion.mockReturnValue({ convert, ready: false, approximate: false, rates: {}, refresh: vi.fn() });
    view.rerender(<SettlementsIsland />);
    expect(screen.queryByRole('list', { name: 'Owes' })).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/USD \d/);
  });
});

describe('SettlementsIsland — the personal view is pairwise, so both parties see the same number', () => {
  const EXPECTED: Record<string, string[]> = {
    u1: ['Beto owes you USD 60.00', 'Caro owes you USD 30.00'],
    u2: ['You owe Ana USD 60.00', 'You owe Caro USD 20.00'],
    u3: ['You owe Ana USD 30.00', 'Beto owes you USD 20.00'],
  };
  const NAME: Record<string, string> = { u1: 'Ana', u2: 'Beto', u3: 'Caro' };

  function renderAs(uid: string) {
    $user.set({ ...USER, uid, displayName: NAME[uid] ?? uid });
    // Every viewer's query returns every row RLS lets them see: the same three rows, event expenses included.
    useExpenses.mockReturnValue(live(LIVE_EXPENSES));
    return render(<SettlementsIsland />);
  }

  const shown = () => rows('Suggested payments').map((row) => (row.textContent ?? '').replace(/^[A-Z]{2}/, '').replace(/Record payment$/, '').replace('USD', ' USD').replace(/\s+/g, ' ').trim());

  it.each(Object.keys(EXPECTED))('%s sees exactly the rows that name them, one per person', async (uid) => {
    renderAs(uid);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(shown()).toEqual(EXPECTED[uid]);
  });

  it('for every pair, the two people read the same amount for the debt between them (the live-run 80 vs 60 case)', async () => {
    const amountBetween = async (viewer: string, other: string) => {
      const { unmount } = renderAs(viewer);
      await screen.findByRole('list', { name: 'Suggested payments' });
      const row = rows('Suggested payments').find((r) => r.textContent?.includes(NAME[other]!));
      const amount = row?.textContent?.match(/USD (\d+\.\d{2})/)?.[1];
      unmount();
      return amount;
    };
    for (const [x, y] of [['u1', 'u2'], ['u1', 'u3'], ['u2', 'u3']] as const) {
      const seenByX = await amountBetween(x, y);
      const seenByY = await amountBetween(y, x);
      expect(seenByX, `${NAME[x]} with ${NAME[y]}`).toBeDefined();
      expect(seenByX).toBe(seenByY);
    }
  });

  it('agrees with the dashboard: every amount is what balancesWithUser (the dashboard\'s selector) computes for the same rows', async () => {
    for (const uid of ['u1', 'u2', 'u3']) {
      const expected = balancesWithUser(involvingUser(LIVE_EXPENSES, uid), [], uid, {}, convert);
      const { unmount } = renderAs(uid);
      await screen.findByRole('list', { name: 'Suggested payments' });
      expect(rows('Suggested payments')).toHaveLength(expected.length);
      for (const { userId, balance } of expected) {
        const row = rows('Suggested payments').find((r) => r.textContent?.includes(NAME[userId]!));
        expect(row, `${NAME[uid]} with ${NAME[userId]}`).toHaveTextContent(`USD ${Math.abs(balance).toFixed(2)}`);
        expect(row).toHaveTextContent(balance > 0 ? /owes you/ : /You owe/);
      }
      unmount();
    }
  });

  it('a settlement between two people lowers the same debt for both of them', async () => {
    const paid = [makeSettlement({ id: 's1', fromUserId: 'u2', toUserId: 'u1', amount: 25, eventId: 'ev1' })];
    for (const [uid, expected] of [['u1', 'Beto owes you USD 35.00'], ['u2', 'You owe Ana USD 35.00']] as const) {
      useSettlements.mockReturnValue(live(paid));
      const { unmount } = renderAs(uid);
      await screen.findByRole('list', { name: 'Suggested payments' });
      expect(shown()[0]).toBe(expected);
      unmount();
    }
  });

  it('records the pairwise amount: the dialog is pre-filled with it and the overpay notice compares against it', async () => {
    const user = userEvent.setup();
    renderAs('u2');
    await user.click(await screen.findByRole('button', { name: 'Record payment from you to Ana' }));
    const dialog = await screen.findByRole('dialog');
    // Simplified, Beto would have been offered 80 (60 to Ana plus what Caro owes her).
    const amount = within(dialog).getByLabelText('Amount');
    expect(amount).toHaveValue('60.00');
    await user.clear(amount);
    await user.type(amount, '70');
    expect(await within(dialog).findByText('This is more than you owe. The difference will show as owed back to you.')).toBeInTheDocument();
    await user.clear(amount);
    await user.type(amount, '60');
    await waitFor(() => expect(within(dialog).queryByText(/more than you owe/i)).not.toBeInTheDocument());
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ fromUserId: 'u2', toUserId: 'u1', amount: 60 })));
    expect(settle.mock.calls[0]![0]).not.toHaveProperty('eventId');
  });
});

const refetchFriends = vi.fn();
const refetchEvents = vi.fn();

describe('SettlementsIsland — where each personal row can be recorded (no dead-end button)', () => {
  // Beto (u2) is Ana's friend and NOT Caro's; Beto owes Ana 60 (Groceries + Hotel) and Caro 20 (Mezcal tour, in the Oaxaca trip).
  function asBeto(expenses: Expense[] = LIVE_EXPENSES, events: Event[] = [EVENT]) {
    $user.set({ ...USER, uid: 'u2', displayName: 'Beto' });
    useExpenses.mockReturnValue(live(expenses));
    useEvents.mockReturnValue(live(events));
  }
  const CANCUN: Event = { ...EVENT, id: 'ev2', name: 'Cancun' };
  // A second event expense between Beto and Caro: their debt now spans two events.
  const CARO_IN_CANCUN = makeExpense({ id: 'e3', eventId: 'ev2', paidBy: 'u3', amount: 20, memberIds: ['u2', 'u3'], splits: [{ userId: 'u3', amount: 10 }, { userId: 'u2', amount: 10 }] });
  const rowFor = (name: string) => rows('Suggested payments').find((r) => r.textContent?.includes(name))!;

  it('an accepted friend: "Record payment" and no event id', async () => {
    asBeto();
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from you to Ana' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByText(/recorded in/i)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith(expect.objectContaining({ fromUserId: 'u2', toUserId: 'u1', amount: 60 }));
    expect(settle.mock.calls[0]![0]).not.toHaveProperty('eventId');
  });

  it('not a friend, but the whole debt is one event\'s: "Record payment" that passes that event id and says so', async () => {
    asBeto();
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from you to Caro' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Recorded in Oaxaca trip\./)).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('20.00');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    expect(settle).toHaveBeenCalledWith({ fromUserId: 'u2', toUserId: 'u3', amount: 20, currency: 'USD', date: expect.any(String), eventId: 'ev1' });
  });

  it('an event whose name is not available is called "the event" in the dialog', async () => {
    asBeto(LIVE_EXPENSES, []);
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from you to Caro' }));
    expect(await within(await screen.findByRole('dialog')).findByText(/Recorded in the event\./)).toBeInTheDocument();
  });

  it('not a friend and the debt spans several events: no button, and a link to settle from each event', async () => {
    asBeto([...LIVE_EXPENSES, CARO_IN_CANCUN], [EVENT, CANCUN]);
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    const row = rowFor('Caro');
    expect(row).toHaveTextContent('USD 30.00');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(row).toHaveTextContent("You and Caro aren't friends, so settle this from the event:");
    expect(within(row).getByRole('link', { name: 'Oaxaca trip' })).toHaveAttribute('href', '/settlements?event=ev1');
    expect(within(row).getByRole('link', { name: 'Cancun' })).toHaveAttribute('href', '/settlements?event=ev2');
    // The friend's row is untouched.
    expect(within(rowFor('Ana')).getByRole('button', { name: /record payment/i })).toBeInTheDocument();
  });

  it('a link whose event name is unavailable says "the event"', async () => {
    asBeto([...LIVE_EXPENSES, CARO_IN_CANCUN], [EVENT]);
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    const links = within(rowFor('Caro')).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(['Oaxaca trip', 'the event']);
    expect(links[1]).toHaveAttribute('href', '/settlements?event=ev2');
  });

  it('not a friend and no event at all: no button, says why, and offers the way forward (add them as a friend)', async () => {
    asBeto([...LIVE_EXPENSES.slice(0, 1), makeExpense({ id: 'x2', paidBy: 'u3', amount: 40, memberIds: ['u2', 'u3'], splits: [{ userId: 'u3', amount: 20 }, { userId: 'u2', amount: 20 }] })]);
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    const row = rowFor('Caro');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(row).toHaveTextContent("You and Caro aren't friends anymore. Add them as a friend to record this payment.");
    const link = within(row).getByRole('link', { name: 'Add them as a friend' });
    expect(link).toHaveAttribute('href', '/friends');
  });

  it('no branch leaves a button that always fails: every row is either recordable (friend, or one event) or explains where to go instead', async () => {
    const scenarios: [string, Expense[], Event[]][] = [
      ['friend + single event', LIVE_EXPENSES, [EVENT]],
      ['friend + several events', [...LIVE_EXPENSES, CARO_IN_CANCUN], [EVENT, CANCUN]],
      ['friend + no-event non-friend', [LIVE_EXPENSES[0]!, makeExpense({ id: 'x2', paidBy: 'u3', amount: 40, memberIds: ['u2', 'u3'], splits: [{ userId: 'u3', amount: 20 }, { userId: 'u2', amount: 20 }] })], []],
    ];
    for (const [label, expenses, events] of scenarios) {
      asBeto(expenses, events);
      const { unmount } = render(<SettlementsIsland />);
      await screen.findByRole('list', { name: 'Suggested payments' });
      for (const row of rows('Suggested payments')) {
        const hasButton = within(row).queryAllByRole('button').length > 0;
        const explains = /aren't friends/.test(row.textContent ?? '');
        expect(hasButton !== explains, `${label}: "${row.textContent}" has ${hasButton ? 'a button' : 'no button'} and ${explains ? 'an' : 'no'} explanation`).toBe(true);
        // A row with a button is a friend row or a single-event one, i.e. one RLS accepts.
        if (hasButton) expect(row.textContent).toMatch(/Ana|Caro/);
      }
      unmount();
    }
  });

  it('the event scope does not ask about friends or events: a fellow member can always be recorded there', async () => {
    eventScope();
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(useFriends).toHaveBeenCalledWith(undefined);
    expect(useEvents).toHaveBeenCalledWith(undefined);
  });

  it.each([
    ['friends', () => useFriends.mockReturnValue(live<Friendship>(undefined))],
    ['events', () => useEvents.mockReturnValue(live<Event>(undefined))],
  ])('waits for %s before showing any row: a skeleton, never a button that might be wrong', async (_name, load) => {
    load();
    const { container } = render(<SettlementsIsland />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('button', { name: /record payment/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it.each([
    ['friends', () => useFriends.mockReturnValue(live<Friendship>(undefined, { isError: true, refetch: refetchFriends }))],
    ['events', () => useEvents.mockReturnValue(live<Event>(undefined, { isError: true, refetch: refetchEvents }))],
  ])('a failed %s query shows the error state, and Retry refetches friends and events too', async (_name, fail) => {
    refetchFriends.mockClear();
    refetchEvents.mockClear();
    useFriends.mockReturnValue(live(FRIENDS, { refetch: refetchFriends }));
    useEvents.mockReturnValue(live([EVENT], { refetch: refetchEvents }));
    fail();
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong loading your settlements/i);
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetchFriends).toHaveBeenCalledTimes(1);
    expect(refetchEvents).toHaveBeenCalledTimes(1);
  });
});

describe('SettlementsIsland — the event scope keeps the debt-simplified suggestions', () => {
  it("puts the viewer's own suggestions first, and offers Record payment only where the viewer is a party", async () => {
    eventScope();
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    const [mine, others] = rows('Suggested payments');
    expect(rows('Suggested payments')).toHaveLength(2);
    expect(mine).toHaveTextContent('Beto owes you');
    expect(mine).toHaveTextContent('USD 30.00');
    expect(within(mine!).getByRole('button', { name: 'Record payment from Beto to you' })).toBeInTheDocument();
    expect(others).toHaveTextContent('Dan owes Caro');
    expect(others).toHaveTextContent('USD 50.00');
    expect(within(others!).queryByRole('button')).not.toBeInTheDocument();
    expect(others).toHaveTextContent('Only Dan and Caro can mark this as paid.');
    expect(screen.getAllByRole('button', { name: /record payment/i })).toHaveLength(1);
  });

  it('simplifies across people: a debt routed through a third person becomes one payment to whoever is owed', async () => {
    // Beto owes Ana 30 (Hotel) and Caro owes Beto 30 (Taxi): Caro can pay Ana directly.
    eventScope([
      makeExpense({ id: 'y1', eventId: 'ev1', paidBy: 'u1', amount: 60, memberIds: ['u1', 'u2'], splits: [{ userId: 'u1', amount: 30 }, { userId: 'u2', amount: 30 }] }),
      makeExpense({ id: 'y2', eventId: 'ev1', paidBy: 'u2', amount: 60, memberIds: ['u2', 'u3'], splits: [{ userId: 'u2', amount: 30 }, { userId: 'u3', amount: 30 }] }),
    ]);
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(rows('Suggested payments')).toHaveLength(1);
    expect(rows('Suggested payments')[0]).toHaveTextContent('Caro owes you');
    expect(rows('Suggested payments')[0]).toHaveTextContent('USD 30.00');
    expect(document.body).not.toHaveTextContent(/Beto owes/);
  });

  it('says so under the heading: suggestions are simplified, so a payment may go to someone other than who paid', async () => {
    eventScope();
    render(<SettlementsIsland />);
    await screen.findByRole('list', { name: 'Suggested payments' });
    expect(screen.getByText('Suggestions are simplified across the event, so a payment may go to someone other than who paid.')).toBeInTheDocument();
  });

  it('records a suggestion with the event id, unchanged', async () => {
    eventScope();
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('button', { name: 'Record payment from Beto to you' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Amount')).toHaveValue('30.00');
    await user.click(within(dialog).getByRole('button', { name: /save payment/i }));
    await waitFor(() => expect(settle).toHaveBeenCalledWith(expect.objectContaining({ fromUserId: 'u2', toUserId: 'u1', amount: 30, eventId: 'ev1' })));
  });
});

describe('SettlementsIsland — history tab', () => {
  const HISTORY: Settlement[] = [
    // Recorded by Beto: Ana can see it but not undo it.
    makeSettlement({ id: 's1', fromUserId: 'u2', toUserId: 'u1', amount: 10, date: '2026-09-10', createdBy: 'u2' }),
    // Recorded by Ana, in another direction and currency.
    makeSettlement({ id: 's2', fromUserId: 'u1', toUserId: 'u2', amount: 5, currency: 'EUR', date: '2026-09-20', createdBy: 'u1', createdAt: '2026-09-20T09:00:00.000Z' }),
    // Between two other people: not in Ana's personal view.
    makeSettlement({ id: 's3', fromUserId: 'u3', toUserId: 'u4', amount: 7, date: '2026-09-15', createdBy: 'u3' }),
  ];

  async function openHistory(settlements: Settlement[] = HISTORY) {
    useSettlements.mockReturnValue(live(settlements));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'History' }));
    return user;
  }

  it('lists every settlement in scope, both directions, newest first', async () => {
    await openHistory();
    const items = rows('Payment history');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('You → Beto');
    expect(items[0]).toHaveTextContent('EUR 5.00');
    expect(items[1]).toHaveTextContent('Beto → You');
    expect(items[1]).toHaveTextContent('USD 10.00');
  });

  it('says "Marked as paid by <name>" with the date, and never states a payment as verified', async () => {
    await openHistory();
    const items = rows('Payment history');
    expect(items[1]).toHaveTextContent('Marked as paid by Beto');
    expect(items[0]).toHaveTextContent('Marked as paid by you');
    expect(items[1]).toHaveTextContent(new Date(2026, 8, 10).toLocaleDateString());
    const withoutTheAttestation = document.body.textContent!.replaceAll(/Marked as paid by/g, '');
    expect(withoutTheAttestation).not.toMatch(/\bpaid\b/i);
    expect(document.body).not.toHaveTextContent(/completed|verified|confirmed/i);
  });

  it('shows a foreign-currency settlement in its own currency and, once rates are ready, its display-currency value', async () => {
    await openHistory();
    expect(rows('Payment history')[0]).toHaveTextContent('EUR 5.00');
    expect(rows('Payment history')[0]).toHaveTextContent('≈ USD 10.00');
    expect(rows('Payment history')[1]).not.toHaveTextContent('≈');
  });

  it('offers Undo only on the settlements the viewer recorded', async () => {
    await openHistory();
    const [mine, theirs] = rows('Payment history');
    expect(within(mine!).getByRole('button', { name: /^undo payment from you to beto/i })).toBeInTheDocument();
    expect(within(theirs!).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /undo/i })).toHaveLength(1);
  });

  it('Undo asks first, then removes that settlement once and toasts', async () => {
    const user = await openHistory();
    await user.click(screen.getByRole('button', { name: /^undo payment from you to beto/i }));
    const dialog = await screen.findByRole('dialog');
    expect(remove).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'Undo payment' }));
    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(remove).toHaveBeenCalledWith('s2');
    await waitFor(() => expect(notifySuccess).toHaveBeenCalledTimes(1));
  });

  it('says there is no history yet, without an empty list', async () => {
    await openHistory([]);
    expect(screen.getByText('No payments recorded yet.')).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Payment history' })).not.toBeInTheDocument();
  });

  it('in the event scope it lists the event\'s settlements, even between two other people', async () => {
    setUrl('?event=ev1');
    useExpenses.mockReturnValue(live<Expense>(undefined));
    useSettlements.mockReturnValue(live<Settlement>(undefined));
    useEvent.mockReturnValue(query(EVENT));
    useEventExpenses.mockReturnValue(live(EVENT_EXPENSES));
    useEventSettlements.mockReturnValue(live([{ ...HISTORY[2]!, eventId: 'ev1' }]));
    const user = userEvent.setup();
    render(<SettlementsIsland />);
    await user.click(await screen.findByRole('tab', { name: 'History' }));
    expect(rows('Payment history')).toHaveLength(1);
    expect(rows('Payment history')[0]).toHaveTextContent('Caro → Dan');
    expect(screen.queryByRole('button', { name: /undo/i })).not.toBeInTheDocument();
  });
});
