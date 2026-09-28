import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $user } from '@/stores/session';
import { netBalances } from '@/domain/ledger';

/**
 * Plan B14a (risk:high, tdd-tier:strict; ADR 0014): a settlement is a payment
 * on a ledger. `settle()` is ONE insert into `settlements` — no batch, no
 * expense write, `settledAt` is never touched — and `remove()` undoes your own
 * attestation, with a fresh-read preflight and a post-delete re-read because a
 * denied `settlements_delete` is a silent 0-row result.
 *
 * Ports the intent of the legacy `context/__tests__/SettlementCurrency.test.tsx`
 * against the memory adapter, adapted to the ledger model: the currency is
 * stored on the settlement, "marks expenses as settled" becomes "leaves every
 * expense alone and moves the balance by exactly the paid amount", and
 * different currencies are converted like any expense.
 */
vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const settlements = await import('./settlements');
const expenses = await import('./expenses');
const { storageAdapter } = await import('@/lib/data/adapter');

function signIn(uid: string) {
  $user.set({ uid, email: null, displayName: null, photoURL: null, emailVerified: true });
}

function dinner(overrides: Record<string, unknown> = {}) {
  return {
    groupId: null as string | null,
    description: 'Dinner',
    amount: 90,
    currency: 'USD',
    paidBy: 'ana',
    splitType: 'equal' as const,
    splits: [
      { userId: 'ana', amount: 30 },
      { userId: 'beto', amount: 30 },
      { userId: 'carla', amount: 30 },
    ],
    date: '2026-09-28',
    memberIds: ['ana', 'beto', 'carla'],
    createdBy: 'ana',
    ...overrides,
  };
}

const PAY = { fromUserId: 'beto', toUserId: 'ana', amount: 30, currency: 'USD', date: '2026-09-29' };

beforeEach(() => {
  $user.set(null);
});

afterEach(() => {
  $user.set(null);
  vi.restoreAllMocks();
});

