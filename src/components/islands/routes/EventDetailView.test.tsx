// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Event } from '@/schemas/event';
import type { Expense } from '@/schemas/expense';
import type { Settlement } from '@/schemas/settlement';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * `EventDetailView` (plan B11b) — the `/events/<id>` route view, loaded lazily
 * by `AppRouterIsland`. `AuthIsland`/`AuthGate` are pass-throughs here (their
 * own suites cover them); every data hook is mocked so this file proves THIS
 * view's own logic.
 *
 * Ported from the legacy `src/app/events/__tests__/EventDetail.test.tsx`:
 *   KEPT    — "renders event details correctly" (name, description, start and end
 *             date) and "allows editing event name and reflects change".
 *   CHANGED — the legacy suite mocked `AppContext`, `next/navigation`,
 *             `EditableText`, `Timeline`, `ProgressBar` and `Button` wholesale. Here
 *             the REAL `Editable`, `ProgressBar` and buttons run, `useUpdateEvent`
 *             replaces `dispatch({ type: 'UPDATE_EVENT' })`, dates are
 *             `YYYY-MM-DD` calendar dates rendered in the visitor's locale (the
 *             fixture's ISO timestamps were a legacy artefact), and the
 *             `participants`/`expenses` id-array fixture fields the page never
 *             read are gone (members are `memberIds`, expenses come from
 *             `useEventExpenses`).
 *   NEW     — ADR 0013: every figure is computed over ALL the event's expenses and
 *             is identical for every viewer (including expenses that do not name
 *             the viewer); balances follow `splits[]`, not an equal division;
 *             loading / error+retry / empty states; honest not-ready currency
 *             handling; the links.
 */
vi.mock('../AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useEvent, useEventExpenses, useEventSettlements, useProfiles, useUpdateEvent, useDisplayConversion } = vi.hoisted(() => ({
  useEvent: vi.fn(),
  useEventExpenses: vi.fn(),
  useEventSettlements: vi.fn(),
  useProfiles: vi.fn(),
  useUpdateEvent: vi.fn(),
  useDisplayConversion: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useEvent', () => ({ useEvent }));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useEventExpenses }));
vi.mock('@/lib/data/hooks/useSettlements', () => ({ useEventSettlements }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useUpdateEvent', () => ({ useUpdateEvent }));
vi.mock('@/lib/currency/useDisplayConversion', () => ({ useDisplayConversion }));

const { atom } = await import('nanostores');
const $preferredCurrency = atom('MXN');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifyError, notifySuccess: vi.fn() }));

const { EventTimeline } = vi.hoisted(() => ({
  EventTimeline: vi.fn((props: { onNavigate: (id: string) => void }) => (
    <button type="button" data-testid="event-timeline" onClick={() => props.onNavigate('exp1')}>
      timeline
    </button>
  )),
}));
vi.mock('@/components/features/events/EventTimeline', () => ({ EventTimeline }));

const { ExportCsvButton } = vi.hoisted(() => ({
  ExportCsvButton: vi.fn((props: { disabled?: boolean }) => (
    <button type="button" disabled={props.disabled}>
      Export as CSV
    </button>
  )),
}));
vi.mock('@/components/features/export/ExportCsvButton', () => ({ ExportCsvButton }));

const { default: EventDetailView } = await import('./EventDetailView');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const WAIT_OPTS = { timeout: 8000 };
const TEST_TIMEOUT = 15000;
const NOW = '2026-09-28T00:00:00.000Z';

const localDate = (calendarDate: string) => {
  const [y, m, d] = calendarDate.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString();
};

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'e1',
    name: 'Test Event',
    description: 'Test Description',
    startDate: '2025-01-01',
    endDate: '2025-01-10',
    preferredCurrency: 'USD',
    memberIds: ['u1', 'u2'],
    kind: 'event',
    createdBy: 'u1',
    createdAt: NOW,
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy' | 'date' | 'description'>): Expense {
  return {
    groupId: null,
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    memberIds: [overrides.paidBy],
    createdBy: overrides.paidBy,
    createdAt: NOW,
    settledAt: null,
    eventId: 'e1',
    ...overrides,
  };
}

