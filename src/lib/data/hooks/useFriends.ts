import type { Friendship } from '@/schemas/friendship';
import * as friendshipsRepo from '../repos/friendships';
import { useLiveQuery } from './useLiveQuery';

/**
 * A user's friendships, accepted or pending (plan B10, pulled forward from
 * B13's own ADR — B13's islands haven't landed yet, but the `friendships`
 * repo has, and the expense form's participant picker needs it too). Same
 * `useLiveQuery` wiring as `useExpenses`/`useEvents`/`useSettlements`.
 * Callers filter for `status === 'accepted'` themselves (this hook returns
 * every row `forUserFilters` matches, same "raw rows" contract every other
 * collection hook already has).
 */
export function useFriends(uid: string | undefined) {
  return useLiveQuery<Friendship>(['friendships', uid], 'friendships', uid ? friendshipsRepo.forUserFilters(uid) : [], {
    enabled: Boolean(uid),
    persist: true,
  });
}