describe('repos.settlements.settle', () => {
  it('writes exactly one settlement document and nothing else: no batch, no expense update, no delete', async () => {
    const expense = await expenses.create(dinner());
    signIn('beto');
    const setSpy = vi.spyOn(storageAdapter!, 'setDocument');
    const updateSpy = vi.spyOn(storageAdapter!, 'updateDocument');
    const batchSpy = vi.spyOn(storageAdapter!, 'batchWrite');
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    const created = await settlements.settle(PAY);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(setSpy.mock.calls[0]![0]).toBe('settlements');
    expect(updateSpy).not.toHaveBeenCalled();
    expect(batchSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    // The expense it "covers" is untouched: settle-up never writes settledAt.
    const fresh = await expenses.get(expense.id);
    expect(fresh?.settledAt ?? null).toBeNull();
    expect(created.id).toBeTruthy();
  });

  it('returns the created row: identity from the session, memberIds are exactly the two parties, groupId stays null', async () => {
    signIn('beto');

    const created = await settlements.settle(PAY);

    expect(created).toMatchObject({
      fromUserId: 'beto',
      toUserId: 'ana',
      amount: 30,
      currency: 'USD',
      date: '2026-09-29',
      groupId: null,
      createdBy: 'beto',
      memberIds: ['beto', 'ana'],
    });
    expect(created.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await settlements.get(created.id)).toEqual(created);
  });

  it('takes createdBy from the session, never from the caller', async () => {
    signIn('beto');
    const created = await settlements.settle({ ...PAY, createdBy: 'ana', memberIds: ['x'], groupId: 'g1' } as never);
    expect(created).toMatchObject({ createdBy: 'beto', memberIds: ['beto', 'ana'], groupId: null });
  });

  it('writes the eventId when the scope is an event, and none otherwise', async () => {
    signIn('beto');
    const inEvent = await settlements.settle({ ...PAY, eventId: 'ev1' });
    const loose = await settlements.settle(PAY);
    expect(inEvent.eventId).toBe('ev1');
    expect(loose.eventId ?? null).toBeNull();
  });

  it('is signed-in only', async () => {
    await expect(settlements.settle(PAY)).rejects.toMatchObject({ name: 'NotSignedInError' });
  });

  it('refuses when the caller is neither party, before writing anything (RLS requires the creator to be a party)', async () => {
    signIn('carla');
    const setSpy = vi.spyOn(storageAdapter!, 'setDocument');

    await expect(settlements.settle(PAY)).rejects.toMatchObject({ name: 'SettlementPartyNotAllowedError' });

    expect(setSpy).not.toHaveBeenCalled();
  });

  it('Zod-validates first: nothing is written for an invalid input', async () => {
    signIn('beto');
    const setSpy = vi.spyOn(storageAdapter!, 'setDocument');
    await expect(settlements.settle({ ...PAY, toUserId: 'beto' })).rejects.toThrow();
    await expect(settlements.settle({ ...PAY, amount: 0 })).rejects.toThrow();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('a rejected write surfaces the error and leaves the expense and the settlement list untouched', async () => {
    const expense = await expenses.create(dinner({ description: 'Rejected-write dinner' }));
    signIn('beto');
    const before = (await settlements.listVisible()).length;
    vi.spyOn(storageAdapter!, 'setDocument').mockRejectedValueOnce(new Error('permission denied'));

    await expect(settlements.settle(PAY)).rejects.toThrow('permission denied');

    expect((await settlements.listVisible()).length).toBe(before);
    expect((await expenses.get(expense.id))?.settledAt ?? null).toBeNull();
  });

  describe('ported from SettlementCurrency.test.tsx, adapted to the ledger model', () => {
    it('stores the currency it was created with', async () => {
      signIn('beto');
      const created = await settlements.settle({ ...PAY, amount: 50, currency: 'EUR' });
      expect(created).toMatchObject({ amount: 50, currency: 'EUR' });
    });

    it('does not mark the expense settled; it moves the balance by exactly the paid amount', async () => {
      const expense = await expenses.create(dinner({ description: 'Ledger dinner', amount: 80, splits: [{ userId: 'ana', amount: 40 }, { userId: 'beto', amount: 40 }], memberIds: ['ana', 'beto'] }));
      signIn('beto');
      const scope = (rows: Awaited<ReturnType<typeof settlements.listVisible>>) => rows.filter((s) => s.memberIds.includes('beto') && s.memberIds.includes('ana'));
      const identity = (amount: number) => amount;

      const before = netBalances([expense], scope(await settlements.listVisible()), identity);
      await settlements.settle({ ...PAY, amount: 15 });
      const after = netBalances([expense], scope(await settlements.listVisible()), identity);

      expect(after.beto! - before.beto!).toBe(15);
      expect(after.ana! - before.ana!).toBe(-15);
      expect((await expenses.get(expense.id))?.settledAt ?? null).toBeNull();
    });

    it('supports settlements in different currencies, converted like any expense amount', async () => {
      signIn('beto');
      const usd = await settlements.settle({ ...PAY, amount: 10, currency: 'USD' });
      const eur = await settlements.settle({ ...PAY, amount: 10, currency: 'EUR' });
      const rows = (await settlements.listVisible()).filter((s) => [usd.id, eur.id].includes(s.id));
      const eurToUsd = (amount: number, currency: string) => (currency === 'EUR' ? amount * 1.1 : amount);

      expect(rows.map((s) => s.currency).sort()).toEqual(['EUR', 'USD']);
      expect(netBalances([], rows, eurToUsd).beto).toBe(21);
    });

    it('history lists settlements in both directions for both parties', async () => {
      signIn('beto');
      const out = await settlements.settle({ ...PAY, amount: 5 });
      signIn('ana');
      const back = await settlements.settle({ fromUserId: 'ana', toUserId: 'beto', amount: 2, currency: 'USD', date: '2026-09-30' });
      const ids = (await settlements.listVisible()).map((s) => s.id);
      expect(ids).toEqual(expect.arrayContaining([out.id, back.id]));
    });
  });

  it('the event scope lists only that event\'s settlements', async () => {
    signIn('beto');
    const inEvent = await settlements.settle({ ...PAY, eventId: 'scope-ev1', amount: 1 });
    await settlements.settle({ ...PAY, eventId: 'scope-ev2', amount: 2 });
    await settlements.settle({ ...PAY, amount: 3 });

    expect((await settlements.listForEvent('scope-ev1')).map((s) => s.id)).toEqual([inEvent.id]);
  });
});

describe('repos.settlements.remove', () => {
  it('lets the creator delete their own settlement', async () => {
    signIn('beto');
    const created = await settlements.settle(PAY);

    await settlements.remove(created.id);

    expect(await settlements.get(created.id)).toBeNull();
  });

  it('the preflight refuses a caller who did not create it, and deletes nothing', async () => {
    signIn('beto');
    const created = await settlements.settle(PAY);
    signIn('ana'); // the other party: may read it, may not delete it (creator-only, ADR 0014)
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');

    await expect(settlements.remove(created.id)).rejects.toMatchObject({ name: 'SettlementDeleteNotAllowedError' });

    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await settlements.get(created.id)).not.toBeNull();
  });

  it('throws a typed not-found error for an unknown id, without deleting', async () => {
    signIn('beto');
    const deleteSpy = vi.spyOn(storageAdapter!, 'deleteDocument');
    await expect(settlements.remove('does-not-exist')).rejects.toMatchObject({ name: 'SettlementNotFoundError' });
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it('reports failure honestly when the delete silently affects 0 rows and the settlement is still there', async () => {
    signIn('beto');
    const created = await settlements.settle(PAY);
    // RLS's silent 0-row delete: the call reports success, the row never left.
    vi.spyOn(storageAdapter!, 'deleteDocument').mockResolvedValue({ id: created.id, success: true });

    await expect(settlements.remove(created.id)).rejects.toMatchObject({ name: 'SettlementDeleteVerificationFailedError' });
  });

  it('is signed-in only', async () => {
    await expect(settlements.remove('any')).rejects.toMatchObject({ name: 'NotSignedInError' });
  });
});
