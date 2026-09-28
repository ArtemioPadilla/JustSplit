import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendshipsRepo from '../repos/friendships';

/**
 * Plan B13: Remove (an accepted friendship, either party) and Cancel (a
 * pending request, the requester) are the same delete — `friendships_delete`'s
 * RLS policy makes no status distinction, only "either party". Both actions
 * in `FriendsIsland` go through this one mutation hook.
 */
export function useRemoveFriendship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => friendshipsRepo.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}
