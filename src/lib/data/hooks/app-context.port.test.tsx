// @vitest-environment jsdom
/**
 * Port of `origin/main:src/context/__tests__/AppContext.test.tsx` (the
 * frozen Next tree's 866-line `AppContext`) onto the target architecture:
 * hooks + the in-memory `StorageAdapter`, no React Context (plan B5a).
 *
 * Ported (same behavior, new plumbing):
 * - "initializes with default state when no initialState is provided"
 *   -> useExpenses/useEvents start empty before any create.
 * - "adds an expense correctly" -> repos.expenses.create(), then
 *   useExpenses(uid) shows it.
 * - "adds an event correctly" -> repos.events.create(), then
 *   useEvents(uid) shows it.
 * - "adds a settlement correctly" -> repos.settlements.create() (no
 *   useSettlements hook yet — deferred to the feature-island issues that
 *   first need it, B10-B14; ported at the repo level instead).
 *
 * Explicitly NOT ported (noted, not silently dropped):
 * - "initializes with provided initialState" — TanStack Query has no
 *   equivalent to AppContext's `initialState` prop; a warm cache comes from
 *   the idb persister (plan B5a) or a live fetch, never a component prop.
 * - "adds a user correctly" / "updates a user correctly" (ADD_USER /
 *   UPDATE_USER) — there is no generic `users` collection in the target
 *   schema (spec D10): identity is `profiles` (own-row, via
 *   `SupabaseProfileStore`) and other users are resolved through
 *   `repos.profiles.byIds`/`byEmail`, neither of which is a
 *   create/update-able list the app owns.
 * - "throws error when context is used outside of provider" — there is no
 *   Context to be outside of (CLAUDE.md rule 2: Nano Stores, never Context,
 *   for state shared across islands); `useLiveQuery`'s only hard
 *   requirement is a `QueryClientProvider` ancestor, which is a TanStack
 *   Query concern already covered by `useLiveQuery.test.tsx`, not an
 *   AppContext-shaped one.
 */
import * as React from 'react';
import { render, cleanup, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/data/adapter', async () => {
  const { createMemoryAdapter } = await import('@/tests/memory-adapter');
  return { storageAdapter: createMemoryAdapter() };
});

const expensesRepo = await import('@/lib/data/repos/expenses');
const eventsRepo = await import('@/lib/data/repos/events');
const settlementsRepo = await import('@/lib/data/repos/settlements');
const { useExpenses } = await import('./useExpenses');
const { useEvents } = await import('./useEvents');

function withClient(node: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{node}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
});

describe('AppContext port (plan B5a): default state', () => {
  it('useExpenses/useEvents start empty for a fresh user', async () => {
    let expenseData: unknown;
    let eventData: unknown;
    function Probe() {
      expenseData = useExpenses('port-empty-uid').data;
      eventData = useEvents('port-empty-uid').data;
      return null;
    }
    withClient(<Probe />);
    await waitFor(() => expect(expenseData).toEqual([]));
    await waitFor(() => expect(eventData).toEqual([]));
  });
});

describe('AppContext port (plan B5a): "adds an expense correctly"', () => {
  it('repos.expenses.create() makes the expense show up in useExpenses(uid)', async () => {
    const created = await expensesRepo.create({
      groupId: null,
      description: 'Test Expense',
      amount: 50,
      currency: 'USD',
      paidBy: 'port-expense-uid',
      splitType: 'equal',
      splits: [{ userId: 'port-expense-uid', amount: 50 }],
      date: '2023-05-15',
      memberIds: ['port-expense-uid'],
      createdBy: 'port-expense-uid',
    });
    expect(created.description).toBe('Test Expense');
    expect(created.amount).toBe(50);

    let data: Array<{ id: string }> | undefined;
    function Probe() {
      data = useExpenses('port-expense-uid').data;
      return null;
    }
    withClient(<Probe />);
    await waitFor(() => expect(data?.some((e) => e.id === created.id)).toBe(true));
  });
});

describe('AppContext port (plan B5a): "adds an event correctly"', () => {
  it('repos.events.create() makes the event show up in useEvents(uid)', async () => {
    const created = await eventsRepo.create({
      name: 'Test Event',
      description: 'Event description',
      startDate: '2023-05-15',
      endDate: '2023-05-16',
      memberIds: ['port-event-uid'],
      kind: 'trip',
      createdBy: 'port-event-uid',
    });
    expect(created.name).toBe('Test Event');
    expect(created.memberIds).toContain('port-event-uid');

    let data: Array<{ id: string }> | undefined;
    function Probe() {
      data = useEvents('port-event-uid').data;
      return null;
    }
    withClient(<Probe />);
    await waitFor(() => expect(data?.some((e) => e.id === created.id)).toBe(true));
  });
});

describe('AppContext port (plan B5a): "adds a settlement correctly" (repo-level — no useSettlements hook yet)', () => {
  it('repos.settlements.create() persists the settlement', async () => {
    const created = await settlementsRepo.create({
      groupId: null,
      fromUserId: 'port-user-2',
      toUserId: 'port-user-1',
      amount: 50,
      currency: 'USD',
      date: '2023-05-15',
      memberIds: ['port-user-1', 'port-user-2'],
      createdBy: 'port-user-2',
    });
    expect(created.amount).toBe(50);
    expect(created.fromUserId).toBe('port-user-2');

    const fetched = await settlementsRepo.get(created.id);
    expect(fetched).toEqual(created);
  });
});
