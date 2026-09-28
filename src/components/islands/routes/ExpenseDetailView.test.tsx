// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AuthUser } from '@cyber-eco/types';
import type { Expense } from '@/schemas/expense';
import { $authReady, $profile, $user } from '@/stores/session';

/**
 * ExpenseDetailView (plan B9) — the `/expenses/<id>` route view, loaded
 * lazily by `AppRouterIsland`. `AuthIsland > AuthGate > Content` (the outer
 * `ErrorBoundary` is the 404 shell's own, per-route one). Ports the
 * surviving behavior of the legacy `src/app/expenses/__tests__/ExpenseDetail.test.tsx`
 * (rendering the description/amount/paidBy/notes/date, editing description,
 * editing notes) onto this composition — dropped: the `AppContext` mocking,
 * `toFixed(2)`-on-a-raw-prop assertions (amount is now a converted, gated-
 * on-`ready` number), and the `detailItem` CSS-class DOM query (no such
 * class exists in this rebuild; `screen.getByText` on the resolved name is
 * used instead).
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

const { useExpense, useEvent, useProfiles, useUpdateExpense, useDeleteExpense } = vi.hoisted(() => ({
  useExpense: vi.fn(),
  useEvent: vi.fn(),
  useProfiles: vi.fn(),
  useUpdateExpense: vi.fn(),
  useDeleteExpense: vi.fn(),
}));
vi.mock('@/lib/data/hooks/useExpense', () => ({ useExpense }));
vi.mock('@/lib/data/hooks/useEvent', () => ({ useEvent }));
vi.mock('@/lib/data/hooks/useProfiles', () => ({ useProfiles }));
vi.mock('@/lib/data/hooks/useUpdateExpense', () => ({ useUpdateExpense }));
vi.mock('@/lib/data/hooks/useDeleteExpense', () => ({ useDeleteExpense }));

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn(), notifySuccess: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifyError, notifySuccess: vi.fn() }));

const { default: ExpenseDetailView } = await import('./ExpenseDetailView');

const USER: AuthUser = { uid: 'u1', email: 'ana@example.com', displayName: 'Ana', photoURL: null, emailVerified: true };
const WAIT_OPTS = { timeout: 8000 };
const TEST_TIMEOUT = 15000;

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

let updateMutateAsync: ReturnType<typeof vi.fn>;
let deleteMutateAsync: ReturnType<typeof vi.fn>;

beforeEach(() => {
  adapterState.listeners = [];
  adapterState.profile = { id: 'u1', apps: ['justsplit'], permissions: [], preferences: { preferredCurrency: 'USD' } };
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);

  useEvent.mockReturnValue({ data: undefined });
  useProfiles.mockReturnValue({ data: [] });
  updateMutateAsync = vi.fn().mockResolvedValue(undefined);
  useUpdateExpense.mockReturnValue({ mutateAsync: updateMutateAsync, isPending: false });
  deleteMutateAsync = vi.fn().mockResolvedValue(undefined);
  useDeleteExpense.mockReturnValue({ mutateAsync: deleteMutateAsync, isPending: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ExpenseDetailView', () => {
  it('renders the not-found view while auth is not ready (no data fetched yet)', () => {
    useExpense.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    render(<ExpenseDetailView id="e1" />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders the not-found view for a null expense (missing OR RLS-hidden — never distinguished)', async () => {
    useExpense.mockReturnValue({ data: null, isLoading: false, isError: false });
    render(<ExpenseDetailView id="does-not-exist" />);
    emit(USER);

    expect(await screen.findByText(/page not found/i)).toBeInTheDocument();
  });

  it('renders an error state with a working Retry when the query fails', async () => {
    const refetch = vi.fn();
    useExpense.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error('permission denied'), refetch });
    render(<ExpenseDetailView id="e1" />);
    emit(USER);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/something went wrong/i);
    expect(alert).not.toHaveTextContent(/permission denied/i);

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders description, amount, paid-by name, event link, notes and settled badge', async () => {
    useExpense.mockReturnValue({
      data: makeExpense({
        id: 'e1',
        description: 'Tacos',
        amount: 100,
        paidBy: 'u1',
        date: '2026-05-10',
        notes: 'From the trip',
        eventId: 'ev1',
        splits: [{ userId: 'u1', amount: 100 }],
        settledAt: '2026-05-11T00:00:00.000Z',
      }),
      isLoading: false,
      isError: false,
    });
    useEvent.mockReturnValue({ data: { id: 'ev1', name: 'Team Trip' } });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<ExpenseDetailView id="e1" />);
    emit(USER);

    expect(await screen.findByText('Tacos')).toBeInTheDocument();
    expect(screen.getByText('From the trip')).toBeInTheDocument();
    expect(screen.getAllByText('Ana').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Team Trip' })).toHaveAttribute('href', '/events/ev1');
    expect(screen.getByText('Settled')).toBeInTheDocument();
    expect(screen.getAllByText(/100\.00/).length).toBeGreaterThan(0);
  });

  it(
    'editing the description commits a partial update via useUpdateExpense',
    async () => {
      useExpense.mockReturnValue({
        data: makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u1', date: '2026-05-10', splits: [{ userId: 'u1', amount: 100 }] }),
        isLoading: false,
        isError: false,
      });
      useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

      const user = userEvent.setup();
      render(<ExpenseDetailView id="e1" />);
      emit(USER);
      await screen.findByText('Tacos');

      await user.click(screen.getByText('Tacos'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Pizza');
      await waitFor(() => expect(input).toHaveValue('Pizza'), WAIT_OPTS);
      await user.type(input, '{Enter}');

      await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { description: 'Pizza' } }), WAIT_OPTS);
    },
    TEST_TIMEOUT,
  );

  it(
    'a failed description update notifies with a generic message and keeps the original text',
    async () => {
      updateMutateAsync.mockRejectedValue(new Error('permission denied for table expenses'));
      useExpense.mockReturnValue({
        data: makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u1', date: '2026-05-10', splits: [{ userId: 'u1', amount: 100 }] }),
        isLoading: false,
        isError: false,
      });
      useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

      const user = userEvent.setup();
      render(<ExpenseDetailView id="e1" />);
      emit(USER);
      await screen.findByText('Tacos');

      await user.click(screen.getByText('Tacos'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Pizza');
      await waitFor(() => expect(input).toHaveValue('Pizza'), WAIT_OPTS);
      await user.type(input, '{Enter}');

      await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1), WAIT_OPTS);
      expect(notifyError.mock.calls[0]![0]).toEqual(expect.any(String));
      expect(notifyError.mock.calls[0]![0]).not.toMatch(/permission denied/i);
      expect(await screen.findByText('Tacos', {}, WAIT_OPTS)).toBeInTheDocument();
    },
    TEST_TIMEOUT,
  );

  it(
    'editing the notes commits a partial update via useUpdateExpense',
    async () => {
      useExpense.mockReturnValue({
        data: makeExpense({
          id: 'e1',
          description: 'Tacos',
          amount: 100,
          paidBy: 'u1',
          date: '2026-05-10',
          notes: 'Original note',
          splits: [{ userId: 'u1', amount: 100 }],
        }),
        isLoading: false,
        isError: false,
      });
      useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

      const user = userEvent.setup();
      render(<ExpenseDetailView id="e1" />);
      emit(USER);
      await screen.findByText('Tacos');

      await user.click(screen.getByText('Original note'));
      const input = await screen.findByRole('textbox', {}, WAIT_OPTS);
      await user.clear(input);
      await user.type(input, 'Updated note');
      await waitFor(() => expect(input).toHaveValue('Updated note'), WAIT_OPTS);
      await user.type(input, '{Enter}');

      await waitFor(() => expect(updateMutateAsync).toHaveBeenCalledWith({ id: 'e1', patch: { notes: 'Updated note' } }), WAIT_OPTS);
    },
    TEST_TIMEOUT,
  );

  it('shows the Delete button only to the creator or payer', async () => {
    useExpense.mockReturnValue({
      data: makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u2', createdBy: 'u2', date: '2026-05-10', memberIds: ['u1', 'u2'], splits: [{ userId: 'u2', amount: 100 }] }),
      isLoading: false,
      isError: false,
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u2', name: 'Bob', avatarUrl: null }] });

    render(<ExpenseDetailView id="e1" />);
    emit(USER); // u1, neither creator nor payer

    await screen.findByText('Tacos');
    expect(screen.queryByRole('button', { name: /delete expense/i })).not.toBeInTheDocument();
  });

  it('exports the single expense as expense-<id>.csv', async () => {
    useExpense.mockReturnValue({
      data: makeExpense({ id: 'e1', description: 'Tacos', amount: 100, paidBy: 'u1', date: '2026-05-10', splits: [{ userId: 'u1', amount: 100 }] }),
      isLoading: false,
      isError: false,
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    let capturedFilename: string | null = null;
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      capturedFilename = this.download;
    });

    const user = userEvent.setup();
    render(<ExpenseDetailView id="e1" />);
    emit(USER);
    await screen.findByText('Tacos');

    await user.click(screen.getByRole('button', { name: 'Export as CSV' }));
    await waitFor(() => expect(capturedFilename).toBe('expense-e1.csv'));

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders the receipt gallery for images', async () => {
    useExpense.mockReturnValue({
      data: makeExpense({
        id: 'e1',
        description: 'Tacos',
        amount: 100,
        paidBy: 'u1',
        date: '2026-05-10',
        images: ['expenses/e1/a.jpg'],
        splits: [{ userId: 'u1', amount: 100 }],
      }),
      isLoading: false,
      isError: false,
    });
    useProfiles.mockReturnValue({ data: [{ id: 'u1', name: 'Ana', avatarUrl: null }] });

    render(<ExpenseDetailView id="e1" />);
    emit(USER);

    await screen.findByText('Tacos');
    expect(screen.getByRole('button', { name: /receipt 1/i })).toBeInTheDocument();
  });
});
