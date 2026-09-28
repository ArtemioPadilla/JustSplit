// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { $authReady, $profile, $user } from '@/stores/auth';

/**
 * Found while driving the events islands against a real Supabase stack (plan
 * B11b): every route island reads data through TanStack Query hooks
 * (`useLiveQuery`, `useQuery`, `useMutation`), but NO route island mounted a
 * `QueryClientProvider` — `QueryProvider` existed (B5a/B17b) and was only ever
 * imported by its own test. Each island's unit test mocks its hooks, so the whole
 * suite was green while /, /expenses/list, /groups/list, /friends and every other
 * data page rendered "No QueryClient set, use QueryClientProvider to set one".
 *
 * Spec D3 / ADR 0004: "exactly one QueryProvider per page, mounted by the route
 * island, with the shared idb key `justsplit:query`". Every route island composes
 * `ErrorBoundary > AuthIsland > AuthGate > Content`, and `AuthGate` is where
 * signed-in content begins, so that is the one place that gives all of them a
 * client — and only once a user is known, so an anonymous visitor never has the
 * device cache restored.
 */
const { attachPersister } = vi.hoisted(() => ({ attachPersister: vi.fn(() => () => {}) }));
vi.mock('@/lib/queryClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/queryClient')>()),
  attachPersister,
}));

const { default: AuthGate } = await import('./AuthGate');
const { JUSTSPLIT_QUERY_IDB_KEY } = await import('@/lib/queryClient');

const USER = { uid: 'u1', email: 'a@b.com', displayName: 'Ana', photoURL: null, emailVerified: true };

function Consumer() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['probe'], queryFn: () => Promise.resolve('loaded') });
  return (
    <p>
      {client ? 'has client' : 'no client'} / {query.data ?? 'pending'}
    </p>
  );
}

beforeEach(() => {
  $user.set(null);
  $profile.set(null);
  $authReady.set(false);
  Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, replace: vi.fn() } });
});

afterEach(() => {
  attachPersister.mockClear();
});

describe('AuthGate provides the page\'s QueryClient (spec D3, ADR 0004)', () => {
  it('gives signed-in content a QueryClient, so useQuery/useLiveQuery/useMutation work', async () => {
    $authReady.set(true);
    $user.set(USER);
    render(
      <AuthGate>
        <Consumer />
      </AuthGate>,
    );
    await waitFor(() => expect(screen.getByText('has client / loaded')).toBeInTheDocument());
  });

  it('attaches the persister under the ONE shared idb key', () => {
    $authReady.set(true);
    $user.set(USER);
    render(
      <AuthGate>
        <Consumer />
      </AuthGate>,
    );
    expect(attachPersister).toHaveBeenCalledTimes(1);
    expect(attachPersister).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ idbKey: JUSTSPLIT_QUERY_IDB_KEY }));
    expect(JUSTSPLIT_QUERY_IDB_KEY).toBe('justsplit:query');
  });

  it('mounts no client and restores no device cache while auth is resolving or nobody is signed in', () => {
    $authReady.set(false);
    const pending = render(
      <AuthGate>
        <Consumer />
      </AuthGate>,
    );
    pending.unmount();

    $authReady.set(true);
    $user.set(null);
    render(
      <AuthGate>
        <Consumer />
      </AuthGate>,
    );
    expect(attachPersister).not.toHaveBeenCalled();
    expect(screen.queryByText(/has client/)).not.toBeInTheDocument();
  });

  it('mounts none for a signed-in user who is denied (their fallback needs no data)', () => {
    $authReady.set(true);
    $user.set(USER);
    render(
      <AuthGate allow={['admin']} fallback={<p>denied</p>}>
        <Consumer />
      </AuthGate>,
    );
    expect(screen.getByText('denied')).toBeInTheDocument();
    expect(attachPersister).not.toHaveBeenCalled();
  });
});
