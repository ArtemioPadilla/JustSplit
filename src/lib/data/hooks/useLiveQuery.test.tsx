// @vitest-environment jsdom
import * as React from 'react';
import { render, cleanup, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StorageAdapter } from '@cyber-eco/types';

/**
 * Plan B5a: `useLiveQuery` is the single network source for a live
 * collection key. Fakes `$user`-style transitions by re-rendering with a
 * changing `uid` prop (null -> A -> B -> null) and counts active
 * `subscribeToQuery` subscriptions the way the memory/relational adapters'
 * channels would be counted, per the plan's listener-leak test.
 */
function createCountingAdapter(): { adapter: StorageAdapter; activeCount: () => number; queryCalls: () => number } {
  let active = 0;
  let queryCalls = 0;
  const adapter: Partial<StorageAdapter> = {
    subscribeToQuery: (_collection, _filters, callback) => {
      active += 1;
      queryCalls += 1;
      // FETCH-THEN-LISTEN: emit once immediately, like every real adapter.
      queueMicrotask(() => callback([]));
      let unsubscribed = false;
      return () => {
        if (unsubscribed) return;
        unsubscribed = true;
        active -= 1;
      };
    },
  };
  return { adapter: adapter as StorageAdapter, activeCount: () => active, queryCalls: () => queryCalls };
}

const { storageAdapter, setAdapter } = vi.hoisted(() => {
  let current: unknown = null;
  return {
    storageAdapter: new Proxy(
      {},
      {
        get(_target, prop) {
          return (current as Record<string, unknown>)[prop as string];
        },
      },
    ),
    setAdapter: (a: unknown) => {
      current = a;
    },
  };
});
vi.mock('@/lib/data/adapter', () => ({ storageAdapter }));

const { useLiveQuery } = await import('./useLiveQuery');

function Harness({ uid }: { uid: string | null }) {
  useLiveQuery(['expenses', uid], 'expenses', uid ? [{ field: 'memberIds', operator: 'array-contains', value: uid }] : [], {
    enabled: Boolean(uid),
  });
  return null;
}

function renderHarness(uid: string | null, client: QueryClient, strict = false) {
  const tree = (
    <QueryClientProvider client={client}>
      <Harness uid={uid} />
    </QueryClientProvider>
  );
  return render(strict ? <React.StrictMode>{tree}</React.StrictMode> : tree);
}

describe('useLiveQuery (plan B5a, spec D3: single network source)', () => {
  afterEach(() => {
    cleanup();
  });

  it('subscribes exactly once per mount, and tears down on unmount', async () => {
    const { adapter, activeCount, queryCalls } = createCountingAdapter();
    setAdapter(adapter);
    const client = new QueryClient();

    const { unmount } = renderHarness('u1', client);
    await waitFor(() => expect(queryCalls()).toBe(1));
    expect(activeCount()).toBe(1);

    unmount();
    expect(activeCount()).toBe(0);
  });

  it('tears down and re-subscribes exactly once when the key changes (fakes a $user transition null -> A -> B -> null)', async () => {
    const { adapter, activeCount } = createCountingAdapter();
    setAdapter(adapter);
    const client = new QueryClient();

    const { rerender, unmount } = renderHarness(null, client);
    expect(activeCount()).toBe(0); // disabled while signed out

    rerender(
      <QueryClientProvider client={client}>
        <Harness uid="A" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(activeCount()).toBe(1));

    rerender(
      <QueryClientProvider client={client}>
        <Harness uid="B" />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(activeCount()).toBe(1)); // never 2 — the old subscription was torn down first

    rerender(
      <QueryClientProvider client={client}>
        <Harness uid={null} />
      </QueryClientProvider>,
    );
    expect(activeCount()).toBe(0);

    unmount();
    expect(activeCount()).toBe(0);
  });

  it('StrictMode double-mount leaves exactly one active subscription', async () => {
    const { adapter, activeCount } = createCountingAdapter();
    setAdapter(adapter);
    const client = new QueryClient();

    const { unmount } = renderHarness('u1', client, true);
    await waitFor(() => expect(activeCount()).toBe(1));

    unmount();
    expect(activeCount()).toBe(0);
  });

  it('writes every emission into the Query cache under the given key (setQueryData), never running its own queryFn', async () => {
    const rows = [{ id: 'e1' }];
    const adapter: Partial<StorageAdapter> = {
      subscribeToQuery: <T,>(_collection: string, _filters: unknown, callback: (data: T[]) => void) => {
        queueMicrotask(() => callback(rows as unknown as T[]));
        return () => {};
      },
    };
    setAdapter(adapter);
    const client = new QueryClient();
    renderHarness('u1', client);

    await waitFor(() => expect(client.getQueryData(['expenses', 'u1'])).toEqual(rows));
    const state = client.getQueryState(['expenses', 'u1']);
    expect(state?.fetchStatus).not.toBe('fetching');
  });

  it(
    'reports isError/error when the adapter forwards a query failure (coordinator review, plan B8b), ' +
      'and refetch() clears it by tearing down and re-subscribing',
    async () => {
      let subscribeCalls = 0;
      const adapter: Partial<StorageAdapter> = {
        subscribeToQuery: <T,>(_collection: string, _filters: unknown, callback: (data: T[], error?: unknown) => void) => {
          subscribeCalls += 1;
          if (subscribeCalls === 1) {
            queueMicrotask(() => callback([], new Error('permission denied for table expenses')));
          } else {
            queueMicrotask(() => callback([{ id: 'e1' }] as unknown as T[]));
          }
          return () => {};
        },
      };
      setAdapter(adapter);
      const client = new QueryClient();

      let latest: ReturnType<typeof useLiveQuery> | undefined;
      function ErrorHarness() {
        const result = useLiveQuery(['expenses', 'u1'], 'expenses', [{ field: 'memberIds', operator: 'array-contains', value: 'u1' }]);
        latest = result;
        return null;
      }
      render(
        <QueryClientProvider client={client}>
          <ErrorHarness />
        </QueryClientProvider>,
      );

      await waitFor(() => expect(latest?.isError).toBe(true));
      expect(latest?.error).toBeInstanceOf(Error);

      act(() => {
        latest?.refetch();
      });

      await waitFor(() => expect(latest?.isError).toBe(false));
      await waitFor(() => expect(latest?.data).toEqual([{ id: 'e1' }]));
      expect(subscribeCalls).toBe(2);
    },
  );
});
