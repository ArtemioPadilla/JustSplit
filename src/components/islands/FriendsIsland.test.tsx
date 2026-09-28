// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Friendship } from '@/schemas/friendship';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * FriendsIsland (plan B13) — the `/friends` route island: Friend Requests
 * (received, Accept/Reject) / Friends (Remove behind a confirm dialog) /
 * Sent Requests (Cancel), plus the add-by-email form. Same
 * `ErrorBoundary > AuthIsland > AuthGate > Content` composition and
 * error/retry handling as `ExpenseListIsland` (plan B9) — this file follows
 * that test's own `ControlledAuthAdapter` setup so `AuthGate`'s real
 * redirect/skeleton logic is exercised, not re-mocked.
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

const { useFriends, useProfiles, useUpdateFriendshipStatus, useRemoveFriendship, useSendFriendRequest } = vi.hoisted(() => ({
  useFriends: vi.fn(),
  useProfiles: vi.fn(),
  useUpdateFriendshipStatus: vi.fn(),
  useRemoveFriendship: vi.fn(),
  useSendFriendRequest: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useUpdateFriendshipStatus', () => ({ useUpdateFriendshipStatus }));
vi.mock('@/lib/data/hooks/useRemoveFriendship', () => ({ useRemoveFriendship }));
vi.mock('@/lib/data/hooks/useSendFriendRequest', () => ({ useSendFriendRequest }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { default: FriendsIsland } = await import('./FriendsIsland');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NAMES: Record<string, string> = { u1: 'Ana', u2: 'Beto', u3: 'Caro', u4: 'Dana' };

function profilesFor(ids: string[]) {
  return { data: ids.map((id) => ({ id, name: NAMES[id] ?? id, avatarUrl: null })), isError: false, isFetching: false, refetch: vi.fn() };
}

function friendship(overrides: Partial<Friendship>): Friendship {
  return { id: 'f-default', users: ['u1', 'u2'], status: 'pending', requestedBy: 'u1', createdAt: '2026-09-28T00:00:00.000Z', ...overrides };
}

function emit(user: AuthUser | null) {
  adapterState.listeners.forEach((l) => l(user));
}

let updateStatusMutateAsync: ReturnType<typeof vi.fn>;
let removeMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  adapterState.listeners = [];
  adapterState.profile = { id: 'u1', name: 'Ana', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } };
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);

  useProfiles.mockImplementation((ids: string[]) => profilesFor(ids));
  updateStatusMutateAsync = vi.fn().mockResolvedValue(undefined);
  useUpdateFriendshipStatus.mockReturnValue({ mutateAsync: updateStatusMutateAsync, isPending: false });
  removeMutateAsync = vi.fn().mockResolvedValue(undefined);
  useRemoveFriendship.mockReturnValue({ mutateAsync: removeMutateAsync, isPending: false });
  useSendFriendRequest.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('FriendsIsland', () => {
  it('shows a skeleton while friendships are loading', () => {
    useFriends.mockReturnValue({ data: undefined, isError: false, isRetrying: false, refetch: vi.fn() });
    render(<FriendsIsland />);
    emit(USER);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/friends/i);
  });

  it('renders an error state with a working Retry when the query fails', async () => {
    const refetch = vi.fn();
    useFriends.mockReturnValue({ data: undefined, isError: true, isRetrying: false, refetch });
    render(<FriendsIsland />);
    emit(USER);
    const retry = await screen.findByRole('button', { name: /retry/i });
    await userEvent.setup().click(retry);
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the three sections with the right people and actions', async () => {
    useFriends.mockReturnValue({
      data: [
        friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' }),
        friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u3' }),
        friendship({ id: 'f3', users: ['u1', 'u4'], status: 'pending', requestedBy: 'u1' }),
      ],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<FriendsIsland />);
    emit(USER);

    expect(await screen.findByRole('heading', { name: /friend requests/i })).toBeInTheDocument();
    expect(screen.getByText('Caro')).toBeInTheDocument(); // received
    expect(screen.getByRole('button', { name: /^accept$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /friends \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /beto/i })).toHaveAttribute('href', '/friends/u2');
    expect(screen.getByRole('button', { name: /^remove$/i })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /sent requests/i })).toBeInTheDocument();
    expect(screen.getByText('Dana')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument();
  });

  it('Accept calls useUpdateFriendshipStatus with status accepted and toasts', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u3' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<FriendsIsland />);
    emit(USER);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^accept$/i }));
    await waitFor(() => expect(updateStatusMutateAsync).toHaveBeenCalledWith({ id: 'f2', status: 'accepted' }));
    expect(notifySuccess).toHaveBeenCalledWith('Friend request accepted');
  });

  it('Reject calls useUpdateFriendshipStatus with status rejected and toasts', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u3' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<FriendsIsland />);
    emit(USER);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^reject$/i }));
    await waitFor(() => expect(updateStatusMutateAsync).toHaveBeenCalledWith({ id: 'f2', status: 'rejected' }));
    expect(notifySuccess).toHaveBeenCalledWith('Friend request declined');
  });

  it('Cancel calls useRemoveFriendship and toasts', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f3', users: ['u1', 'u4'], status: 'pending', requestedBy: 'u1' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<FriendsIsland />);
    emit(USER);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^cancel$/i }));
    await waitFor(() => expect(removeMutateAsync).toHaveBeenCalledWith('f3'));
    expect(notifySuccess).toHaveBeenCalledWith('Friend request canceled');
  });

  it('shows an empty state for the Friends section when there are no accepted friendships', async () => {
    useFriends.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    render(<FriendsIsland />);
    emit(USER);
    expect(await screen.findByText(/no friends yet/i)).toBeInTheDocument();
    // The add-by-email form is always present, even with zero friends.
    expect(screen.getByLabelText(/add a friend by email/i)).toBeInTheDocument();
  });

  it('opening Remove shows a confirmation naming the friend', async () => {
    useFriends.mockReturnValue({
      data: [friendship({ id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u2' })],
      isError: false,
      isRetrying: false,
      refetch: vi.fn(),
    });
    render(<FriendsIsland />);
    emit(USER);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /^remove$/i }));
    expect(await screen.findByRole('heading', { name: /remove beto\?/i })).toBeInTheDocument();
  });
});
