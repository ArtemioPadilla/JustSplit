// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * ExpenseListIsland (plan B9) — the `/expenses/list` route island. Same
 * composition and error/retry handling as `DashboardIsland` (plan B8b);
 * this file follows that test's own setup (a `ControlledAuthAdapter`
 * driving `AuthProvider`'s real `onAuthStateChanged` listener) so
 * `AuthGate`'s redirect/skeleton logic is exercised for real, not re-mocked.
 *
 * `@tanstack/react-virtual`'s `useVirtualizer` measures the scroll
 * container via ResizeObserver/getBoundingClientRect, which jsdom always
 * reports as 0 — `<DataTable>`'s virtualized `<tbody>` renders ZERO rows
 * under Testing Library as a result (verified directly: a two-row table
 * showed an empty `<tbody />`, "0 of 2 in viewport"). This mock replaces it
 * with a "render every row" stand-in so this island's actual row content
 * (links, badges, converted amounts) can be asserted on. Copy this mock for
 * any future DataTable-based island's tests.
 */
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: (options: { count: number; estimateSize: (i: number) => number }) => {
    const items = Array.from({ length: options.count }, (_, index) => ({
      key: index,
      index,
      start: index * options.estimateSize(index),
      size: options.estimateSize(index),
      end: (index + 1) * options.estimateSize(index),
      lane: 0,
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => options.count * options.estimateSize(0),
      measure: () => {},
      measureElement: () => null,
    };
  },
}));

const { authAdapter, profileStore, adapterState } = vi.hoisted(() => {
  const state: { listeners: Array<(u: unknown) => void>; profile: unknown } = { listeners: [], profile: null };
  const authAdapter = {
    onAuthStateChanged(cb: (u: unknown) => void) {
      state.listeners.push(cb);
      return () => {
        state.listeners = state.listeners.filter((l) => l !== cb);
      };
    },
    signOut: async () => {},
    signIn: async () => {
      throw new Error('unused in this test');
    },
    signUp: async () => {
      throw new Error('unused in this test');
    },
    signInWithProvider: async () => {
      throw new Error('unused in this test');
    },
    resetPassword: async () => {},
    updatePassword: async () => {},
    updateDisplayProfile: async () => {},
    getCurrentUser: () => null,
    getIdToken: async () => null,
  };
  const profileStore = {
    get: async () => state.profile,
    set: async (_uid: string, p: unknown) => {
      state.profile = p;
    },
    update: async (_uid: string, partial: Record<string, unknown>) => {
      state.profile = { ...(state.profile as object), ...partial };
    },
  };
  return { authAdapter, profileStore, adapterState: state };
});
vi.mock('@/lib/data/adapter', () => ({ authAdapter, profileStore }));

const { useExpenses, useEvents, useProfiles } = vi.hoisted(() => ({
  useExpenses: vi.fn(),
  useEvents: vi.fn(),
  useProfiles: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses }));
vi.mock('@/lib/data/hooks/useEvents', () => ({ useEvents }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));

const { default: ExpenseListIsland } = await import('./ExpenseListIsland');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };

function emit(user: AuthUser | null) {
  adapterState.listeners.forEach((l) => l(user));
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy' | 'date' | 'description'>): Expense {
  return {
    groupId: null,
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    memberIds: [overrides.paidBy],
    createdBy: overrides.paidBy,
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    memberIds: ['u1'],
    kind: 'event',
    createdBy: 'u1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  adapterState.listeners = [];
  adapterState.profile = { id: 'u1', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } };
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);
  window.history.replaceState(null, '', '/expenses/list');

  useExpenses.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: vi.fn() });
  useEvents.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: vi.fn() });
  useProfiles.mockReturnValue({ data: [], isError: false, error: null, isFetching: false, refetch: vi.fn() });
});

