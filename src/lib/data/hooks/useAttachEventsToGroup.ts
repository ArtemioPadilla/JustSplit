import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as groupsRepo from '../repos/groups';

export interface AttachEventsToGroupVars {
  groupId: string;
  eventIds: string[];
}

/** Plan B12: the event-side twin of `useAttachExpensesToGroup` — same `{ attached, skipped }` contract. */
export function useAttachEventsToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ groupId, eventIds }: AttachEventsToGroupVars) => groupsRepo.attachEvents(groupId, eventIds),
    onSuccess: (_data, { groupId }) => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
      void queryClient.invalidateQueries({ queryKey: ['groups', groupId] });
    },
  });
}
