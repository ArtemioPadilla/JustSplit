// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Expense } from '@/schemas/expense';
import type { Event } from '@/schemas/event';
import { $authReady, $profile, $user } from '@/stores/session';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * DashboardIsland (plan B8b) — the `/` route island. Composes
 * `ErrorBoundary > AuthIsland > AuthGate > Content` (the Phase-2 pattern);
 * this is the "Home part" of the legacy `src/app/__tests__/page.test.tsx`
 * (Jest suite table), rewritten around the real composition instead of
 * `AppProvider`.
 *
 * A `ControlledAuthAdapter` drives `AuthProvider`'s real
 * `onAuthStateChanged` listener so `$authReady`/`$user` flip through the
 * SAME code path a real page load does (AuthBridge.test.tsx's pattern) —
 * `AuthGate`'s own redirect/skeleton logic is exercised for real here, not
 * re-mocked.
 */
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

const { useExpenses, useEvents, useSettlements, useProfiles } = vi.hoisted(() => ({
  useExpenses: vi.fn(),
  useEvents: vi.fn(),
  useSettlements: vi.fn(),
  useProfiles: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses }));
vi.mock('@/lib/data/hooks/useEvents', () => ({ useEvents }));
vi.mock('@/lib/data/hooks/useSettlements', () => ({ useSettlements }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));

const { default: DashboardIsland } = await import('./DashboardIsland');

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

const replace = vi.fn();

beforeEach(() => {
  adapterState.listeners = [];
  adapterState.profile = { id: 'u1', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } };
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);
  replace.mockClear();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, replace } });

  useExpenses.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: vi.fn() });
  useEvents.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: vi.fn() });
  useSettlements.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: vi.fn() });
  useProfiles.mockReturnValue({ data: [], isError: false, error: null, isFetching: false, refetch: vi.fn() });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('DashboardIsland', () => {
  it('renders a heading and no dashboard content while auth is not ready, without redirecting', () => {
    render(<DashboardIsland />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText(/no expenses or events yet/i)).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('redirects to /landing/ once ready with no signed-in user (one navigation, no dashboard content)', async () => {
    render(<DashboardIsland />);
    emit(null);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/landing/'));
    expect(replace).toHaveBeenCalledTimes(1);
  });

  it('does not redirect for a signed-in user', async () => {
    render(<DashboardIsland />);
    emit(USER);
    await waitFor(() => expect($authReady.get()).toBe(true));
    expect(replace).not.toHaveBeenCalled();
  });

  it('renders WelcomeScreen for a signed-in user with no expenses and no events', async () => {
    useExpenses.mockReturnValue({ data: [] });
    useEvents.mockReturnValue({ data: [] });
    useSettlements.mockReturnValue({ data: [] });

    render(<DashboardIsland />);
    emit(USER);

    expect(await screen.findByText(/no expenses or events yet/i)).toBeInTheDocument();
  });

  it('renders the dashboard content for a signed-in user with data', async () => {
    useExpenses.mockReturnValue({
      data: [makeExpense({ id: 'exp1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10' })],
    });
    useEvents.mockReturnValue({ data: [makeEvent({ id: 'event1', name: 'Team Trip', startDate: '2099-01-01' })] });
    useSettlements.mockReturnValue({ data: [] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<DashboardIsland />);
    emit(USER);

    expect(await screen.findByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
  });

  it('personal figures only count rows that name the viewer: a group row visible through membership is not "yours" (ADR 0013)', async () => {
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'exp1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10' }),
        makeExpense({ id: 'exp2', description: 'Their group lunch', amount: 999, paidBy: 'u9', date: '2026-05-11', groupId: 'g1' }),
      ],
    });
    useEvents.mockReturnValue({ data: [] });
    useSettlements.mockReturnValue({
      data: [{ id: 's1', groupId: 'g1', fromUserId: 'u8', toUserId: 'u9', amount: 5, currency: 'USD', date: '2026-05-12', memberIds: ['u8', 'u9'], createdBy: 'u8', createdAt: '2026-05-12T00:00:00.000Z' }],
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<DashboardIsland />);
    emit(USER);

    expect(await screen.findByText('Dinner')).toBeInTheDocument();
    expect(screen.queryByText('Their group lunch')).not.toBeInTheDocument();
  });

  describe('the open-balances tile follows the ledger (plan B14a, ADR 0014)', () => {
    // Ana (u1) paid 90 for herself, Beto (u2) and Carla (u3).
    const dinner = () =>
      makeExpense({
        id: 'exp1',
        description: 'Dinner',
        amount: 90,
        paidBy: 'u1',
        date: '2026-05-10',
        memberIds: ['u1', 'u2', 'u3'],
        splits: [
          { userId: 'u1', amount: 30 },
          { userId: 'u2', amount: 30 },
          { userId: 'u3', amount: 30 },
        ],
      });
    const settlement = (overrides: Record<string, unknown>) => ({
      id: 's1',
      groupId: null,
      fromUserId: 'u2',
      toUserId: 'u1',
      amount: 30,
      currency: 'USD',
      date: '2026-05-12',
      memberIds: ['u2', 'u1'],
      createdBy: 'u2',
      createdAt: '2026-05-12T00:00:00.000Z',
      eventId: null,
      ...overrides,
    });

    beforeEach(() => {
      useEvents.mockReturnValue({ data: [] });
      useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });
    });

    it('with two debtors and no payments: "2 People to settle up with"', async () => {
      useExpenses.mockReturnValue({ data: [dinner()] });
      useSettlements.mockReturnValue({ data: [] });
      render(<DashboardIsland />);
      emit(USER);
      expect(await screen.findByText('People to settle up with')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('one pair settles: the third person is still counted, not the whole expense marked settled', async () => {
      useExpenses.mockReturnValue({ data: [dinner()] });
      useSettlements.mockReturnValue({ data: [settlement({})] });
      render(<DashboardIsland />);
      emit(USER);
      expect(await screen.findByText('Person to settle up with')).toBeInTheDocument();
      expect(screen.queryByText(/unsettled/i)).not.toBeInTheDocument();
    });

    it('everyone paid: "All settled up"', async () => {
      useExpenses.mockReturnValue({ data: [dinner()] });
      useSettlements.mockReturnValue({
        data: [settlement({}), settlement({ id: 's2', fromUserId: 'u3', memberIds: ['u3', 'u1'], createdBy: 'u3' })],
      });
      render(<DashboardIsland />);
      emit(USER);
      expect(await screen.findByText('All settled up')).toBeInTheDocument();
    });

    it('a settlement made inside an event counts here too (money moved), and one between other people does not', async () => {
      useExpenses.mockReturnValue({ data: [dinner()] });
      useSettlements.mockReturnValue({
        data: [
          settlement({ eventId: 'ev1' }),
          settlement({ id: 's9', fromUserId: 'u2', toUserId: 'u3', memberIds: ['u2', 'u3'], createdBy: 'u2', amount: 30 }),
        ],
      });
      render(<DashboardIsland />);
      emit(USER);
      expect(await screen.findByText('Person to settle up with')).toBeInTheDocument();
    });
  });

  it(
    'renders an error state with a working Retry when a query fails, instead of an endless skeleton ' +
      '(coordinator review, plan B8b)',
    async () => {
      const refetchExpenses = vi.fn();
      useExpenses.mockReturnValue({
        data: undefined,
        isError: true,
        // The real error carries backend detail (RLS/SQL) that must never
        // reach the user — asserted below via the rendered text, not this value.
        error: new Error('permission denied for table expenses'),
        refetch: refetchExpenses,
      });

      render(<DashboardIsland />);
      emit(USER);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(/something went wrong/i);
      expect(alert).not.toHaveTextContent(/permission denied/i);
      expect(alert).not.toHaveTextContent(/SQL|policy/i);

      const user = userEvent.setup();
      await user.click(screen.getByRole('button', { name: /retry/i }));
      expect(refetchExpenses).toHaveBeenCalledTimes(1);
    },
  );

  it(
    'points to the FeedbackFAB by name for a failure that keeps happening, without inventing a support ' +
      'channel or leaking cause (orchestrator review, plan B8b)',
    async () => {
      useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('permission denied for table expenses'), isRetrying: false, refetch: vi.fn() });

      render(<DashboardIsland />);
      emit(USER);

      const alert = await screen.findByRole('alert');
      // Names the FeedbackFAB's actual accessible label (BaseLayout renders
      // it lang="en" by default — "Report an issue"), not an invented email
      // or support channel.
      expect(alert).toHaveTextContent(/report an issue/i);
      expect(alert).not.toHaveTextContent(/@|support@|mailto/i);
      expect(alert).not.toHaveTextContent(/permission denied/i);
      expect(alert).not.toHaveTextContent(/SQL|policy/i);
    },
  );

  it('never shows a permanent skeleton for a query error (dataLoading alone must not mask isError)', async () => {
    // data stays undefined (as a real failed live query leaves it) AND isError is true —
    // the old `dataLoading` check alone would have shown a skeleton forever here.
    useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('boom'), isRetrying: false, refetch: vi.fn() });

    render(<DashboardIsland />);
    emit(USER);

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/no expenses or events yet/i)).not.toBeInTheDocument();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeInTheDocument();
  });

  it(
    'clicking Retry calls refetch on every query (expenses, events, settlements, profiles) ' +
      '(orchestrator review, plan B8b)',
    async () => {
      const refetchExpenses = vi.fn();
      const refetchEvents = vi.fn();
      const refetchSettlements = vi.fn();
      const refetchProfiles = vi.fn();
      useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('boom'), isRetrying: false, refetch: refetchExpenses });
      useEvents.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: refetchEvents });
      useSettlements.mockReturnValue({ data: undefined, isError: false, error: null, isRetrying: false, refetch: refetchSettlements });
      useProfiles.mockReturnValue({ data: [], isError: false, error: null, isFetching: false, refetch: refetchProfiles });

      render(<DashboardIsland />);
      emit(USER);

      const user = userEvent.setup();
      await user.click(await screen.findByRole('button', { name: /retry/i }));

      expect(refetchExpenses).toHaveBeenCalledTimes(1);
      expect(refetchEvents).toHaveBeenCalledTimes(1);
      expect(refetchSettlements).toHaveBeenCalledTimes(1);
      expect(refetchProfiles).toHaveBeenCalledTimes(1);
    },
  );

  it(
    'disables Retry with aria-busy while any query reports isRetrying/isFetching (orchestrator review, plan B8b)',
    async () => {
      useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('boom'), isRetrying: true, refetch: vi.fn() });

      render(<DashboardIsland />);
      emit(USER);

      const retryButton = await screen.findByRole('button', { name: /retry/i });
      expect(retryButton).toBeDisabled();
      expect(retryButton).toHaveAttribute('aria-busy', 'true');
    },
  );

  it('Retry is enabled and not aria-busy when no query is retrying', async () => {
    useExpenses.mockReturnValue({ data: undefined, isError: true, error: new Error('boom'), isRetrying: false, refetch: vi.fn() });

    render(<DashboardIsland />);
    emit(USER);

    const retryButton = await screen.findByRole('button', { name: /retry/i });
    expect(retryButton).not.toBeDisabled();
    expect(retryButton).toHaveAttribute('aria-busy', 'false');
  });
});

