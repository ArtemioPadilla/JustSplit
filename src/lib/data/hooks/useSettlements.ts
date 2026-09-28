import type { Settlement } from '@/schemas/settlement';
import * as settlementsRepo from '../repos/settlements';
import { useLiveQuery } from './useLiveQuery';

/**
 * Every settlement the user can see (plan B8b, mirroring `useExpenses`; ADR
 * 0013): the two parties, plus members of its group or event. No filter — RLS
 * decides visibility — and `uid` only keys the cache per user and gates the
 * query until someone is signed in.
 */
export function useSettlements(uid: string | undefined) {
  return useLiveQuery<Settlement>(['settlements', uid], 'settlements', settlementsRepo.visibleFilters(), {
    enabled: Boolean(uid),
    persist: true,
  });
}

/**
 * An event's settlements (plan B14a, mirroring `useEventExpenses`): `eventId ==
 * id`, live and persisted. The event scope counts ONLY these — a settlement
 * with no event (or another) is not part of the event's balances or progress.
 */
export function useEventSettlements(eventId: string | undefined) {
  return useLiveQuery<Settlement>(['settlements', 'event', eventId], 'settlements', eventId ? settlementsRepo.forEventFilters(eventId) : [], {
    enabled: Boolean(eventId),
    persist: true,
  });
}
