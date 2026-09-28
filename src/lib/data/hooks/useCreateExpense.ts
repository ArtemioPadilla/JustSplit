import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseInput } from '@/schemas/expense';
import * as expensesRepo from '../repos/expenses';

/**
 * Plan B5a: `useMutation` over the repo, invalidating the affected keys.
 * `expenses`/`expenses.group.*`/`expenses.event.*` are live (`useLiveQuery`)
 * so Realtime already pushes the new row into every open subscriber's
 * cache; invalidation here is the fallback for a page that isn't currently
 * subscribed (a non-live consumer, or one that mounts right after the
 * mutation resolves but before its own subscription's first emission).
 */
export function useCreateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) => expensesRepo.create(input),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (created.groupId) void queryClient.invalidateQueries({ queryKey: ['groups', created.groupId] });
    },
  });
}
