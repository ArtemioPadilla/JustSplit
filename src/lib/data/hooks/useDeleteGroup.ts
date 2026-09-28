import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as groupsRepo from '../repos/groups';

/**
 * Plan B12 (risk:high): the group detail island's two-step delete confirm
 * goes through this. `repos.groups.remove`'s own checks (admin-only, honest
 * post-delete verification) still run underneath; this hook adds no behavior
 * of its own beyond the standard mutation wiring. The database ungroups every
 * group expense and event when the row goes (`ON DELETE SET NULL`, ADR 0013),
 * so both collections are invalidated alongside `groups` — same reasoning as
 * `useCreateExpense` invalidating a group's own key when the new expense
 * carries a `groupId`.
 */
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsRepo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
