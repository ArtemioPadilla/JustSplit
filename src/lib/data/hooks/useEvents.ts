import type { Event } from '@/schemas/event';
import * as eventsRepo from '../repos/events';
import { useLiveQuery } from './useLiveQuery';

/** A user's events (plan B5a). */
export function useEvents(uid: string | undefined) {
  return useLiveQuery<Event>(['events', uid], 'events', uid ? eventsRepo.forUserFilters(uid) : [], {
    enabled: Boolean(uid),
    persist: true,
  });
}

/** A group's events (plan B5a: "B5a hooks already load (useGroupExpenses, useGroupEvents)"). */
export function useGroupEvents(groupId: string | undefined) {
  return useLiveQuery<Event>(['events', 'group', groupId], 'events', groupId ? eventsRepo.forGroupFilters(groupId) : [], {
    enabled: Boolean(groupId),
    persist: true,
  });
}
