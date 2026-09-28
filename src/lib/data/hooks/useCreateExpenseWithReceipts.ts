import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseInput } from '@/schemas/expense';
import * as expensesRepo from '../repos/expenses';

export interface CreateExpenseWithReceiptsVars {
  /** Caller-generated via `expensesRepo.generateId()`, reused across a retry. */
  id: string;
  input: CreateExpenseInput;
  files: Blob[];
}

/**
 * Plan B10: the create form's submit goes through this, never
 * `repos.expenses.create`/`createWithReceipts` called directly (Phase 2
 * preamble: "data only through the B5a hooks") — same `useMutation` +
 * `invalidateQueries` pattern as `useCreateExpense`, over the ordered
 * insert-then-upload-then-patch repo function instead.
 */
export function useCreateExpenseWithReceipts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input, files }: CreateExpenseWithReceiptsVars) => expensesRepo.createWithReceipts(id, input, files),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      if (result.expense.groupId) void queryClient.invalidateQueries({ queryKey: ['groups', result.expense.groupId] });
    },
  });
}
