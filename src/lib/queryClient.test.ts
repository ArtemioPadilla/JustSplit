import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { attachPersister, QueryCacheRestoreError } from './queryClient';

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
