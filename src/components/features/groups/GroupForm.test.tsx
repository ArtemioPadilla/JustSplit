// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import { $authReady, $profile, $user } from '@/stores/session';
import { OfflineWriteError } from '@/lib/offline-write';
import { OFFLINE_SENTENCE, expectBlocked, expectWritable, restoreOnLine, setOnLine } from '@/tests/offline-helpers';

/**
 * `GroupForm` (plan B12, risk:high): `/groups/new`'s create form. Members
 * are picked from ACCEPTED friends only (B13's model — the RLS insert
 * check and `guard_expense_groups` reject anyone else); the payload shape
 * itself (creator as owner, invitees as member, `adminIds` derivation) is
 * `domain/groups.test.ts`'s job — this file proves the WIRING: only
 * accepted friends are offered, the built payload reaches
 * `useCreateGroup`, `maxMembers` is enforced before any mutation call, and
 * success/failure are handled the same way `ExpenseForm`'s create path is.
 */
function stubLocationAssign() {
  const real = window.location;
  const assign = vi.fn();
  Object.defineProperty(window, 'location', { configurable: true, value: { ...real, assign } });
  return {
    assign,
    restore: () => Object.defineProperty(window, 'location', { configurable: true, value: real }),
  };
}

const { atom } = await import('nanostores');
const $preferredCurrency = atom('USD');
vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const { notifySuccess, notifyError } = vi.hoisted(() => ({ notifySuccess: vi.fn(), notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifySuccess, notifyError }));

const { useFriends, useProfiles, useCreateGroup } = vi.hoisted(() => ({
  useFriends: vi.fn(),
  useProfiles: vi.fn(),
  useCreateGroup: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useFriends', () => ({ useFriends }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useCreateGroup', () => ({ useCreateGroup }));

const { GroupForm } = await import('./GroupForm');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const NAMES: Record<string, string> = { u2: 'Beto', u3: 'Caro' };

function profilesFor(ids: string[]) {
  return { data: ids.map((id) => ({ id, name: NAMES[id] ?? id, avatarUrl: null })), isError: false };
}

let createMutateAsync: ReturnType<typeof vi.fn>;
let location: ReturnType<typeof stubLocationAssign>;

beforeEach(() => {
  $user.set(USER);
  $profile.set({ id: 'u1', name: 'Ana', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } });
  $authReady.set(true);
  $preferredCurrency.set('USD');
  location = stubLocationAssign();

  useFriends.mockReturnValue({
    data: [
      { id: 'f1', users: ['u1', 'u2'], status: 'accepted', requestedBy: 'u1', createdAt: '2026-09-28T00:00:00.000Z' },
      { id: 'f2', users: ['u1', 'u3'], status: 'pending', requestedBy: 'u1', createdAt: '2026-09-28T00:00:00.000Z' },
    ],
    isError: false,
    isRetrying: false,
    refetch: vi.fn(),
  });
  useProfiles.mockImplementation((ids: string[]) => profilesFor(ids));

  createMutateAsync = vi.fn().mockResolvedValue({ id: 'g1' });
  useCreateGroup.mockReturnValue({ mutateAsync: createMutateAsync, isPending: false });
});

afterEach(() => {
  location.restore();
  vi.clearAllMocks();
});

describe('GroupForm', () => {
  it('offers only ACCEPTED friends as member candidates, never a pending request', () => {
    render(<GroupForm />);
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Caro' })).not.toBeInTheDocument();
  });

  it('blocks submit with an inline error when the name is empty, without calling useCreateGroup', async () => {
    render(<GroupForm />);
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    expect(await screen.findByText(/enter a group name/i)).toBeInTheDocument();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it('builds the create payload with the creator as owner and the checked friend as an invited member, then redirects on success', async () => {
    render(<GroupForm />);
    await userEvent.type(screen.getByLabelText(/group name/i), 'Roommates');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beto' }));
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => expect(createMutateAsync).toHaveBeenCalled());
    const input = createMutateAsync.mock.calls[0][0];
    expect(input.name).toBe('Roommates');
    expect(input.type).toBe('friends');
    expect(input.currency).toBe('USD');
    expect(input.members).toEqual([
      { userId: 'u1', displayName: 'Ana', role: 'owner', joinedAt: expect.any(String) },
      { userId: 'u2', displayName: 'Beto', role: 'member', joinedAt: expect.any(String), invitedBy: 'u1' },
    ]);
    expect(input.memberIds).toEqual(['u1', 'u2']);
    expect(input.adminIds).toEqual(['u1']);

    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/groups/g1'));
    // Plan B17b amendment (cross-navigation toasts): notify-then-navigate
    // is a full page load in this static MPA — afterNavigation queues it.
    expect(notifySuccess).toHaveBeenCalledWith('Group created', expect.objectContaining({ afterNavigation: true }));
  });

  it('shows a generic error toast on failure, without redirecting', async () => {
    createMutateAsync.mockRejectedValueOnce(new Error('nope'));
    render(<GroupForm />);
    await userEvent.type(screen.getByLabelText(/group name/i), 'Roommates');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));

    await waitFor(() => expect(notifyError).toHaveBeenCalled());
    expect(location.assign).not.toHaveBeenCalled();
  });

  it('shows an empty-state message when there are no accepted friends to add', () => {
    useFriends.mockReturnValue({ data: [], isError: false, isRetrying: false, refetch: vi.fn() });
    render(<GroupForm />);
    expect(screen.getByText(/add a friend first/i)).toBeInTheDocument();
  });
});

