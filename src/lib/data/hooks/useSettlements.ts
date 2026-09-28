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
