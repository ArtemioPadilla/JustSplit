import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateEventInput } from '@/schemas/event';
import * as eventsRepo from '../repos/events';

/**
 * Plan B11b: the new-event form's submit. Same `useMutation` +
 * `invalidateQueries` pattern as `useCreateGroup`: the list and detail reads
 * are cached, so invalidating the `['events']` prefix is what makes a fresh
 * event show up (the live subscriptions also hear it over Realtime).
 */
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEventInput) => eventsRepo.create(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
