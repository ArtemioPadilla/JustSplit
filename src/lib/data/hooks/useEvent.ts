import { useQuery } from '@tanstack/react-query';
import * as eventsRepo from '../repos/events';

/**
 * A single event (plan B9, same pattern as `useGroup`/`useExpense`): a
 * plain `useQuery` over `repos.events.get`, keyed by id. Used by the
 * expense detail island to resolve its `eventId` into a name/link.
 */
export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ['events', 'detail', id],
    queryFn: () => eventsRepo.get(id as string),
    enabled: Boolean(id),
  });
}
