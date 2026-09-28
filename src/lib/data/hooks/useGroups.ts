import type { ExpenseGroup } from '@/schemas/group';
import * as groupsRepo from '../repos/groups';
import { useLiveQuery } from './useLiveQuery';

/** A user's groups (plan B12): `GroupsListIsland`'s own live query, same wiring as `useExpenses`/`useFriends`. */
export function useGroups(uid: string | undefined) {
  return useLiveQuery<ExpenseGroup>(['groups', uid], 'expense_groups', uid ? groupsRepo.forUserFilters(uid) : [], {
    enabled: Boolean(uid),
    persist: true,
  });
}
