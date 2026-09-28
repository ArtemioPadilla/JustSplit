import type { Expense } from '@/schemas/expense';
import * as expensesRepo from '../repos/expenses';
import { useLiveQuery } from './useLiveQuery';

/** A user's expenses (plan B5a): the collection query set is live and persisted. */
export function useExpenses(uid: string | undefined) {
  return useLiveQuery<Expense>(['expenses', uid], 'expenses', uid ? expensesRepo.forUserFilters(uid) : [], {
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
