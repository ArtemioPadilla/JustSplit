import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as groupsRepo from '../repos/groups';

/**
 * Plan B12 (risk:high): the group detail island's two-step delete confirm
 * goes through this. `repos.groups.remove`'s own preflights (admin-only,
 * the no-group friendship-invariant check, honest post-write verification
 * — ADR 0002 amendment) still run underneath; this hook adds no behavior
 * of its own beyond the standard mutation wiring. Ungrouping every group
 * expense/event is part of the same delete, so both collections are
 * invalidated alongside `groups` — same reasoning as `useCreateExpense`
 * invalidating a group's own key when the new expense carries a `groupId`.
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
