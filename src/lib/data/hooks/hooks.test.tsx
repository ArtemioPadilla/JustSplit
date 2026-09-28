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
const liveQuerySpy = vi.fn(() => ({ data: undefined }));
vi.mock('./useLiveQuery', () => ({ useLiveQuery: liveQuerySpy }));

const expensesRepo = {
  forUserFilters: vi.fn((uid: string) => [{ field: 'memberIds', operator: 'array-contains', value: uid }]),
  forGroupFilters: vi.fn((groupId: string) => [{ field: 'groupId', operator: '==', value: groupId }]),
  create: vi.fn(async (input: unknown) => ({ id: 'e1', ...(input as object) })),
};
vi.mock('../repos/expenses', () => expensesRepo);

const groupsRepo = { get: vi.fn(async (id: string) => ({ id, name: 'Group' })) };
vi.mock('../repos/groups', () => groupsRepo);

const profilesRepo = { byIds: vi.fn(async (ids: string[]) => ids.map((id) => ({ id, name: id, avatarUrl: null }))) };
vi.mock('../repos/profiles', () => profilesRepo);

const { useExpenses, useGroupExpenses } = await import('./useExpenses');
const { useGroup } = await import('./useGroup');
const { useCreateExpense } = await import('./useCreateExpense');
const { useProfiles } = await import('./useProfiles');

function withClient(node: React.ReactElement, client = new QueryClient()) {
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('useExpenses / useGroupExpenses', () => {
  it("useExpenses(uid) subscribes 'expenses' with the memberIds array-contains filter, persisted", () => {
    function Probe() {
      useExpenses('u1');
      return null;
    }
    withClient(<Probe />);
    expect(liveQuerySpy).toHaveBeenCalledWith(['expenses', 'u1'], 'expenses', expensesRepo.forUserFilters('u1'), {
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
