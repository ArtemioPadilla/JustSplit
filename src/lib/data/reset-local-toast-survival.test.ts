// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B17b amendment (cross-navigation toasts, ADR 0008): `resetLocalData()`
 * calls `reload()` right after its own result toast — exactly the shape
 * every other migrated call site has, so its own toast needs the same
 * `{ afterNavigation: true }` handoff. This file deliberately does NOT mock
 * `@/stores/notifications` (unlike `reset-local.test.ts`, which mocks it to
 * assert WHICH function was called) — it uses the real module so the
 * queued entry actually lands in `sessionStorage`, then asserts
 * `resetLocalData`'s OWN localStorage-clearing step does not also wipe it
 * (a real, easy-to-introduce regression: a broader prefix scan, or
 * clearing `sessionStorage` instead of/in addition to `localStorage`,
 * would silently eat the very toast reporting the reset's own result).
 */
const { del, keys, signOut } = vi.hoisted(() => ({
  del: vi.fn().mockResolvedValue(undefined),
  keys: vi.fn().mockResolvedValue([]),
  signOut: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('idb-keyval', () => ({ del, keys }));
vi.mock('@/stores/auth', () => ({ signOut }));

const { resetLocalData } = await import('./reset-local');

const PENDING_TOASTS_KEY = 'justsplit:pending-toasts';

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  localStorage.setItem('justsplit:preferredCurrency', 'USD');
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations: vi.fn().mockResolvedValue([]) },
  });
});

afterEach(() => {
  // @ts-expect-error -- test-only cleanup of the property this suite defines
  delete navigator.serviceWorker;
});

describe('resetLocalData — its own result toast survives the reset (real notifications.ts)', () => {
  it('the success toast is still readable in sessionStorage after every localStorage-clearing step has run', async () => {
    await resetLocalData({ reload: vi.fn() });

    // The clearing steps DID run (justsplit:* localStorage is gone)...
    expect(localStorage.getItem('justsplit:preferredCurrency')).toBeNull();
    // ...but the pending-toast queue (sessionStorage, not localStorage) is
    // untouched by them, and holds the reset's own "Local data reset" toast.
    const raw = sessionStorage.getItem(PENDING_TOASTS_KEY);
    expect(raw).not.toBeNull();
    const queue = JSON.parse(raw!);
    expect(queue).toEqual([{ kind: 'success', title: 'Local data reset', description: expect.any(String) }]);
  });

  it('the failure toast survives too, naming how many steps failed', async () => {
    signOut.mockRejectedValueOnce(new Error('network down'));

    await resetLocalData({ reload: vi.fn() });

    const queue = JSON.parse(sessionStorage.getItem(PENDING_TOASTS_KEY)!);
    expect(queue).toHaveLength(1);
    expect(queue[0].kind).toBe('error');
    expect(queue[0].title).toMatch(/errors/i);
  });
});
