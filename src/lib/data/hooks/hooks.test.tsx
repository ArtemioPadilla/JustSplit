// @vitest-environment jsdom
import * as React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Plan B5a: the per-collection hooks are thin wrappers — `useLiveQuery`
 * itself is exhaustively tested in `useLiveQuery.test.tsx`. These tests spy
 * on `useLiveQuery`/the repos to prove the WIRING (which collection, which
 * filters, `persist: true`, mutation invalidation), not the subscription
 * mechanics again.
 */
const liveQuerySpy = vi.fn((..._args: unknown[]) => ({ data: undefined }));
vi.mock('./useLiveQuery', () => ({ useLiveQuery: liveQuerySpy }));

const expensesRepo = {
  // ADR 0013: visibility is RLS's job (member_ids OR group OR event), so the
  // "my expenses" subscription carries NO filter.
  visibleFilters: vi.fn(() => []),
  forGroupFilters: vi.fn((groupId: string) => [{ field: 'groupId', operator: '==', value: groupId }]),
  create: vi.fn(async (input: unknown) => ({ id: 'e1', ...(input as object) })),
  get: vi.fn(async (id: string) => ({ id, description: 'Tacos' })),
  update: vi.fn(async (id: string, patch: object) => ({ id, ...patch })),
  remove: vi.fn(async () => undefined),
  createWithReceipts: vi.fn(async (id: string, input: unknown) => ({
    expense: { id, ...(input as object) },
    failedUploadCount: 0,
  })),
  addReceipts: vi.fn(async (id: string) => ({ expense: { id, images: ['expenses/e1/a.jpg'] }, failedUploadCount: 0 })),
  removeReceipt: vi.fn(async (id: string) => ({ id, images: [] })),
};
vi.mock('../repos/expenses', () => expensesRepo);

class FriendshipAlreadyExistsError extends Error {}
const friendshipsRepo = {
  forUserFilters: vi.fn((uid: string) => [{ field: 'users', operator: 'array-contains', value: uid }]),
  update: vi.fn(async (id: string, patch: object) => ({ id, ...patch })),
  remove: vi.fn(async () => undefined),
  request: vi.fn(async (fromUid: string, toUid: string) => ({
    id: 'f1',
    users: [fromUid, toUid],
    status: 'pending',
    requestedBy: fromUid,
  })),
  FriendshipAlreadyExistsError,
};
vi.mock('../repos/friendships', () => friendshipsRepo);

const groupsRepo = {
  forUserFilters: vi.fn((uid: string) => [{ field: 'memberIds', operator: 'array-contains', value: uid }]),
  get: vi.fn(async (id: string) => ({ id, name: 'Group' })),
  create: vi.fn(async (input: unknown) => ({ id: 'g1', ...(input as object) })),
  update: vi.fn(async (id: string, patch: object) => ({ id, ...patch })),
  remove: vi.fn(async () => undefined),
  attachExpenses: vi.fn(async () => ({ attached: ['e1'], skipped: [] })),
  attachEvents: vi.fn(async () => ({ attached: ['ev1'], skipped: [] })),
};
vi.mock('../repos/groups', () => groupsRepo);

const profilesRepo = {
  byIds: vi.fn(async (ids: string[]) => ids.map((id) => ({ id, name: id, avatarUrl: null }))),
  byEmail: vi.fn(async (email: string) => (email === 'unregistered@example.com' ? null : { id: 'p1', name: 'Ada', avatarUrl: null })),
};
vi.mock('../repos/profiles', () => profilesRepo);

const eventsRepo = {
  forGroupFilters: vi.fn((groupId: string) => [{ field: 'groupId', operator: '==', value: groupId }]),
  get: vi.fn(async (id: string) => ({ id, name: 'Trip' })),
  create: vi.fn(async (input: unknown) => ({ id: 'ev1', ...(input as object) })),
  update: vi.fn(async (id: string, patch: object) => ({ id, ...patch })),
};
vi.mock('../repos/events', () => eventsRepo);

const settlementsRepo = {
  visibleFilters: vi.fn(() => []),
  forEventFilters: vi.fn((eventId: string) => [{ field: 'eventId', operator: '==', value: eventId }]),
  settle: vi.fn(async (input: unknown) => ({ id: 's1', ...(input as object) })),
  remove: vi.fn(async () => undefined),
};
vi.mock('../repos/settlements', () => settlementsRepo);

