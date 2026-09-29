// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Expense } from '@/schemas/expense';
import type { Friendship } from '@/schemas/friendship';
import type { Settlement } from '@/schemas/settlement';
import { $authReady, $profile, $user } from '@/stores/session';
import { expectBlocked, expectWritable, restoreOnLine, setOnLine, visibleNotices } from '@/tests/offline-helpers';

/**
 * FriendDetailView (plan B13) — the `/friends/<id>` route view, loaded
 * lazily by `AppRouterIsland`. `AuthIsland > AuthGate > Content`. An id that
 * doesn't resolve to an ACCEPTED friend of the caller — unknown entirely,
 * or a real user who just isn't a friend — renders the SAME `NotFoundView`
 * either way (never reveal which, ADR 0002's leaked-id reasoning, extended
 * here to "is this a user at all").
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

const { useFriends, useExpenses, useSettlements, useProfiles, useRemoveFriendship } = vi.hoisted(() => ({
  useFriends: vi.fn(),
  useExpenses: vi.fn(),
  useSettlements: vi.fn(),
  useProfiles: vi.fn(),
  useRemoveFriendship: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useExpenses', () => ({ useExpenses }));
vi.mock('@/lib/data/hooks/useSettlements', () => ({ useSettlements }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useRemoveFriendship', () => ({ useRemoveFriendship }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

/** Plan B15 follow-up: the friend's avatar renders through the shared `UserAvatar` resolver. */
const { UserAvatar } = vi.hoisted(() => ({
  UserAvatar: vi.fn((props: { src: string | null | undefined; name: string }) => (
    <div data-testid="user-avatar" data-src={props.src ?? ''} data-name={props.name} />
  )),
}));
vi.mock('@/components/features/profile/UserAvatar', () => ({ UserAvatar }));

const { default: FriendDetailView } = await import('./FriendDetailView');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };

function emit(user: AuthUser | null) {
  adapterState.listeners.forEach((l) => l(user));
}

