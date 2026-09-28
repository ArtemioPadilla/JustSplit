import { useQuery } from '@tanstack/react-query';
import * as groupsRepo from '../repos/groups';

/**
 * A single group (plan B5a: "non-live keys (detail pages) use repos.*
 * through a normal useQuery"). Not a live subscription — the group detail
 * page's own tabs (members, settings) change rarely enough that a mutation's
 * `invalidateQueries` is sufficient, unlike the always-changing expense list.
 */
export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsRepo.get(id as string),
    enabled: Boolean(id),
  });
}
