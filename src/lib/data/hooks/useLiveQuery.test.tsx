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

      // Pushed (not reassigned) during render — the react-hooks lint rule
      // forbids reassigning an outer-scope variable from a component body,
      // but appending to an array it doesn't own is fine (same pattern as
      // useDisplayConversion.test.tsx's render-log probe).
      const results: Array<ReturnType<typeof useLiveQuery<{ id: string }>>> = [];
      function ErrorHarness() {
        const result = useLiveQuery<{ id: string }>(['expenses', 'u1'], 'expenses', [
          { field: 'memberIds', operator: 'array-contains', value: 'u1' },
        ]);
        results.push(result);
        return null;
      }
      render(
        <QueryClientProvider client={client}>
          <ErrorHarness />
        </QueryClientProvider>,
      );

      await waitFor(() => expect(results.at(-1)?.isError).toBe(true));
      expect(results.at(-1)?.error).toBeInstanceOf(Error);

      act(() => {
        results.at(-1)?.refetch();
      });

      await waitFor(() => expect(results.at(-1)?.isError).toBe(false));
      await waitFor(() => expect(results.at(-1)?.data).toEqual([{ id: 'e1' }]));
      expect(subscribeCalls).toBe(2);
    },
  );

  it(
    'bounds refetch() to one in-flight retry (coordinator review, plan B8b): two rapid calls produce ' +
      'exactly one extra subscribe, and isRetrying clears on the next emission',
    async () => {
      let subscribeCalls = 0;
      const callbacks: Array<(data: unknown[], error?: unknown) => void> = [];
      const adapter: Partial<StorageAdapter> = {
        subscribeToQuery: (_collection, _filters, callback) => {
          subscribeCalls += 1;
          callbacks.push(callback as (data: unknown[], error?: unknown) => void);
          if (subscribeCalls === 1) callback([]); // initial mount emission only — the retry is held open on purpose
          return () => {};
        },
      };
      setAdapter(adapter);
      const client = new QueryClient();

      const results: Array<ReturnType<typeof useLiveQuery<{ id: string }>>> = [];
      function RetryHarness() {
        const result = useLiveQuery<{ id: string }>(['expenses', 'u1'], 'expenses', [
          { field: 'memberIds', operator: 'array-contains', value: 'u1' },
        ]);
        results.push(result);
        return null;
      }
      render(
        <QueryClientProvider client={client}>
          <RetryHarness />
        </QueryClientProvider>,
      );
      await waitFor(() => expect(results.at(-1)?.data).toEqual([]));
      expect(subscribeCalls).toBe(1);

      // Two rapid clicks as two SEPARATE events (not one synchronous batch —
      // React would collapse two same-tick generation bumps into a single
      // effect re-run regardless of any bounding, which would not exercise
      // the real scenario: a second click landing on a LATER render while
      // the first retry's subscription is still open and unresolved).
      act(() => {
        results.at(-1)?.refetch(); // click 1 — opens the retry subscription
      });
      expect(subscribeCalls).toBe(2);
      expect(results.at(-1)?.isRetrying).toBe(true);

      act(() => {
        results.at(-1)?.refetch(); // click 2, rapid — the click-1 retry has not resolved yet (mock holds it open)
      });

      expect(subscribeCalls).toBe(2); // still 2 — click 2 must be a no-op, not a second retry subscription
      expect(results.at(-1)?.isRetrying).toBe(true);

      // The retried subscription's first emission resolves the retry.
      act(() => {
        callbacks[1]!([{ id: 'e1' }]);
      });

      expect(results.at(-1)?.isRetrying).toBe(false);
      expect(results.at(-1)?.data).toEqual([{ id: 'e1' }]);

      // A later refetch() is not permanently blocked by the earlier bound.
      act(() => {
        results.at(-1)?.refetch();
      });
      expect(subscribeCalls).toBe(3);
    },
  );
});
