// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';
import { restoreOnLine, setOnLine } from '@/tests/offline-helpers';

/**
 * Plan B19c (risk:high, ADR 0015): defence in depth behind the disabled
 * controls. Every write entry point of the data layer refuses while
 * `navigator.onLine === false`, throwing the typed `OfflineWriteError` BEFORE
 * any network call: no adapter read, no adapter write, no storage call, no RPC.
 * That is what stops a control someone forgot to disable from half-applying a
 * multi-step write (receipts, then the row). UX and integrity only: RLS stays
 * the authority (CLAUDE.md rule 8), and a `true` from `onLine` never blocks.
 */
const { requireSupabase } = vi.hoisted(() => ({ requireSupabase: vi.fn() }));
vi.mock('@/lib/data/client', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/lib/data/client')>()), requireSupabase }));

const auth = vi.hoisted(() => ({
  authAdapter: { updatePassword: vi.fn(), updateDisplayProfile: vi.fn(), signOut: vi.fn() },
  profileStore: { update: vi.fn(), get: vi.fn() },
}));

vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter(), authAdapter: auth.authAdapter, profileStore: auth.profileStore };
});

const { OfflineWriteError } = await import('@/lib/offline-write');
const { storageAdapter } = await import('@/lib/data/adapter');
const expenses = await import('./repos/expenses');
const groups = await import('./repos/groups');
const events = await import('./repos/events');
const friendships = await import('./repos/friendships');
const settlements = await import('./repos/settlements');
const storage = await import('./storage');
const authStore = await import('@/stores/auth');

const adapter = storageAdapter!;
const ADAPTER_METHODS = ['getDocument', 'query', 'setDocument', 'updateDocument', 'deleteDocument', 'batchWrite'] as const;

/** Deliberately invalid inputs: the guard runs first, so parsing never gets a say. */
const junk = {} as never;
const blob = new Blob(['x'], { type: 'image/jpeg' });

const WRITES: ReadonlyArray<readonly [string, () => Promise<unknown>]> = [
  ['expenses.create', () => expenses.create(junk)],
  ['expenses.update', () => expenses.update('e1', { description: 'x' })],
  ['expenses.createWithReceipts', () => expenses.createWithReceipts('e1', junk, [blob])],
  ['expenses.addReceipts', () => expenses.addReceipts('e1', [blob])],
  ['expenses.removeReceipt', () => expenses.removeReceipt('e1', 'expenses/e1/a.jpg')],
  ['expenses.remove', () => expenses.remove('e1')],
  ['groups.create', () => groups.create(junk)],
  ['groups.update', () => groups.update('g1', { name: 'x' })],
  ['groups.remove', () => groups.remove('g1')],
  ['groups.attachExpenses', () => groups.attachExpenses('g1', ['e1'])],
  ['groups.attachEvents', () => groups.attachEvents('g1', ['ev1'])],
  ['events.create', () => events.create(junk)],
  ['events.update', () => events.update('ev1', { name: 'x' })],
  ['events.remove', () => events.remove('ev1')],
  ['friendships.create', () => friendships.create(junk)],
  ['friendships.update', () => friendships.update('f1', { status: 'accepted' })],
  ['friendships.remove', () => friendships.remove('f1')],
  ['friendships.request', () => friendships.request('u1', 'u2')],
  ['settlements.create', () => settlements.create(junk)],
  ['settlements.settle', () => settlements.settle(junk)],
  ['settlements.remove', () => settlements.remove('s1')],
  ['storage.uploadReceipt', () => storage.uploadReceipt('e1', blob)],
  ['storage.uploadAvatar', () => storage.uploadAvatar('u1', blob)],
  ['storage.removeReceipts', () => storage.removeReceipts('e1')],
  ['storage.removeAvatar', () => storage.removeAvatar('avatars/u1/a.jpg')],
  ['storage.removeReceiptObject', () => storage.removeReceiptObject('expenses/e1/a.jpg')],
  ['auth.updateProfile', () => authStore.updateProfile({ name: 'x' })],
  ['auth.updatePassword', () => authStore.updatePassword('a-long-enough-password')],
  ['auth.updateDisplayProfile', () => authStore.updateDisplayProfile({ displayName: 'x' })],
];

beforeEach(() => {
  $user.set({ uid: 'u1', email: null, displayName: null, photoURL: null, emailVerified: true });
});

afterEach(() => {
  restoreOnLine();
  $user.set(null);
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function spyEverything() {
  return ADAPTER_METHODS.map((name) => vi.spyOn(adapter, name));
}

function networkCalls() {
  return [
    requireSupabase,
    auth.authAdapter.updatePassword,
    auth.authAdapter.updateDisplayProfile,
    auth.profileStore.update,
    auth.profileStore.get,
  ];
}

describe('the data layer refuses a write while offline', () => {
  it.each(WRITES)('%s throws OfflineWriteError and touches nothing', async (_name, write) => {
    const spies = spyEverything();
    setOnLine(false);

    await expect(write()).rejects.toBeInstanceOf(OfflineWriteError);

    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    for (const call of networkCalls()) expect(call).not.toHaveBeenCalled();
  });

  it('a multi-step write (receipts then row) never starts its first step', async () => {
    const spies = spyEverything();
    setOnLine(false);
    await expect(expenses.createWithReceipts('e1', junk, [blob, blob])).rejects.toBeInstanceOf(OfflineWriteError);
    // Not even the "does the row already exist?" read that would precede the insert.
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(requireSupabase).not.toHaveBeenCalled();
  });

  it('writes go through again the moment the browser is back online (no state to reset)', async () => {
    setOnLine(false);
    await expect(events.remove('ev1')).rejects.toBeInstanceOf(OfflineWriteError);
    setOnLine(true);
    const remove = vi.spyOn(adapter, 'deleteDocument');
    await expect(events.remove('ev1')).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('reads are untouched while offline (they serve the cache, or fail on their own)', async () => {
    setOnLine(false);
    await expect(expenses.get('nope')).resolves.toBeNull();
    await expect(groups.listForUser('u1')).resolves.toEqual([]);
    await expect(settlements.listVisible()).resolves.toEqual([]);
  });

  it('an unreadable onLine never blocks a write', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => undefined });
    await expect(events.remove('ev1')).resolves.toBeUndefined();
  });
});