/** Plan B19c (risk:high, ADR 0015): the dashboard's preferred-currency selector writes the profile, so it follows the connection. */
describe('DashboardIsland — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  async function renderWithData() {
    useExpenses.mockReturnValue({ data: [makeExpense({ id: 'exp1', description: 'Dinner', amount: 50, paidBy: 'u1', date: '2026-05-10' })] });
    useEvents.mockReturnValue({ data: [] });
    useSettlements.mockReturnValue({ data: [] });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });
    render(<DashboardIsland />);
    emit(USER);
    await screen.findByText('Dinner');
  }

  it('blocks the currency selector with one sentence, and reading the dashboard is untouched', async () => {
    await renderWithData();
    expectWritable(screen.getByLabelText(/currency/i));

    setOnLine(false);
    expectBlocked(screen.getByLabelText(/currency/i));
    expect(visibleNotices()).toHaveLength(1);
    expect(visibleNotices()[0]).toHaveTextContent(OFFLINE_SENTENCE);
    expect(screen.getByText('Dinner')).toBeInTheDocument();

    setOnLine(true);
    expectWritable(screen.getByLabelText(/currency/i));
    expect(visibleNotices()).toHaveLength(0);
  });

  it('offline the profile write is refused by the store before any request (the OfflineWriteError contract)', async () => {
    await renderWithData();
    setOnLine(false);
    const { updateProfile } = await import('@/stores/auth');
    await expect(updateProfile({ name: 'x' })).rejects.toBeInstanceOf(OfflineWriteError);
  });
});
