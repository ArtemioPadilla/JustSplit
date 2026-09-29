import { QueryClient, QueryObserver, onlineManager } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OfflineWriteError } from './offline-write';
import { attachPersister, createQueryClient, QueryCacheRestoreError } from './queryClient';

/**
 * Plan B17b, ADR 0008: a failed persister hydration must be detectable by
 * the caller (QueryProvider), not just swallowed. `persistQueryClient`
 * (@tanstack/query-persist-client-core) returns `[unsubscribe, Promise<void>]`
 * — the restore promise rejects when `persister.restoreClient()` throws
 * (persist.js: it re-throws after calling `persister.removeClient()`).
 * `attachPersister` previously discarded that second element entirely
 * (an unhandled rejection AND no way for QueryProvider to know).
 */
function flakyPersister(restoreError: unknown) {
  return {
    persistClient: vi.fn().mockResolvedValue(undefined),
    restoreClient: vi.fn().mockRejectedValue(restoreError),
    removeClient: vi.fn().mockResolvedValue(undefined),
  };
}

describe('attachPersister restore-failure reporting', () => {
  it('calls onRestoreError with a QueryCacheRestoreError when persister.restoreClient() rejects', async () => {
    const client = new QueryClient();
    const onRestoreError = vi.fn();
    const persister = flakyPersister(new Error('idb blocked'));

    attachPersister(client, { persister, onRestoreError });

    // The rejection is asynchronous (persistQueryClientRestore awaits
    // persister.restoreClient()) — wait a microtask turn for it to surface.
    await vi.waitFor(() => expect(onRestoreError).toHaveBeenCalledTimes(1));

    const error = onRestoreError.mock.calls[0][0];
    expect(error).toBeInstanceOf(QueryCacheRestoreError);
    expect(error.cause).toBeInstanceOf(Error);
  });

  it('does not call onRestoreError when the persister restores cleanly', async () => {
    const client = new QueryClient();
    const onRestoreError = vi.fn();
    const persister = {
      persistClient: vi.fn().mockResolvedValue(undefined),
      restoreClient: vi.fn().mockResolvedValue(undefined),
      removeClient: vi.fn().mockResolvedValue(undefined),
    };

    const detach = attachPersister(client, { persister, onRestoreError });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onRestoreError).not.toHaveBeenCalled();
    detach();
  });

  it('the returned unsubscribe function still works after a restore failure', async () => {
    const client = new QueryClient();
    const persister = flakyPersister(new Error('idb blocked'));

    const detach = attachPersister(client, { persister, onRestoreError: vi.fn() });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(() => detach()).not.toThrow();
  });
});

/**
 * Plan B19c (risk:high, ADR 0015): "never queue writes silently". TanStack Query's default
 * `networkMode: 'online'` PAUSES a mutation started while its `onlineManager` says offline, without
 * ever calling `mutationFn`, and RESUMES it when the connection returns. That is an offline write
 * queue: the data layer's own guard (which lives inside `mutationFn`) would never run, and a save the
 * person believed failed could be replayed later. Mutations therefore run whatever the connection
 * (`networkMode: 'always'`), so the guard refuses them; queries keep pausing offline and serve the cache.
 */
describe('createQueryClient network mode (plan B19c)', () => {
  afterEach(() => {
    onlineManager.setOnline(true);
  });

  it('the library default would pause the mutation and never call mutationFn (why the override exists)', () => {
    onlineManager.setOnline(false);
    const client = new QueryClient();
    const mutationFn = vi.fn().mockResolvedValue('saved');
    const mutation = client.getMutationCache().build(client, { mutationFn });
    void mutation.execute(undefined).catch(() => {});
    expect(mutation.state.isPaused).toBe(true);
    expect(mutationFn).not.toHaveBeenCalled();
  });

  it('runs a mutation offline so the data layer can refuse it: it rejects with OfflineWriteError, is never paused, and nothing is replayed on reconnect', async () => {
    onlineManager.setOnline(false);
    const client = createQueryClient();
    const mutationFn = vi.fn().mockRejectedValue(new OfflineWriteError());
    const mutation = client.getMutationCache().build(client, { mutationFn });

    await expect(mutation.execute(undefined)).rejects.toBeInstanceOf(OfflineWriteError);
    expect(mutationFn).toHaveBeenCalledTimes(1);
    expect(mutation.state.isPaused).toBe(false);
    expect(mutation.state.status).toBe('error');

    onlineManager.setOnline(true);
    await client.resumePausedMutations();
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });

  it('queries still pause offline, so reads are served from the cache instead of failing', () => {
    onlineManager.setOnline(false);
    const client = createQueryClient();
    const queryFn = vi.fn().mockResolvedValue('fresh');
    const observer = new QueryObserver(client, { queryKey: ['expenses'], queryFn });
    const unsubscribe = observer.subscribe(() => {});
    expect(observer.getCurrentResult().fetchStatus).toBe('paused');
    expect(queryFn).not.toHaveBeenCalled();
    unsubscribe();
  });
});
