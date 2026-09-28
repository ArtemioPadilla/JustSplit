// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B17b: "Restablecer datos locales" — clears every trace of the
 * signed-in user's data from this device (idb-keyval Query persister,
 * `justsplit:*` localStorage, the Supabase session via the existing
 * `stores/auth` signOut path, and any registered service worker), then
 * reloads to `withBase('/')`. Resilient by design: one failing step must
 * never skip the rest.
 */
const { del, keys, signOut } = vi.hoisted(() => ({
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('idb-keyval', () => ({ del, keys }));
vi.mock('@/stores/auth', () => ({ signOut }));
vi.mock('@/stores/notifications', () => ({
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
}));

const { notifyError, notifySuccess } = await import('@/stores/notifications');
const { resetLocalData } = await import('./reset-local');

function setLocalStorageFixture(entries: Record<string, string>) {
  localStorage.clear();
  for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
}

describe('resetLocalData', () => {
  let registrations: { unregister: ReturnType<typeof vi.fn> }[];
  let getRegistrations: ReturnType<typeof vi.fn>;
  let reload: ReturnType<typeof vi.fn<(url: string) => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    setLocalStorageFixture({
      'justsplit:preferredCurrency': 'USD',
      'justsplit:rates': '{}',
      'sb-abc123-auth-token': '{"access_token":"x"}',
      'unrelated-app:setting': 'keep-me',
    });
    registrations = [{ unregister: vi.fn().mockResolvedValue(true) }, { unregister: vi.fn().mockResolvedValue(true) }];
    getRegistrations = vi.fn().mockResolvedValue(registrations);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations },
    });
    reload = vi.fn();
  });

  afterEach(() => {
    // @ts-expect-error -- test-only cleanup of the property this suite defines
    delete navigator.serviceWorker;
  });

  it('signs out first, then clears the idb-keyval query cache and any justsplit:* idb key', async () => {
    keys.mockResolvedValue(['justsplit:query', 'justsplit:rates-cache', 'other-app:key']);

    await resetLocalData({ reload });

    expect(signOut).toHaveBeenCalledTimes(1);
    // The explicit shared key, the Inceptor default, AND every justsplit:*
    // key keys() found — all three sub-steps, defensively (plan B17b).
    expect(del).toHaveBeenCalledWith('justsplit:query');
    expect(del).toHaveBeenCalledWith('tanstack-query-cache');
    expect(del).toHaveBeenCalledWith('justsplit:rates-cache');
    expect(del).not.toHaveBeenCalledWith('other-app:key');
  });

  it('clears every justsplit:* localStorage key and every sb-* supabase session key, leaving unrelated keys alone', async () => {
    await resetLocalData({ reload });

    expect(localStorage.getItem('justsplit:preferredCurrency')).toBeNull();
    expect(localStorage.getItem('justsplit:rates')).toBeNull();
    expect(localStorage.getItem('sb-abc123-auth-token')).toBeNull();
    expect(localStorage.getItem('unrelated-app:setting')).toBe('keep-me');
  });

  it('unregisters every service worker registration', async () => {
    await resetLocalData({ reload });

    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(registrations[0]!.unregister).toHaveBeenCalledTimes(1);
    expect(registrations[1]!.unregister).toHaveBeenCalledTimes(1);
  });

  it('reloads to withBase(\'/\') as the final step', async () => {
    await resetLocalData({ reload });
    expect(reload).toHaveBeenCalledWith('/');
  });

  it('reports full success with notifySuccess when every step succeeds', async () => {
    const result = await resetLocalData({ reload });

    expect(result.ok).toBe(true);
    expect(result.failures).toEqual([]);
    expect(notifySuccess).toHaveBeenCalledTimes(1);
    expect(notifyError).not.toHaveBeenCalled();
  });

  it('one failing step does not skip the rest, and is honestly reported — never claims a full reset', async () => {
    signOut.mockRejectedValueOnce(new Error('network down'));

    const result = await resetLocalData({ reload });

    // Sign-out failed, but every other step still ran.
    expect(del).toHaveBeenCalledWith('justsplit:query');
    expect(localStorage.getItem('justsplit:preferredCurrency')).toBeNull();
    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledWith('/');

    expect(result.ok).toBe(false);
    expect(result.failures.map((f) => f.step)).toContain('sign-out');
    expect(notifyError).toHaveBeenCalledTimes(1);
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it('is resilient even when navigator.serviceWorker is unsupported', async () => {
    // @ts-expect-error -- test-only removal to simulate an unsupported browser
    delete navigator.serviceWorker;

    const result = await resetLocalData({ reload });

    expect(result.ok).toBe(true);
    expect(reload).toHaveBeenCalledWith('/');
  });
});