const { useExpenses, useGroupExpenses } = await import('./useExpenses');
const { useExpense } = await import('./useExpense');
const { useGroup } = await import('./useGroup');
const { useGroupEvents } = await import('./useEvents');
const { useEvent } = await import('./useEvent');
const { useCreateEvent } = await import('./useCreateEvent');
const { useUpdateEvent } = await import('./useUpdateEvent');
const { useCreateExpense } = await import('./useCreateExpense');
const { useUpdateExpense } = await import('./useUpdateExpense');
const { useDeleteExpense } = await import('./useDeleteExpense');
const { useProfiles } = await import('./useProfiles');
const { useSettlements, useEventSettlements } = await import('./useSettlements');
const { useSettleUp } = await import('./useSettleUp');
const { useRemoveSettlement } = await import('./useRemoveSettlement');
const { useFriends } = await import('./useFriends');
const { useUpdateFriendshipStatus } = await import('./useUpdateFriendshipStatus');
const { useRemoveFriendship } = await import('./useRemoveFriendship');
const { useSendFriendRequest } = await import('./useSendFriendRequest');
const { useCreateExpenseWithReceipts } = await import('./useCreateExpenseWithReceipts');
const { useAddReceipts } = await import('./useAddReceipts');
const { useRemoveReceipt } = await import('./useRemoveReceipt');
const { useGroups } = await import('./useGroups');
const { useCreateGroup } = await import('./useCreateGroup');
const { useUpdateGroup } = await import('./useUpdateGroup');
const { useDeleteGroup } = await import('./useDeleteGroup');
const { useAttachExpensesToGroup } = await import('./useAttachExpensesToGroup');
const { useAttachEventsToGroup } = await import('./useAttachEventsToGroup');

function withClient(node: React.ReactElement, client = new QueryClient()) {
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useExpenses / useGroupExpenses', () => {
  it("useExpenses(uid) subscribes 'expenses' with NO memberIds filter (every visible row, ADR 0013), keyed per user and persisted", () => {
    function Probe() {
      useExpenses('u1');
      return null;
    }
    withClient(<Probe />);
    expect(expensesRepo.visibleFilters).toHaveBeenCalled();
    expect(liveQuerySpy).toHaveBeenCalledWith(['expenses', 'u1'], 'expenses', [], {
      enabled: true,
      persist: true,
    });
  });

  it('useExpenses(undefined) is disabled (no signed-in user yet)', () => {
    function Probe() {
      useExpenses(undefined);
      return null;
    }
    withClient(<Probe />);
    const [, , , options] = liveQuerySpy.mock.calls[0]!;
    expect((options as { enabled: boolean }).enabled).toBe(false);
  });

  it("useGroupExpenses(groupId) subscribes 'expenses' with the groupId==id filter", () => {
    function Probe() {
      useGroupExpenses('g1');
      return null;
    }
    withClient(<Probe />);
    expect(liveQuerySpy).toHaveBeenCalledWith(['expenses', 'group', 'g1'], 'expenses', expensesRepo.forGroupFilters('g1'), {
      enabled: true,
      persist: true,
    });
  });
});

describe('useGroupEvents', () => {
  it("subscribes 'events' with the groupId==id filter (plan text explicitly names this hook)", () => {
    function Probe() {
      useGroupEvents('g1');
      return null;
    }
    withClient(<Probe />);
    expect(liveQuerySpy).toHaveBeenCalledWith(['events', 'group', 'g1'], 'events', eventsRepo.forGroupFilters('g1'), {
      enabled: true,
      persist: true,
    });
  });
});

describe('useSettlements (plan B8b — same pattern as useExpenses/useEvents)', () => {
  it("subscribes 'settlements' with NO memberIds filter (every visible row, ADR 0013), keyed per user and persisted", () => {
    function Probe() {
      useSettlements('u1');
      return null;
    }
    withClient(<Probe />);
    expect(settlementsRepo.visibleFilters).toHaveBeenCalled();
    expect(liveQuerySpy).toHaveBeenCalledWith(['settlements', 'u1'], 'settlements', [], {
      enabled: true,
      persist: true,
    });
  });

  it('useSettlements(undefined) is disabled (no signed-in user yet)', () => {
    function Probe() {
      useSettlements(undefined);
      return null;
    }
    withClient(<Probe />);
    const [, , , options] = liveQuerySpy.mock.calls[0]!;
    expect((options as { enabled: boolean }).enabled).toBe(false);
  });
});

