import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as groupsRepo from '../repos/groups';

export interface AttachExpensesToGroupVars {
  groupId: string;
  expenseIds: string[];
}

/**
 * Plan B12: the group detail island's "attach expenses" panel goes
 * through this. `repos.groups.attachExpenses` returns `{ attached,
 * skipped }` rather than throwing for a row that wasn't eligible or didn't
 * verify — the caller (`AttachRowsPanel`) is responsible for toasting an
 * honest summary of both, never claiming every requested id succeeded.
 */
export function useAttachExpensesToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, expenseIds }: AttachExpensesToGroupVars) => groupsRepo.attachExpenses(groupId, expenseIds),
    onSuccess: (_data, { groupId }) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}
