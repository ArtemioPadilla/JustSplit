import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { EventPatch } from '@/schemas/event';
import * as eventsRepo from '../repos/events';

export interface UpdateEventVars {
  id: string;
  /** A partial patch built by `domain/events.ts#buildEventPatch` (or `{ name }` for the inline rename). */
  patch: EventPatch;
}

/**
 * Plan B11b: the detail page's inline rename and the edit form's save share
 * this mutation, each supplying its own patch. Invalidating the `['events']`
 * prefix covers the list, the group's events and this event's detail read
 * (`['events', 'detail', id]`).
 */
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: UpdateEventVars) => eventsRepo.update(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