describe('useEventSettlements (plan B14a — mirrors useEventExpenses)', () => {
  it("subscribes 'settlements' where eventId == id, keyed per event and persisted", () => {
    function Probe() {
      useEventSettlements('ev1');
      return null;
    }
    withClient(<Probe />);
    expect(settlementsRepo.forEventFilters).toHaveBeenCalledWith('ev1');
    expect(liveQuerySpy).toHaveBeenCalledWith(
      ['settlements', 'event', 'ev1'],
      'settlements',
      [{ field: 'eventId', operator: '==', value: 'ev1' }],
      { enabled: true, persist: true },
    );
  });

  it('useEventSettlements(undefined) is disabled and carries no filter', () => {
    function Probe() {
      useEventSettlements(undefined);
      return null;
    }
    withClient(<Probe />);
    const [, , filters, options] = liveQuerySpy.mock.calls[0]!;
    expect(filters).toEqual([]);
    expect((options as { enabled: boolean }).enabled).toBe(false);
  });
});

describe('useSettleUp / useRemoveSettlement (plan B14a)', () => {
  it('useSettleUp calls repos.settlements.settle (one write) and invalidates the settlements queries only', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const input = { fromUserId: 'u2', toUserId: 'u1', amount: 30, currency: 'USD', date: '2026-09-29' };
    let settled = false;
    function Probe() {
      const mutation = useSettleUp();
      React.useEffect(() => {
        void mutation.mutateAsync(input).then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(settlementsRepo.settle).toHaveBeenCalledWith(input));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['settlements'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['expenses'] });
  });

  it('useRemoveSettlement calls repos.settlements.remove and invalidates the settlements queries', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let settled = false;
    function Probe() {
      const mutation = useRemoveSettlement();
      React.useEffect(() => {
        void mutation.mutateAsync('s1').then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(settlementsRepo.remove).toHaveBeenCalledWith('s1'));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['settlements'] });
  });
});

describe('useExpense (non-live detail query, plan B9)', () => {
  it('fetches through repos.expenses.get, keyed by id', async () => {
    function Probe({ onData }: { onData: (d: unknown) => void }) {
      const { data } = useExpense('e1');
      React.useEffect(() => {
        if (data) onData(data);
      }, [data, onData]);
      return null;
    }
    const onData = vi.fn();
    withClient(<Probe onData={onData} />);
    await waitFor(() => expect(expensesRepo.get).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(onData).toHaveBeenCalledWith({ id: 'e1', description: 'Tacos' }));
  });

  it('is disabled (never calls repos.expenses.get) while id is undefined', () => {
    function Probe() {
      useExpense(undefined);
      return null;
    }
    withClient(<Probe />);
    expect(expensesRepo.get).not.toHaveBeenCalled();
  });
});

describe('useEvent (non-live detail query, plan B9)', () => {
  it('fetches through repos.events.get, keyed by id', async () => {
    function Probe({ onData }: { onData: (d: unknown) => void }) {
      const { data } = useEvent('ev1');
      React.useEffect(() => {
        if (data) onData(data);
      }, [data, onData]);
      return null;
    }
    const onData = vi.fn();
    withClient(<Probe onData={onData} />);
    await waitFor(() => expect(eventsRepo.get).toHaveBeenCalledWith('ev1'));
    await waitFor(() => expect(onData).toHaveBeenCalledWith({ id: 'ev1', name: 'Trip' }));
  });

  it('is disabled (never calls repos.events.get) while id is undefined', () => {
    function Probe() {
      useEvent(undefined);
      return null;
    }
    withClient(<Probe />);
    expect(eventsRepo.get).not.toHaveBeenCalled();
  });
});

describe('useGroups (plan B12 — the list island\'s live query)', () => {
  it("subscribes 'expense_groups' with the memberIds array-contains filter, persisted", () => {
    function Probe() {
      useGroups('u1');
      return null;
    }
    withClient(<Probe />);
    expect(liveQuerySpy).toHaveBeenCalledWith(['groups', 'u1'], 'expense_groups', groupsRepo.forUserFilters('u1'), {
      enabled: true,
      persist: true,
    });
  });

  it('useGroups(undefined) is disabled (no signed-in user yet)', () => {
    function Probe() {
      useGroups(undefined);
      return null;
    }
    withClient(<Probe />);
    const [, , , options] = liveQuerySpy.mock.calls[0]!;
    expect((options as { enabled: boolean }).enabled).toBe(false);
  });
});

describe('useGroup (non-live detail query)', () => {
  it('fetches through repos.groups.get, keyed by id', async () => {
    function Probe({ onData }: { onData: (d: unknown) => void }) {
      const { data } = useGroup('g1');
      React.useEffect(() => {
        if (data) onData(data);
      }, [data, onData]);
      return null;
    }
    const onData = vi.fn();
    withClient(<Probe onData={onData} />);
    await waitFor(() => expect(groupsRepo.get).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(onData).toHaveBeenCalledWith({ id: 'g1', name: 'Group' }));
  });
});

