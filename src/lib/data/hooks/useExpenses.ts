import type { Expense } from '@/schemas/expense';
import * as expensesRepo from '../repos/expenses';
import { useLiveQuery } from './useLiveQuery';

/**
 * Every expense the user can see (plan B5a; ADR 0013): live and persisted. The
 * subscription carries no filter — RLS decides visibility (member_ids, group
 * or event) — and `uid` only keys the cache per user and gates the query until
 * someone is signed in. Personal totals (dashboard, friend balances) narrow to
 * the rows that name the user themselves on the client.
 */
export function useExpenses(uid: string | undefined) {
  return useLiveQuery<Expense>(['expenses', uid], 'expenses', expensesRepo.visibleFilters(), {
    enabled: Boolean(uid),
    persist: true,
  });
}

/** A group's expenses (plan B5a; consumed by B10/B11b's group detail island). */
export function useGroupExpenses(groupId: string | undefined) {
  return useLiveQuery<Expense>(['expenses', 'group', groupId], 'expenses', groupId ? expensesRepo.forGroupFilters(groupId) : [], {
    enabled: Boolean(groupId),
    persist: true,
  });
}

/** An event's expenses (plan B5a; consumed by B13's trip/event detail island). */
export function useEventExpenses(eventId: string | undefined) {
  return useLiveQuery<Expense>(['expenses', 'event', eventId], 'expenses', eventId ? expensesRepo.forEventFilters(eventId) : [], {
    enabled: Boolean(eventId),
    persist: true,
  });
}