afterEach(() => {
  vi.clearAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('ExpenseListIsland', () => {
  it('renders a heading and no table while auth is not ready, without redirecting', () => {
    render(<ExpenseListIsland />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('redirects to /landing/ once ready with no signed-in user', async () => {
    // Real `window.location` (not overridden, unlike the other tests) needs
    // to be swapped for a plain stub ONLY here — `location.replace` itself
    // is non-configurable on jsdom's real Location object, but `location`
    // as a property of `window` is. Every other test needs the OPPOSITE:
    // the real, live `window.location.search`, reactive to
    // `history.replaceState` (the event-filter/sort URL-state assertions).
    const replace = vi.fn();
    const realLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...realLocation, replace } });

    render(<ExpenseListIsland />);
    emit(null);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/landing/'));

    Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
  });

  it('renders an empty state when the user has no expenses', async () => {
    useExpenses.mockReturnValue({ data: [] });
    useEvents.mockReturnValue({ data: [] });

    render(<ExpenseListIsland />);
    emit(USER);

    expect(await screen.findByText(/no expenses yet/i)).toBeInTheDocument();
  });

  it('renders an "Add expense" link to /expenses/new (plan B10)', async () => {
    useExpenses.mockReturnValue({ data: [] });
    useEvents.mockReturnValue({ data: [] });

    render(<ExpenseListIsland />);
    emit(USER);

    expect(await screen.findByRole('link', { name: /add expense/i })).toHaveAttribute('href', '/expenses/new');
  });

  it('renders rows with the description, paid-by name, event link and a settled badge', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10', eventId: 'ev1', settledAt: null }),
        makeExpense({ id: 'e2', description: 'Taxi', amount: 20, paidBy: 'u1', date: '2026-05-11', settledAt: '2026-05-12T00:00:00.000Z' }),
      ],
    });
    useEvents.mockReturnValue({ data: [makeEvent({ id: 'ev1', name: 'Team Trip' })] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<ExpenseListIsland />);
    emit(USER);

    expect(await screen.findByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Taxi')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Team Trip' })).toHaveAttribute('href', '/events/ev1');
    // Only the legacy (imported) settledAt row earns a badge; nothing else is derivable per expense (ADR 0014).
    expect(screen.getAllByText('Settled')).toHaveLength(1);
    expect(within(screen.getByText('Taxi').closest('tr')!).getByText('Settled')).toBeInTheDocument();
    expect(within(screen.getByText('Dinner').closest('tr')!).queryByText(/settled/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Unsettled')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dinner' })).toHaveAttribute('href', '/expenses/e1');
  });

  it('has no Status column when no expense carries a legacy settledAt (a column of blanks would say nothing)', async () => {
    useExpenses.mockReturnValue({
      data: [makeExpense({ id: 'e1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10' })],
    });
    useEvents.mockReturnValue({ data: [] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<ExpenseListIsland />);
    emit(USER);

    expect(await screen.findByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /status/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/settled/i)).not.toBeInTheDocument();
  });

  it('shows the "(Originally: …)" caption only when the expense currency differs from the display currency', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Dinner', amount: 50, currency: 'USD', paidBy: 'u1', date: '2026-05-10' }),
        makeExpense({ id: 'e2', description: 'Museum', amount: 12, currency: 'EUR', paidBy: 'u1', date: '2026-05-11' }),
      ],
    });
    useEvents.mockReturnValue({ data: [] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<ExpenseListIsland />);
    emit(USER);

    await screen.findByText('Museum');
    expect(await screen.findByText(/Originally: 12\.00 EUR/)).toBeInTheDocument();
    expect(screen.queryByText(/Originally: 50\.00 USD/)).not.toBeInTheDocument();
  });

  it('filters by event via URL state, and shows a distinct "no results for this filter" state', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10', eventId: 'ev1' }),
        makeExpense({ id: 'e2', description: 'Taxi', amount: 20, paidBy: 'u1', date: '2026-05-11' }),
      ],
    });
    useEvents.mockReturnValue({ data: [makeEvent({ id: 'ev1', name: 'Team Trip' }), makeEvent({ id: 'ev2', name: 'Empty Trip' })] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    const user = userEvent.setup();
    render(<ExpenseListIsland />);
    emit(USER);
    await screen.findByText('Dinner');

    await user.selectOptions(screen.getByLabelText(/filter by event/i), 'ev1');

    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByText('Taxi')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('event')).toBe('ev1');

    await user.selectOptions(screen.getByLabelText(/filter by event/i), 'ev2');
    expect(await screen.findByText(/no expenses match this filter/i)).toBeInTheDocument();
  });

  it('sorting a column round-trips into the URL (syncToUrl)', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10' }),
        makeExpense({ id: 'e2', description: 'Taxi', amount: 20, paidBy: 'u1', date: '2026-05-11' }),
      ],
    });
    useEvents.mockReturnValue({ data: [] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    const user = userEvent.setup();
    render(<ExpenseListIsland />);
    emit(USER);
    await screen.findByText('Dinner');

    await user.click(screen.getByRole('button', { name: /date/i }));

    await waitFor(() => expect(window.location.search).toMatch(/sort=date/));
  });

  it('exports the filtered rows as all-expenses.csv by default, or <event>-expenses.csv when filtered', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10', eventId: 'ev1' }),
        makeExpense({ id: 'e2', description: 'Taxi', amount: 20, paidBy: 'u1', date: '2026-05-11' }),
      ],
    });
    useEvents.mockReturnValue({ data: [makeEvent({ id: 'ev1', name: 'Team Trip' })] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    let capturedFilename: string | null = null;
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedFilename = this.download;
    });

    const user = userEvent.setup();
    render(<ExpenseListIsland />);
    emit(USER);
    await screen.findByText('Dinner');

    await user.click(screen.getByRole('button', { name: 'Export as CSV' }));
    await waitFor(() => expect(capturedFilename).toBe('all-expenses.csv'));

    await user.selectOptions(screen.getByLabelText(/filter by event/i), 'ev1');
    await user.click(screen.getByRole('button', { name: 'Export as CSV' }));
    await waitFor(() => expect(capturedFilename).toBe('Team Trip-expenses.csv'));

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders an error state with a working Retry when a query fails', async () => {
    const refetchExpenses = vi.fn();
    useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('permission denied for table expenses'), isRetrying: false, refetch: refetchExpenses });

    render(<ExpenseListIsland />);
    emit(USER);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/permission denied/i);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetchExpenses).toHaveBeenCalledTimes(1);
  });
});
