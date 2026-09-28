import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as expensesRepo from '../repos/expenses';

/**
 * Plan B9: the detail island's delete-with-confirm goes through this, never
 * `repos.expenses.remove` called directly (Phase 2 preamble: "data only
 * through the B5a hooks"). `remove()`'s own preflight (ADR 0005 amendment)
 * still throws `ExpenseNotFoundError`/`ExpenseDeleteNotAllowedError` — this
 * hook adds no behavior of its own beyond the standard mutation wiring.
 */
export function useDeleteExpense() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => expensesRepo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
