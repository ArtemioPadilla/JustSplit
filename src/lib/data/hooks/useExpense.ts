import { useQuery } from '@tanstack/react-query';
import * as expensesRepo from '../repos/expenses';

/**
 * A single expense (plan B9, same pattern as `useGroup`: "non-live keys
 * (detail pages) use `repos.*` through a normal `useQuery`" —
 * `useLiveQuery`'s own doc comment). The detail island's own edits
 * (`Editable` description/notes, delete) go through TanStack Query
 * mutations that invalidate this key, so a live subscription buys nothing
 * here that a plain `useQuery` doesn't already give for free.
 */
export function useExpense(id: string | undefined) {
  return useQuery({
    queryKey: ['expenses', 'detail', id],
    queryFn: () => expensesRepo.get(id as string),
    enabled: Boolean(id),
  });
}
