import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B5a: `profiles` is not a SchemaMap collection (spec D10) — cross-user
 * lookup goes through the two B2 RPC functions via `client.ts`'s typed `rpc`
 * helper, never `adapter.<method>('profiles', ...)`.
 */
const rpcMock = vi.fn();
vi.mock('../client', async (importOriginal) => ({ ...(await importOriginal<typeof import('../client')>()), rpc: rpcMock }));

const profiles = await import('./profiles');
const { LookupRateLimitedError } = await import('../client');

beforeEach(() => {
  rpcMock.mockClear();
});

describe('repos.profiles', () => {
  it('byEmail calls find_profile_by_email and returns the first row, or null', async () => {
    rpcMock.mockResolvedValueOnce([{ id: 'u1', name: 'Ada', avatarUrl: null }]);
    expect(await profiles.byEmail('ada@example.com')).toEqual({ id: 'u1', name: 'Ada', avatarUrl: null });
    expect(rpcMock).toHaveBeenCalledWith('find_profile_by_email', { p_email: 'ada@example.com' });

    rpcMock.mockResolvedValueOnce([]);
    expect(await profiles.byEmail('nobody@example.com')).toBeNull();
  });

  it('byEmail lets the typed LookupRateLimitedError through (ADR 0013), and repos re-exports it', async () => {
    rpcMock.mockRejectedValueOnce(new LookupRateLimitedError());
    await expect(profiles.byEmail('ada@example.com')).rejects.toBeInstanceOf(profiles.LookupRateLimitedError);
    expect(profiles.LookupRateLimitedError).toBe(LookupRateLimitedError);
  });

  it('byIds calls find_profiles_by_ids and returns every row', async () => {
    rpcMock.mockResolvedValueOnce([
      { id: 'u1', name: 'Ada', avatarUrl: null },
      { id: 'u2', name: 'Bea', avatarUrl: null },
    ]);
    const rows = await profiles.byIds(['u1', 'u2']);
    expect(rows).toHaveLength(2);
    expect(rpcMock).toHaveBeenCalledWith('find_profiles_by_ids', { ids: ['u1', 'u2'] });
  });

  it('byIds returns [] for an empty id list without calling the RPC (nothing to look up)', async () => {
    const rows = await profiles.byIds([]);
    expect(rows).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
