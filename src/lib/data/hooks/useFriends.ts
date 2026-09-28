import type { Friendship } from '@/schemas/friendship';
import * as friendshipsRepo from '../repos/friendships';
import { useLiveQuery } from './useLiveQuery';

/**
 * A user's friendships, accepted or pending (plan B10, pulled forward from
 * B13's own ADR `docs/decisions/0006-registered-participants.md` — B13's
 * islands hadn't landed yet at the time, but the `friendships` repo had,
 * and the expense form's participant picker needed it too; B13 now also
 * consumes this hook directly for `/friends`). Same `useLiveQuery` wiring
 * as `useExpenses`/`useEvents`/`useSettlements`. Callers filter for
 * `status === 'accepted'` themselves (this hook returns every row
 * `forUserFilters` matches, same "raw rows" contract every other
 * collection hook already has).
 */
export function useFriends(uid: string | undefined) {
  return useLiveQuery<Friendship>(['friendships', uid], 'friendships', uid ? friendshipsRepo.forUserFilters(uid) : [], {
    enabled: Boolean(uid),
    persist: true,
  });
}
