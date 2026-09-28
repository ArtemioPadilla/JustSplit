import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Expense } from '@/schemas/expense';
import * as expensesRepo from '../repos/expenses';

export interface UpdateExpenseVars {
  id: string;
  /** A partial patch (spec D9 overflow-merge contract, `repos.expenses.update`'s own doc comment). */
  patch: Partial<Expense>;
}

/**
 * Plan B9: the detail island's `Editable` description/notes save through
 * this — same `useMutation` + `invalidateQueries` pattern as
 * `useCreateExpense`. `expenses` is live (`useLiveQuery`), so Realtime
 * already pushes the edit into every open subscriber; invalidation here is
 * the fallback for this island's own non-live `useExpense` detail query.
 */
export function useUpdateExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateExpenseVars) => expensesRepo.update(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
