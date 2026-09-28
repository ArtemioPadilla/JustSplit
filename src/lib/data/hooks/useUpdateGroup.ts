import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExpenseGroup } from '@/schemas/group';
import * as groupsRepo from '../repos/groups';

export interface UpdateGroupVars {
  id: string;
  /** A partial patch — plan B12's member management writes `memberIds`/`members[]`/`adminIds` together (`src/domain/groups.ts`'s `withAddedMembers`/`withRemovedMember`). */
  patch: Partial<ExpenseGroup>;
}

/**
 * Plan B12: the group detail island's admin-only "add members" and
 * "remove member" actions both go through this ONE mutation — each just
 * supplies a different patch built by `src/domain/groups.ts`. Same
 * `useMutation` + `invalidateQueries` pattern as `useUpdateExpense`;
 * invalidates both the list key (`memberIds` changed, so who this group
 * is visible to for THIS query didn't change, but member count/roles
 * shown in a list would) and this group's own detail key.
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateGroupVars) => groupsRepo.update(id, patch),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
      void queryClient.invalidateQueries({ queryKey: ['groups', id] });
    },
  });
}
