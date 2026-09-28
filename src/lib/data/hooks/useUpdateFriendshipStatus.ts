import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as friendshipsRepo from '../repos/friendships';

export interface UpdateFriendshipStatusVars {
  id: string;
  /** `friendships_update`'s RLS + `guard_friendships` restrict this to the recipient only (`db/migrations/20260928000005_guard_triggers.sql`) — this hook enforces no such rule client-side; `/friends`' own Accept/Reject buttons only ever render for the received-requests section. */
  status: 'accepted' | 'rejected';
}

/** Plan B13: the friends list's Accept/Reject buttons go through this, never `repos.friendships.update` called directly. */
export function useUpdateFriendshipStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: UpdateFriendshipStatusVars) => friendshipsRepo.update(id, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}