function friendship(overrides: Partial<Friendship>): Friendship {
  return { id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2', createdAt: '2026-09-28T00:00:00.000Z', ...overrides };
}

function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'id' | 'amount' | 'paidBy' | 'date' | 'description' | 'memberIds'>): Expense {
  return {
    groupId: null,
    currency: 'USD',
    splitType: 'equal',
    splits: [],
    createdBy: overrides.paidBy,
    createdAt: '2026-01-01T00:00:00.000Z',
    settledAt: null,
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<Settlement> & Pick<Settlement, 'fromUserId' | 'toUserId' | 'amount'>): Settlement {
  return {
    id: 's1',
    groupId: null,
    currency: 'USD',
    date: '2026-05-05',
    memberIds: [overrides.fromUserId, overrides.toUserId],
    createdBy: overrides.fromUserId,
    createdAt: '2026-05-05T00:00:00.000Z',
    eventId: null,
    ...overrides,
  };
}

beforeEach(() => {
  adapterState.listeners = [];
  adapterState.profile = { id: 'u1', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } };
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);

  useRemoveFriendship.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  useSettlements.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('FriendDetailView', () => {
  it('renders the not-found view for an id that is not an accepted friend (unknown OR just not a friend)', async () => {
    useFriends.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [] });
    render(<FriendDetailView id="stranger" />);
    emit(USER);
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders the not-found view for a real user who requested but is not yet accepted', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u3' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [] });
    render(<FriendDetailView id="u3" />);
    emit(USER);
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders an error state with a working Retry when a query fails', async () => {
    const refetch = vi.fn();
    useFriends.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [] });
    render(<FriendDetailView id="u2" />);
    emit(USER);
    const retry = await screen.findByRole('button', { name: /retry/i });
    await userEvent.setup().click(retry);
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the friend name/avatar, the balance (via balancesWithUser), and shared expenses only', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u1', date: '2026-05-01', memberIds: ['u1', 'u2'], splits: [{ userId: 'u2', amount: 100 }] }),
        makeExpense({ id: 'e2', description: 'Solo coffee', amount: 5, paidBy: 'u1', date: '2026-05-02', memberIds: ['u1'], splits: [] }),
      ],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });

    render(<FriendDetailView id="u2" />);
    emit(USER);

    expect(await screen.findByRole('heading', { name: 'Beto' })).toBeInTheDocument();
    expect(screen.getByText('Tacos')).toBeInTheDocument();
    expect(screen.queryByText('Solo coffee')).not.toBeInTheDocument();
    expect(await screen.findByText(/beto owes you/i)).toBeInTheDocument();
    expect(screen.getAllByText(/100\.00/).length).toBeGreaterThan(0);
  });

  it('shared expenses and the balance ignore rows the viewer only sees through a group (the friend is on them, the viewer is not — ADR 0013)', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({
      data: [
        makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u1', date: '2026-05-01', memberIds: ['u1', 'u2'], splits: [{ userId: 'u2', amount: 100 }] }),
        makeExpense({ id: 'e9', description: 'Group lunch without me', amount: 50, paidBy: 'u2', date: '2026-05-03', memberIds: ['u2', 'u3'], groupId: 'g1', splits: [{ userId: 'u3', amount: 50 }] }),
      ],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });

    render(<FriendDetailView id="u2" />);
    emit(USER);

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.queryByText('Group lunch without me')).not.toBeInTheDocument();
  });

  it("renders the friend's avatar through the shared UserAvatar resolver", async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: 'avatars/u2/a.jpg' }] });

    render(<FriendDetailView id="u2" />);
    emit(USER);

    await screen.findByRole('heading', { name: 'Beto' });
    expect(screen.getByTestId('user-avatar')).toHaveAttribute('data-src', 'avatars/u2/a.jpg');
  });

  it('links "Add shared expense" to /expenses/new?friend=<id>', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });

    render(<FriendDetailView id="u2" />);
    emit(USER);

    expect(await screen.findByRole('link', { name: /add shared expense/i })).toHaveAttribute(
      'href',
      '/expenses/new?friend=u2',
    );
  });

  it('links "Settle up" to /settlements now that plan B14b shipped it (the personal view, where this friend\'s balance is one row)', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });

    render(<FriendDetailView id="u2" />);
    emit(USER);

    expect(await screen.findByRole('link', { name: /^settle up$/i })).toHaveAttribute('href', '/settlements');
  });

  it('shows a settled-up message when the balance rounds to zero, and a Remove button that opens a confirmation', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });

    const user = userEvent.setup();
    render(<FriendDetailView id="u2" />);
    emit(USER);

    expect(await screen.findByText(/all settled up/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^remove$/i }));
    expect(await screen.findByRole('heading', { name: /remove beto\?/i })).toBeInTheDocument();
  });

  describe('the balance follows the ledger (plan B14a, ADR 0014)', () => {
    function arrange(settlements: Settlement[]) {
      useFriends.mockReturnValue({
        data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
        isError: false,
        isRetrying: false,
        refetch: vi.fn(),
      });
      // Ana (u1) paid 90 for herself, Beto (u2) and Carla (u3).
      useExpenses.mockReturnValue({
        data: [
          makeExpense({
            id: 'e1',
            description: 'Dinner',
            amount: 90,
            paidBy: 'u1',
            date: '2026-05-01',
            memberIds: ['u1', 'u2', 'u3'],
            splits: [
              { userId: 'u1', amount: 30 },
              { userId: 'u2', amount: 30 },
              { userId: 'u3', amount: 30 },
            ],
          }),
        ],
        isError: false,
        isRetrying: false,
        refetch: vi.fn(),
      });
      useSettlements.mockReturnValue({ data: settlements, isError: false, isRetrying: false, refetch: vi.fn() });
      useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });
    }

    it('a partial payment lowers what the friend owes by exactly the paid amount', async () => {
      arrange([makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 12.5 })]);
      render(<FriendDetailView id="u2" />);
      emit(USER);
      expect(await screen.findByText('Beto owes you USD 17.50')).toBeInTheDocument();
    });

    it('once the friend paid in full, "all settled up" — the third person\'s debt is not part of this pair', async () => {
      arrange([makeSettlement({ fromUserId: 'u2', toUserId: 'u1', amount: 30 })]);
      render(<FriendDetailView id="u2" />);
      emit(USER);
      expect(await screen.findByText(/all settled up with beto/i)).toBeInTheDocument();
    });

    it('only settlements between the two count: a payment to or from anyone else is ignored', async () => {
      arrange([
        makeSettlement({ id: 's2', fromUserId: 'u3', toUserId: 'u1', amount: 30 }),
        makeSettlement({ id: 's3', fromUserId: 'u2', toUserId: 'u3', amount: 30 }),
      ]);
      render(<FriendDetailView id="u2" />);
      emit(USER);
      expect(await screen.findByText('Beto owes you USD 30.00')).toBeInTheDocument();
    });

    it('shows a skeleton until the settlements have loaded, never a balance computed without them', async () => {
      arrange([]);
      useSettlements.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
      render(<FriendDetailView id="u2" />);
      emit(USER);
      await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeNull());
      expect(screen.queryByText(/beto owes you/i)).not.toBeInTheDocument();
    });

    it('a failed settlements query shows the error state, and Retry refetches it', async () => {
      arrange([]);
      const refetch = vi.fn();
      useSettlements.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
      render(<FriendDetailView id="u2" />);
      emit(USER);
      await userEvent.setup().click(await screen.findByRole('button', { name: /retry/i }));
      expect(refetch).toHaveBeenCalled();
    });
  });
});

/** Plan B19c (risk:high, ADR 0015): Remove is a write; the page shows one sentence next to it. */
describe('FriendDetailView — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('blocks Remove with one sentence, opens nothing, and re-enables it on reconnect', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    useExpenses.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Beto', avatarUrl: null }] });
    const user = userEvent.setup();
    render(<FriendDetailView id="u2" />);
    emit(USER);
    await screen.findByText(/all settled up/i);

    setOnLine(false);
    const remove = screen.getByRole('button', { name: /^remove$/i });
    expectBlocked(remove);
    expect(visibleNotices()).toHaveLength(1);
    await user.click(remove);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    setOnLine(true);
    expectWritable(remove);
    expect(visibleNotices()).toHaveLength(0);
    await user.click(remove);
    expect(await screen.findByRole('heading', { name: /remove beto\?/i })).toBeInTheDocument();
  });
});
