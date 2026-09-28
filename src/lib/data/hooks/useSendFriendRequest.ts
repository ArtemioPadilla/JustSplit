import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Friendship } from '@/schemas/friendship';
import * as friendshipsRepo from '../repos/friendships';
import * as profilesRepo from '../repos/profiles';

export interface SendFriendRequestVars {
  uid: string;
  /** Already trimmed/lowercased and zod-validated by the caller (`AddFriendForm`) — this hook does no normalization of its own. */
  email: string;
}

export type SendFriendRequestResult = { kind: 'sent'; friendship: Friendship; name: string | null } | { kind: 'unregistered' };

/**
 * The `/friends` add-by-email flow (plan B13, ADR 0006). Exact-email lookup
 * only (`repos.profiles.byEmail` → `find_profile_by_email` against
 * `auth.users`, never the user-writable `profiles.email`) — no partial or
 * name search, no directory. An unregistered email is a legitimate,
 * expected outcome (`{ kind: 'unregistered' }`), not a thrown error: the
 * caller shows an invitation UI for it. `repos.friendships.request` throws
 * `FriendshipAlreadyExistsError` for a duplicate pair, which this hook lets
 * propagate — the caller maps that specific error to its own message,
 * everything else stays generic.
 *
 * The self-email refusal happens in the CALLER, before `mutate` is ever
 * invoked (spec: "no RPC call" for that case) — this hook has no access to
 * the caller's own email to check it here even if it wanted to.
 */
export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ uid, email }: SendFriendRequestVars): Promise<SendFriendRequestResult> => {
      const profile = await profilesRepo.byEmail(email);
      if (!profile) return { kind: 'unregistered' };
      const friendship = await friendshipsRepo.request(uid, profile.id);
      return { kind: 'sent', friendship, name: profile.name };
    },
    onSuccess: (result) => {
      if (result.kind === 'sent') void queryClient.invalidateQueries({ queryKey: ['friendships'] });
    },
  });
}
