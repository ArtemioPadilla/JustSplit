import { beforeEach, describe, expect, it, vi } from 'vitest';

const { del } = vi.hoisted(() => ({ del: vi.fn().mockResolvedValue(undefined) }));
vi.mock('idb-keyval', () => ({ del }));

import { clearPersistedQueryCache, JUSTSPLIT_QUERY_IDB_KEY } from './query-cache-key';
import * as queryClientModule from './queryClient';

describe('query-cache-key (plan B19: the sign-out wipe needs no Query client chunk)', () => {
  beforeEach(() => del.mockClear());

  it('deletes the shared persister key by default', async () => {
    await clearPersistedQueryCache();
    expect(del).toHaveBeenCalledWith('justsplit:query');
    expect(JUSTSPLIT_QUERY_IDB_KEY).toBe('justsplit:query');
  });

  it('queryClient re-exports the same key and wipe (one source of truth)', () => {
    expect(queryClientModule.JUSTSPLIT_QUERY_IDB_KEY).toBe(JUSTSPLIT_QUERY_IDB_KEY);
    expect(queryClientModule.clearPersistedQueryCache).toBe(clearPersistedQueryCache);
  });
});