describe('useCreateExpense', () => {
  it('calls repos.expenses.create and invalidates the affected query keys on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useCreateExpense();
      React.useEffect(() => {
        void mutation.mutateAsync({ description: 'Tacos' } as never).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.create).toHaveBeenCalled());
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'e1' }));
    expect(invalidateSpy).toHaveBeenCalled();
  });
});

describe('useUpdateExpense (plan B9)', () => {
  it('calls repos.expenses.update and invalidates the affected query keys on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useUpdateExpense();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'e1', patch: { description: 'Pizza' } }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.update).toHaveBeenCalledWith('e1', { description: 'Pizza' }));
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'e1', description: 'Pizza' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
  });
});

describe('useDeleteExpense (plan B9)', () => {
  it('calls repos.expenses.remove and invalidates the affected query keys on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let settled = false;
    function Probe() {
      const mutation = useDeleteExpense();
      React.useEffect(() => {
        void mutation.mutateAsync('e1').then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.remove).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
  });
});

describe('useProfiles', () => {
  it('sorts and de-duplicates ids into the query key, and calls repos.profiles.byIds', async () => {
    function Probe() {
      useProfiles(['b', 'a', 'a']);
      return null;
    }
    withClient(<Probe />);
    await waitFor(() => expect(profilesRepo.byIds).toHaveBeenCalledWith(['a', 'b']));
  });

  it('is disabled (no fetch) for an empty id list', () => {
    function Probe() {
      useProfiles([]);
      return null;
    }
    withClient(<Probe />);
    expect(profilesRepo.byIds).not.toHaveBeenCalled();
  });
});

describe('useFriends (plan B10 — B13\'s ADR hook, needed early by the expense form\'s participant picker)', () => {
  it("useFriends(uid) subscribes 'friendships' with the users array-contains filter, persisted", () => {
    function Probe() {
      useFriends('u1');
      return null;
    }
    withClient(<Probe />);
    expect(liveQuerySpy).toHaveBeenCalledWith(['friendships', 'u1'], 'friendships', friendshipsRepo.forUserFilters('u1'), {
      enabled: true,
      persist: true,
    });
  });

  it('useFriends(undefined) is disabled (no signed-in user yet)', () => {
    function Probe() {
      useFriends(undefined);
      return null;
    }
    withClient(<Probe />);
    const [, , , options] = liveQuerySpy.mock.calls[0]!;
    expect((options as { enabled: boolean }).enabled).toBe(false);
  });
});

describe('useCreateExpenseWithReceipts (plan B10)', () => {
  it('calls repos.expenses.createWithReceipts and invalidates the affected query keys on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useCreateExpenseWithReceipts();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'e1', input: { groupId: 'g1' } as never, files: [] }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.createWithReceipts).toHaveBeenCalledWith('e1', { groupId: 'g1' }, []));
    await waitFor(() => expect(mutateResult).toMatchObject({ expense: { id: 'e1' }, failedUploadCount: 0 }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups', 'g1'] });
  });
});

describe('useAddReceipts (plan B10, edit flow)', () => {
  it('calls repos.expenses.addReceipts and invalidates the expenses query key on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useAddReceipts();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'e1', files: [] }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.addReceipts).toHaveBeenCalledWith('e1', []));
    await waitFor(() => expect(mutateResult).toMatchObject({ failedUploadCount: 0 }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
  });
});

describe('useRemoveReceipt (plan B10, edit flow)', () => {
  it('calls repos.expenses.removeReceipt and invalidates the expenses query key on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let settled = false;
    function Probe() {
      const mutation = useRemoveReceipt();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'e1', path: 'expenses/e1/a.jpg' }).then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(expensesRepo.removeReceipt).toHaveBeenCalledWith('e1', 'expenses/e1/a.jpg'));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
  });
});

describe('useUpdateFriendshipStatus (plan B13 — accept/reject)', () => {
  it('calls repos.friendships.update with the given status and invalidates the friendships query key', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useUpdateFriendshipStatus();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'f1', status: 'accepted' }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(friendshipsRepo.update).toHaveBeenCalledWith('f1', { status: 'accepted' }));
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'f1', status: 'accepted' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friendships'] });
  });
});

