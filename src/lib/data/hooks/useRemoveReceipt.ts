import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as expensesRepo from '../repos/expenses';

export interface RemoveReceiptVars {
  id: string;
  path: string;
}

/** Plan B10, edit flow: patches `images` then deletes the object (ADR 0005 amendment order). */
export function useRemoveReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path }: RemoveReceiptVars) => expensesRepo.removeReceipt(id, path),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