// Ported fixture shape (two expenses, one settled, EUR + USD) plus a third one that does NOT name u1.
const EXPENSES: Expense[] = [
  makeExpense({
    id: 'exp1',
    description: 'Expense One',
    amount: 100,
    paidBy: 'u1',
    date: '2025-01-02',
    splits: [{ userId: 'u1', amount: 50 }, { userId: 'u2', amount: 50 }],
    memberIds: ['u1', 'u2'],
  }),
  makeExpense({
    id: 'exp2',
    description: 'Expense Two',
    amount: 50,
    currency: 'EUR',
    paidBy: 'u2',
    date: '2025-01-05',
    splits: [{ userId: 'u1', amount: 25 }, { userId: 'u2', amount: 25 }],
    memberIds: ['u1', 'u2'],
    settledAt: '2025-01-06T00:00:00.000Z',
  }),
  makeExpense({
    id: 'exp3',
    description: 'Expense Three',
    amount: 40,
    paidBy: 'u2',
    date: '2025-01-08',
    splits: [{ userId: 'u2', amount: 20 }, { userId: 'u3', amount: 20 }],
    memberIds: ['u2', 'u3'],
  }),
];

const PROFILES = [
  { id: 'u1', name: 'Ana', avatarUrl: null },
  { id: 'u2', name: 'Beto', avatarUrl: null },
  { id: 'u3', name: 'Caro', avatarUrl: null },
];

// 1 EUR = 2 USD, so the numbers below are easy to check by hand.
const convert = (amount: number, currency: string) => (currency === 'EUR' ? amount * 2 : amount);

let updateMutateAsync: ReturnType<typeof vi.fn>;

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
    id: 's1',
    groupId: null,
    currency: 'USD',
    date: '2025-01-09',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: NOW,
    eventId: 'e1',
    ...overrides,
  };
}

function loaded(overrides: { event?: Event; expenses?: Expense[]; settlements?: Settlement[] } = {}) {
  useEvent.mockReturnValue({ data: overrides.event ?? makeEvent(), isLoading: false, isError: false, refetch: vi.fn() });
  useEventExpenses.mockReturnValue({ data: overrides.expenses ?? EXPENSES, isError: false, isRetrying: false, refetch: vi.fn() });
  useEventSettlements.mockReturnValue({ data: overrides.settlements ?? [], isError: false, isRetrying: false, refetch: vi.fn() });
}

beforeEach(() => {
  $user.set(USER);
  $profile.set(null);
  $authReady.set(true);
  $preferredCurrency.set('MXN');

  useProfiles.mockReturnValue({ data: PROFILES, isError: false, isPending: false });
  useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: false, refresh: vi.fn() });
  updateMutateAsync = vi.fn().mockResolvedValue(undefined);
  useUpdateEvent.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
  loaded();
});

afterEach(() => {
  vi.clearAllMocks();
  $user.set(null);
  $authReady.set(false);
});