describe('useRemoveFriendship (plan B13 — Remove and Cancel share this mutation)', () => {
  it('calls repos.friendships.remove and invalidates the friendships query key', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let settled = false;
    function Probe() {
      const mutation = useRemoveFriendship();
      React.useEffect(() => {
        void mutation.mutateAsync('f1').then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(friendshipsRepo.remove).toHaveBeenCalledWith('f1'));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friendships'] });
  });
});

describe('useSendFriendRequest (plan B13 — add-by-email)', () => {
  it('a registered email calls repos.friendships.request and invalidates friendships', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useSendFriendRequest();
      React.useEffect(() => {
        void mutation.mutateAsync({ uid: 'u1', email: 'ada@example.com' }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(profilesRepo.byEmail).toHaveBeenCalledWith('ada@example.com'));
    await waitFor(() => expect(friendshipsRepo.request).toHaveBeenCalledWith('u1', 'p1'));
    await waitFor(() => expect(mutateResult).toMatchObject({ kind: 'sent' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['friendships'] });
  });

  it('an unregistered email resolves { kind: "unregistered" } without calling request or invalidating', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useSendFriendRequest();
      React.useEffect(() => {
        void mutation.mutateAsync({ uid: 'u1', email: 'unregistered@example.com' }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(profilesRepo.byEmail).toHaveBeenCalledWith('unregistered@example.com'));
    await waitFor(() => expect(mutateResult).toEqual({ kind: 'unregistered' }));
    expect(friendshipsRepo.request).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});

describe('useCreateGroup (plan B12)', () => {
  it('calls repos.groups.create and invalidates the groups query key on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useCreateGroup();
      React.useEffect(() => {
        void mutation.mutateAsync({ name: 'Roommates' } as never).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(groupsRepo.create).toHaveBeenCalled());
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'g1' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] });
  });
});

describe('useUpdateGroup (plan B12 — member add/remove share this mutation)', () => {
  it('calls repos.groups.update with the partial patch and invalidates both the collection and detail keys', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useUpdateGroup();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'g1', patch: { memberIds: ['u1', 'u2'] } }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(groupsRepo.update).toHaveBeenCalledWith('g1', { memberIds: ['u1', 'u2'] }));
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'g1', memberIds: ['u1', 'u2'] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups', 'g1'] });
  });
});

describe('useDeleteGroup (plan B12, risk:high)', () => {
  it('calls repos.groups.remove and invalidates groups, expenses and events on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let settled = false;
    function Probe() {
      const mutation = useDeleteGroup();
      React.useEffect(() => {
        void mutation.mutateAsync('g1').then(() => {
          settled = true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(groupsRepo.remove).toHaveBeenCalledWith('g1'));
    await waitFor(() => expect(settled).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});

describe('useAttachExpensesToGroup (plan B12)', () => {
  it('calls repos.groups.attachExpenses and invalidates expenses and the group', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useAttachExpensesToGroup();
      React.useEffect(() => {
        void mutation.mutateAsync({ groupId: 'g1', expenseIds: ['e1'] }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(groupsRepo.attachExpenses).toHaveBeenCalledWith('g1', ['e1']));
    await waitFor(() => expect(mutateResult).toEqual({ attached: ['e1'], skipped: [] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['expenses'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups', 'g1'] });
  });
});

describe('useAttachEventsToGroup (plan B12)', () => {
  it('calls repos.groups.attachEvents and invalidates events and the group', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useAttachEventsToGroup();
      React.useEffect(() => {
        void mutation.mutateAsync({ groupId: 'g1', eventIds: ['ev1'] }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(groupsRepo.attachEvents).toHaveBeenCalledWith('g1', ['ev1']));
    await waitFor(() => expect(mutateResult).toEqual({ attached: ['ev1'], skipped: [] }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['groups', 'g1'] });
  });
});

describe('useCreateEvent (plan B11b)', () => {
  it('calls repos.events.create and invalidates the events keys on success', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useCreateEvent();
      React.useEffect(() => {
        void mutation.mutateAsync({ name: 'Cancun' } as never).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(eventsRepo.create).toHaveBeenCalledWith({ name: 'Cancun' }));
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'ev1', name: 'Cancun' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});

describe('useUpdateEvent (plan B11b — the detail rename and the edit form share this mutation)', () => {
  it('calls repos.events.update with the partial patch and invalidates the events keys (list, group and detail share the prefix)', async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    let mutateResult: unknown;
    function Probe() {
      const mutation = useUpdateEvent();
      React.useEffect(() => {
        void mutation.mutateAsync({ id: 'ev1', patch: { name: 'Renamed' } }).then((r) => {
          mutateResult = r;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return null;
    }
    withClient(<Probe />, client);
    await waitFor(() => expect(eventsRepo.update).toHaveBeenCalledWith('ev1', { name: 'Renamed' }));
    await waitFor(() => expect(mutateResult).toMatchObject({ id: 'ev1', name: 'Renamed' }));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['events'] });
  });
});
