import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateExpenseGroupInput } from '@/schemas/group';
import * as groupsRepo from '../repos/groups';

/**
 * Plan B12: `GroupForm`'s create submit goes through this — same
 * `useMutation` + `invalidateQueries` pattern as `useCreateExpense`.
 * `groups` is a non-live collection query (`useGroup`'s own doc comment),
 * so invalidation here is the only way a newly created group reaches the
 * list island's cache.
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExpenseGroupInput) => groupsRepo.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
}