/** Plan B19c (risk:high, ADR 0015): see `ExpenseForm.test.tsx`; same contract for group creation. */
describe('GroupForm — offline (plan B19c)', () => {
  afterEach(() => {
    restoreOnLine();
  });

  it('Create group is blocked and explained, keeps the typed name and ticked friend, and works again on reconnect', async () => {
    render(<GroupForm />);
    await userEvent.type(screen.getByLabelText(/group name/i), 'Roommates');
    await userEvent.click(screen.getByRole('checkbox', { name: 'Beto' }));

    setOnLine(false);
    const create = screen.getByRole('button', { name: /create group/i });
    expectBlocked(create);
    expect(screen.getByText(OFFLINE_SENTENCE)).toBeVisible();

    await userEvent.click(create);
    await userEvent.type(screen.getByLabelText(/group name/i), '{Enter}');
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/group name/i)).toHaveValue('Roommates');
    expect(screen.getByRole('checkbox', { name: 'Beto' })).toBeChecked();

    setOnLine(true);
    expectWritable(create);
    expect(screen.queryByText(OFFLINE_SENTENCE)).not.toBeInTheDocument();
    await userEvent.click(create);
    await waitFor(() => expect(createMutateAsync).toHaveBeenCalledTimes(1));
  });

  it('a connection that drops mid-submit shows the plain failure, never success', async () => {
    createMutateAsync.mockImplementation(async () => {
      setOnLine(false);
      throw new TypeError('Failed to fetch');
    });
    render(<GroupForm />);
    await userEvent.type(screen.getByLabelText(/group name/i), 'Roommates');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith('Could not create this group'));
    expect(notifySuccess).not.toHaveBeenCalled();
    expect(location.assign).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/group name/i)).toHaveValue('Roommates');
  });

  it('the repo refusing an offline write reads as the shared sentence', async () => {
    createMutateAsync.mockRejectedValueOnce(new OfflineWriteError());
    render(<GroupForm />);
    await userEvent.type(screen.getByLabelText(/group name/i), 'Roommates');
    await userEvent.click(screen.getByRole('button', { name: /create group/i }));
    await waitFor(() => expect(notifyError).toHaveBeenCalledWith(OFFLINE_SENTENCE));
  });
});
