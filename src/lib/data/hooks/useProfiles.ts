import { useQuery } from '@tanstack/react-query';
import * as profilesRepo from '../repos/profiles';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Other users' names/avatars (plan B5a) — friends list, group members, event
 * members, expense/settlement participants, CSV export. A sorted,
 * de-duplicated id list keeps the query key stable across re-renders that
 * pass the "same" ids in a different order, and a long `staleTime` matches
 * how rarely a name/avatar changes relative to expense data.
 */
export function useProfiles(ids: string[]) {
  const sorted = Array.from(new Set(ids)).sort();
  return useQuery({
    queryKey: ['profiles', sorted],
    queryFn: () => profilesRepo.byIds(sorted),
    enabled: sorted.length > 0,
    staleTime: ONE_HOUR_MS,
  });
}
