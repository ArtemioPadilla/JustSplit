import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSendFriendRequest } from '@/lib/data/hooks/useSendFriendRequest';
import { FriendshipAlreadyExistsError } from '@/lib/data/repos/friendships';
import { LookupRateLimitedError } from '@/lib/data/repos/profiles';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { withBase } from '@/lib/href';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite, type WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import { AddFriendFormValuesSchema, type AddFriendFormValues } from '@/schemas/friend-request-form';
import { notifyError, notifySuccess } from '@/stores/notifications';

export interface AddFriendFormProps {
  uid: string;
  /** The signed-in user's own email, for the local self-request refusal — `null` while the session hasn't resolved one yet (the check is then simply skipped, same as it not matching). */
  selfEmail: string | null;
  /** The signed-in user's own display name, optionally included in the unregistered-email invite's mailto body. */
  inviterName: string | null;
  /**
   * The page's connection state (plan B19c, ADR 0015). A page that shows one
   * sentence for all its write controls passes its own; standing alone the form
   * reads the connection itself and shows its own sentence.
   */
  write?: WriteState;
}

/**
 * The `/friends` add-by-email form (plan B13, ADR 0006). Exact email only,
 * through `useSendFriendRequest` (→ `find_profile_by_email` against
 * `auth.users`) — no partial/name search, no directory (dropped, ADR 0006).
 *
 * Privacy (user enumeration is inherent to "does this email have an
 * account?"): no avatar/name preview before sending either outcome; a
 * registered email creates the pending friendship directly; an
 * unregistered one offers a mailto/copy-link invitation with NO token and
 * no personal data beyond the inviter's own name. Past the server-side lookup
 * limit (plan B2d, ADR 0013) a fixed inline sentence is shown instead.
 */
export function AddFriendForm({ uid, selfEmail, inviterName, write: pageWrite }: AddFriendFormProps) {
  const ownWrite = useCanWrite();
  const write = pageWrite ?? ownWrite;
  const form = useForm<AddFriendFormValues>({
    resolver: zodResolver(AddFriendFormValuesSchema),
    defaultValues: { email: '' },
  });
  const sendRequest = useSendFriendRequest();
  const [invite, setInvite] = React.useState<{ email: string } | null>(null);
  const [rateLimited, setRateLimited] = React.useState(false);

  async function handleValid(values: AddFriendFormValues) {
    setInvite(null);
    setRateLimited(false);
    // Local check, no RPC call (spec): refuse before ever looking anything up.
    if (selfEmail && values.email === selfEmail.trim().toLowerCase()) {
      form.setError('email', { message: "You can't send a friend request to your own email." });
      return;
    }
    try {
      const result = await sendRequest.mutateAsync({ uid, email: values.email });
      if (result.kind === 'sent') {
        notifySuccess('Friend request sent');
        form.reset();
      } else {
        setInvite({ email: values.email });
      }
    } catch (error) {
      if (error instanceof LookupRateLimitedError) {
        // Inline and persistent (not a toast that vanishes): it explains why
        // the button seems dead, and never shows the limit or raw error text.
        setRateLimited(true);
      } else if (error instanceof FriendshipAlreadyExistsError) {
        notifyError('You already have a request or friendship with this person');
      } else {
        notifyError(writeErrorMessage(error, 'Could not send this friend request. Please try again.'));
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Form {...form}>
        <form
          onSubmit={(event) => {
            if (refuseIfOffline(event)) return;
            return form.handleSubmit(handleValid)(event);
          }}
          noValidate
          className="flex flex-wrap items-end gap-3"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="min-w-64 flex-1">
                <FormLabel htmlFor="add-friend-email">Add a friend by email</FormLabel>
                <FormControl>
                  <Input id="add-friend-email" type="email" placeholder="friend@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={sendRequest.isPending} aria-busy={sendRequest.isPending} {...write.blocked}>
            Send request
          </Button>
        </form>
      </Form>
      {!pageWrite && <OfflineWriteNotice write={write} />}

      {rateLimited && (
        <p role="alert" className="text-sm text-destructive">
          You&apos;ve looked up a lot of emails recently. Please try again in a while.
        </p>
      )}

      {invite && <InvitePanel email={invite.email} inviterName={inviterName} />}
    </div>
  );
}

/**
 * The unregistered-email path (plan B13, ADR 0006 "new"): no token, no
 * server-side record of the invitee's email — the mailto opens the
 * SIGNED-IN USER's own mail client, and the copied link is just the public
 * sign-up page's own absolute URL. JustSplit never stores or transmits the
 * invitee's email itself.
 */
function InvitePanel({ email, inviterName }: { email: string; inviterName: string | null }) {
  const signupUrl = `${window.location.origin}${withBase('/auth/signup/')}`;
  const subject = 'Join me on JustSplit';
  const bodyLines = ["Hi! I'd like to split expenses with you on JustSplit.", '', `Sign up here: ${signupUrl}`];
  if (inviterName) bodyLines.push('', `— ${inviterName}`);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signupUrl);
      notifySuccess('Invite link copied');
    } catch {
      notifyError('Could not copy the invite link');
    }
  }

  return (
    <div role="status" className="flex flex-col gap-2 rounded-md border border-border bg-muted px-4 py-3 text-sm">
      <p>No JustSplit account uses that email. You can invite them:</p>
      <div className="flex flex-wrap gap-2">
        <a href={mailto} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Email an invite
        </a>
        <button type="button" onClick={handleCopy} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Copy invite link
        </button>
      </div>
    </div>
  );
}
