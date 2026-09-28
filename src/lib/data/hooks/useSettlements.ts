import type { Settlement } from '@/schemas/settlement';
import * as settlementsRepo from '../repos/settlements';
import { useLiveQuery } from './useLiveQuery';

/**
 * A user's settlements (plan B8b, mirroring `useExpenses`/`useEvents` — plan
 * B5a). `settlements` has a repo (`src/lib/data/repos/settlements.ts`) but
 * no hook until this issue needed one for the dashboard's "recent
 * settlements" widget. `memberIds` covers both directions (ADR 0002: a
 * settlement row lists both parties), so one query is enough.
 */
export function useSettlements(uid: string | undefined) {
  return useLiveQuery<Settlement>(['settlements', uid], 'settlements', uid ? settlementsRepo.forUserFilters(uid) : [], {
    enabled: Boolean(uid),
    persist: true,
  });
}