describe('EventDetailView — states', () => {
  it('has a sr-only h1 and a busy skeleton while the event loads', () => {
    useEvent.mockReturnValue({ data: undefined, isLoading: true, isError: false, refetch: vi.fn() });
    const { container } = render(<EventDetailView id="e1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('Test Event')).not.toBeInTheDocument();
  });

  it('renders NotFoundView for an id that resolves to no row (missing or RLS-hidden — never distinguished)', () => {
    useEvent.mockReturnValue({ data: null, isLoading: false, isError: false, refetch: vi.fn() });
    render(<EventDetailView id="nope" />);
    expect(screen.getByRole('heading', { level: 1, name: /not found/i })).toBeInTheDocument();
  });

  it('shows an error state with a working Retry when the event fails to load', async () => {
    const refetch = vi.fn();
    useEvent.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    render(<EventDetailView id="e1" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the event header when only the expenses fail, with an error state and a bounded Retry in place of the figures', async () => {
    const refetch = vi.fn();
    useEventExpenses.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    render(<EventDetailView id="e1" />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/expenses/i);
    expect(screen.queryByText(/USD 0\.00/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('disables Retry while a retry is in flight', () => {
    useEventExpenses.mockReturnValue({ data: undefined, isError: true, isRetrying: true, refetch: vi.fn() });
    render(<EventDetailView id="e1" />);
    expect(screen.getByRole('button', { name: /retry/i })).toBeDisabled();
  });

  it('shows a skeleton, not zero totals, while the expenses load', () => {
    useEventExpenses.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
    const { container } = render(<EventDetailView id="e1" />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText(/USD 0\.00/)).not.toBeInTheDocument();
  });

  it('shows a skeleton, not figures computed without payments, while the settlements load', () => {
    useEventSettlements.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
    const { container } = render(<EventDetailView id="e1" />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('list', { name: /balances/i })).not.toBeInTheDocument();
  });

  it('shows an error state with a working Retry when the settlements fail (the figures would be wrong without them)', async () => {
    const refetch = vi.fn();
    useEventSettlements.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    render(<EventDetailView id="e1" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/settlements/i);
    expect(screen.queryByRole('list', { name: /balances/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows an empty state with an "Add expense" action for an event with no expenses', () => {
    loaded({ expenses: [] });
    render(<EventDetailView id="e1" />);
    expect(screen.getByText(/no expenses yet/i)).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: /add expense/i })) {
      expect(link).toHaveAttribute('href', '/expenses/new?event=e1');
    }
    expect(screen.getByRole('button', { name: /export as csv/i })).toBeDisabled();
  });
});

describe('EventDetailView — ported from EventDetail.test.tsx', () => {
  it('renders event details correctly: name, description, start and end date in the visitor\'s locale', () => {
    render(<EventDetailView id="e1" />);
    expect(screen.getByText('Test Event')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText(localDate('2025-01-01'))).toBeInTheDocument();
    expect(screen.getByText(localDate('2025-01-10'))).toBeInTheDocument();
  });

  it('falls back to date when there is no startDate, and omits the end date when there is none', () => {
    loaded({ event: makeEvent({ startDate: undefined, date: '2025-03-04', endDate: undefined }) });
    render(<EventDetailView id="e1" />);
    expect(screen.getByText(localDate('2025-03-04'))).toBeInTheDocument();
    expect(screen.queryByText('End date')).not.toBeInTheDocument();
  });

  it(
    'allows editing the event name: commits a partial update through useUpdateEvent and shows the new name',
    async () => {
      const user = userEvent.setup();
      const { rerender } = render(<EventDetailView id="e1" />);

      await user.click(screen.getByText('Test Event'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Updated Event Name');
      await waitFor(() => expect(input).toHaveValue('Updated Event Name'), WAIT_OPTS);
      await user.type(input, '{Enter}');

      await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { name: 'Updated Event Name' } }), WAIT_OPTS);

      // The server-confirmed row flows back through the query cache.
      loaded({ event: makeEvent({ name: 'Updated Event Name' }) });
      rerender(<EventDetailView id="e1" />);
      expect(await screen.findByText('Updated Event Name', {}, WAIT_OPTS)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'a failed rename notifies with a generic message (never the raw error) and keeps the original name',
    async () => {
      updateMutateAsync.mockRejectedValue(new Error('permission denied for table events'));
      const user = userEvent.setup();
      render(<EventDetailView id="e1" />);

      await user.click(screen.getByText('Test Event'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Nope');
      await waitFor(() => expect(input).toHaveValue('Nope'), WAIT_OPTS);
      await user.type(input, '{Enter}');

      await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1), WAIT_OPTS);
      expect(notifyError.mock.calls[0]![0]).not.toMatch(/permission denied/i);
      expect(await screen.findByText('Test Event', {}, WAIT_OPTS)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );
});

describe('EventDetailView — figures cover ALL of the event\'s expenses (ADR 0013)', () => {
  it('counts, totals and sums what is still owed over every expense, including one that does not name the viewer', () => {
    render(<EventDetailView id="e1" />);
    // 100 USD + 50 EUR (x2) + 40 USD = 240; still owed = the positive balances = Ana's 50 (exp2 is legacy settled).
    const summary = screen.getByRole('region', { name: /summary/i });
    expect(within(summary).getByText('3')).toBeInTheDocument();
    expect(within(summary).getByText('USD 240.00')).toBeInTheDocument();
    expect(within(summary).getByText('Still owed')).toBeInTheDocument();
    expect(within(summary).getByText('USD 50.00')).toBeInTheDocument();
    expect(within(summary).queryByText('Unsettled')).not.toBeInTheDocument();
  });

  it('shows the same figures and the same balances to every viewer', () => {
    const view = render(<EventDetailView id="e1" />);
    // textContent, not innerHTML: React's generated ids differ between two renders.
    const asAna = view.container.textContent;
    view.unmount();

    $user.set({ ...USER, uid: 'u3', displayName: 'Caro' });
    const other = render(<EventDetailView id="e1" />);
    expect(asAna).toContain('USD 240.00');
    expect(other.container.textContent).toBe(asAna);
  });

  it('shows per-member balances from splits[] over the unsettled expenses, in words as well as numbers', () => {
    render(<EventDetailView id="e1" />);
    const list = screen.getByRole('list', { name: /balances/i });
    // u1: +100 - 50 = 50 ; u2: -50 + 40 - 20 = -30 ; u3: -20 (exp2 is settled and ignored).
    expect(within(list).getByText('Ana')).toBeInTheDocument();
    expect(within(list).getByText('is owed USD 50.00')).toBeInTheDocument();
    expect(within(list).getByText('owes USD 30.00')).toBeInTheDocument();
    expect(within(list).getByText('owes USD 20.00')).toBeInTheDocument();
  });

  it('colours "is owed" with a contrast-safe pair, never text-chart-2 (axe color-contrast failed on the live page; the words, not the colour, carry the meaning)', () => {
    render(<EventDetailView id="e1" />);
    const owed = screen.getByText('is owed USD 50.00');
    expect(owed).toHaveClass('text-green-800', 'dark:text-green-200');
    expect(owed).not.toHaveClass('text-chart-2');
  });

  it('lists every event member even when nothing is unsettled, as "settled up"', () => {
    loaded({ expenses: EXPENSES.map((e) => ({ ...e, settledAt: '2025-02-01T00:00:00.000Z' })) });
    render(<EventDetailView id="e1" />);
    const list = screen.getByRole('list', { name: /balances/i });
    expect(within(list).getAllByText(/settled up/i)).toHaveLength(2);
    expect(within(list).getByText('Ana')).toBeInTheDocument();
    expect(within(list).getByText('Beto')).toBeInTheDocument();
  });

  it('also lists someone who is on an expense but no longer a member of the event', () => {
    render(<EventDetailView id="e1" />);
    // u3 is not in event.memberIds but appears on exp3.
    expect(within(screen.getByRole('list', { name: /balances/i })).getByText('Caro')).toBeInTheDocument();
  });

  it('falls back to "Unknown" for someone whose profile did not resolve', () => {
    useProfiles.mockReturnValue({ data: [PROFILES[0]], isError: false, isPending: false });
    render(<EventDetailView id="e1" />);
    expect(within(screen.getByRole('list', { name: /balances/i })).getAllByText('Unknown').length).toBeGreaterThan(0);
  });

  it('reports settlement progress as settled over settled plus still owed, with a labelled progress bar', () => {
    render(<EventDetailView id="e1" />);
    // Only the legacy settled expense has moved money (Ana's 25 EUR = 50 USD): 50 / (50 + 50).
    expect(screen.getByRole('progressbar', { name: /settlement progress/i })).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText(/50% settled/i)).toBeInTheDocument();
  });

  it('subscribes to the event\'s own settlements (useEventSettlements), so the event scope counts only them', () => {
    render(<EventDetailView id="e1" />);
    expect(useEventSettlements).toHaveBeenCalledWith('e1');
  });

  describe('a settlement is a payment on the ledger (plan B14a, ADR 0014)', () => {
    it('lowers the payer\'s debt and the still-owed total, and raises the progress, by exactly the paid amount', () => {
      loaded({ settlements: [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 30 })] });
      render(<EventDetailView id="e1" />);
      const list = screen.getByRole('list', { name: /balances/i });
      // Ana +50 -30 = 20 ; Beto -30 +30 = 0 ; Caro -20 (her debt is intact).
      expect(within(list).getByText('is owed USD 20.00')).toBeInTheDocument();
      expect(within(list).getByText('settled up')).toBeInTheDocument();
      expect(within(list).getByText('owes USD 20.00')).toBeInTheDocument();
      expect(within(screen.getByRole('region', { name: /summary/i })).getByText('USD 20.00')).toBeInTheDocument();
      // Settled 30 + 50 (legacy) = 80 of 80 + 20.
      expect(screen.getByRole('progressbar', { name: /settlement progress/i })).toHaveAttribute('aria-valuenow', '80');
      expect(screen.getByText(/80% settled/i)).toBeInTheDocument();
    });

    it('converts a settlement in another currency into the display currency', () => {
      loaded({ settlements: [makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 10, currency: 'EUR' })] });
      render(<EventDetailView id="e1" />);
      // 10 EUR = 20 USD: Ana +50 -20 = 30, Beto -30 +20 = -10.
      const list = screen.getByRole('list', { name: /balances/i });
      expect(within(list).getByText('is owed USD 30.00')).toBeInTheDocument();
      expect(within(list).getByText('owes USD 10.00')).toBeInTheDocument();
      expect(useDisplayConversion).toHaveBeenLastCalledWith(expect.arrayContaining(['USD', 'EUR']), 'USD');
    });

    it('reads "Settled up" at 100% once every debt is paid', () => {
      loaded({
        settlements: [
          makeSettlement({ id: 's1', fromUserId: 'u2', toUserId: 'u1', amount: 30 }),
          makeSettlement({ id: 's2', fromUserId: 'u3', toUserId: 'u1', amount: 20 }),
        ],
      });
      render(<EventDetailView id="e1" />);
      expect(screen.getByRole('progressbar', { name: /settlement progress/i })).toHaveAttribute('aria-valuenow', '100');
      // Scoped to the progress section: every balance row also reads "settled up".
      expect(within(screen.getByRole('region', { name: /event timeline/i })).getByText(/^settled up$/i)).toBeInTheDocument();
    });

    it('reads "Nothing to settle" (no bar, not 0% and not 100%) when nothing is owed and nothing was settled', () => {
      loaded({ expenses: [makeExpense({ id: 'solo', description: 'Solo', amount: 10, paidBy: 'u1', date: '2025-01-03', splits: [{ userId: 'u1', amount: 10 }] })] });
      render(<EventDetailView id="e1" />);
      expect(screen.getByText(/nothing to settle/i)).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByText(/% settled/i)).not.toBeInTheDocument();
    });

    it('an event with no expenses at all is also "nothing to settle"', () => {
      loaded({ expenses: [] });
      render(<EventDetailView id="e1" />);
      expect(screen.getByText(/nothing to settle/i)).toBeInTheDocument();
    });
  });

  it('subscribes to the event\'s own expenses (useEventExpenses), never a viewer-scoped list', () => {
    render(<EventDetailView id="e1" />);
    expect(useEventExpenses).toHaveBeenCalledWith('e1');
  });
});

describe('EventDetailView — display currency', () => {
  it('seeds the display currency from the event\'s preferred currency', () => {
    render(<EventDetailView id="e1" />);
    expect(screen.getByLabelText(/display currency/i)).toHaveValue('USD');
    expect(useDisplayConversion).toHaveBeenLastCalledWith(expect.arrayContaining(['USD', 'EUR']), 'USD');
  });

  it('falls back to the visitor\'s preferred currency when the event has none', () => {
    loaded({ event: makeEvent({ preferredCurrency: undefined }) });
    render(<EventDetailView id="e1" />);
    expect(screen.getByLabelText(/display currency/i)).toHaveValue('MXN');
  });

  it('shows every amount with its currency code and an "Originally" caption for a converted expense', () => {
    render(<EventDetailView id="e1" />);
    const two = screen.getByText('Expense Two').closest('li')!;
    expect(within(two).getByText('USD 100.00')).toBeInTheDocument();
    expect(within(two).getByText(/originally: 50\.00 eur/i)).toBeInTheDocument();
    const one = screen.getByText('Expense One').closest('li')!;
    expect(within(one).queryByText(/originally/i)).not.toBeInTheDocument();
  });

  it('shows skeletons instead of unconverted numbers until the rates are ready, and no timeline that would mislabel them', () => {
    useDisplayConversion.mockReturnValue({ convert, ready: false, approximate: false, refresh: vi.fn() });
    render(<EventDetailView id="e1" />);
    expect(screen.queryByText('USD 240.00')).not.toBeInTheDocument();
    expect(screen.queryByText('USD 140.00')).not.toBeInTheDocument();
    expect(screen.queryByTestId('event-timeline')).not.toBeInTheDocument();
  });

  it('flags approximate rates', () => {
    useDisplayConversion.mockReturnValue({ convert, ready: true, approximate: true, refresh: vi.fn() });
    render(<EventDetailView id="e1" />);
    expect(screen.getByText(/approximate rates/i)).toBeInTheDocument();
  });
});

describe('EventDetailView — expenses, timeline, links', () => {
  it('lists every expense newest first with a link, the payer, the locale date, the split size and a badge only for a legacy settled one', () => {
    render(<EventDetailView id="e1" />);
    const items = screen.getAllByRole('listitem').filter((li) => li.querySelector('a[href^="/expenses/exp"]'));
    expect(items.map((li) => within(li).getByRole('link').textContent)).toEqual(['Expense Three', 'Expense Two', 'Expense One']);

    const two = screen.getByText('Expense Two').closest('li')!;
    expect(within(two).getByRole('link', { name: 'Expense Two' })).toHaveAttribute('href', '/expenses/exp2');
    expect(within(two).getByText(localDate('2025-01-05'))).toBeInTheDocument();
    expect(within(two).getByText(/paid by beto/i)).toBeInTheDocument();
    expect(within(two).getByText(/2 people/i)).toBeInTheDocument();
    // Only a legacy (imported) settledAt earns a badge; nothing else can be derived honestly per expense (ADR 0014).
    expect(within(two).getByText('Settled')).toBeInTheDocument();
    expect(within(screen.getByText('Expense One').closest('li')!).queryByText(/settled/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Unsettled')).not.toBeInTheDocument();
  });

  it('gives the timeline every expense, the display currency and names; navigating goes to the expense through withBase', () => {
    const assign = vi.fn();
    const real = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...real, assign } });
    try {
      render(<EventDetailView id="e1" />);
      const props = EventTimeline.mock.calls.at(-1)![0] as unknown as {
        expenses: Array<{ id: string }>;
        currency: string;
        users: Record<string, string>;
        event: { startDate?: string; endDate?: string };
      };
      expect(props.expenses.map((e) => e.id).sort()).toEqual(['exp1', 'exp2', 'exp3']);
      expect(props.currency).toBe('USD');
      expect(props.users).toMatchObject({ u1: 'Ana', u2: 'Beto', u3: 'Caro' });
      expect(props.event).toMatchObject({ startDate: '2025-01-01', endDate: '2025-01-10' });

      screen.getByTestId('event-timeline').click();
      expect(assign).toHaveBeenCalledWith('/expenses/exp1');
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: real });
    }
  });

  it('links Add expense, Edit event, View Settlements and Back to events through withBase()', () => {
    render(<EventDetailView id="e1" />);
    for (const link of screen.getAllByRole('link', { name: /add expense/i })) {
      expect(link).toHaveAttribute('href', '/expenses/new?event=e1');
    }
    expect(screen.getByRole('link', { name: /edit event/i })).toHaveAttribute('href', '/events/edit/e1');
    expect(screen.getByRole('link', { name: /view settlements/i })).toHaveAttribute('href', '/settlements?event=e1');
    expect(screen.getByRole('link', { name: /back to events/i })).toHaveAttribute('href', '/events/list');
  });

  it('mounts the CSV export with ALL the event\'s expenses and `<event.name>-expenses.csv`', () => {
    render(<EventDetailView id="e1" />);
    const props = ExportCsvButton.mock.calls.at(-1)![0] as unknown as { expenses: Expense[]; filename: string };
    expect(props.expenses.map((e) => e.id).sort()).toEqual(['exp1', 'exp2', 'exp3']);
    expect(props.filename).toBe('Test Event-expenses.csv');
  });
});
