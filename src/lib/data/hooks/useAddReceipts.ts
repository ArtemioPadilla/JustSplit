import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as expensesRepo from '../repos/expenses';

export interface AddReceiptsVars {
  id: string;
  files: Blob[];
}

/** Plan B10, edit flow: uploads directly onto an existing expense (the row already exists). */
export function useAddReceipts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, files }: AddReceiptsVars) => expensesRepo.addReceipts(id, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}
