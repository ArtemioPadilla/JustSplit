import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { acceptedFriendIds } from '@/domain/friends';
import { MAX_GROUP_MEMBERS, buildCreateGroupInput } from '@/domain/groups';
import { useCreateGroup } from '@/lib/data/hooks/useCreateGroup';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { withBase } from '@/lib/href';
import { $preferredCurrency } from '@/stores/preferences';
import { $profile, $user } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';

/**
 * `/groups/new`'s create form (plan B12, risk:high). Members are picked
 * from ACCEPTED friends only (B13's model: the `expense_groups_insert` RLS
 * check and `guard_expense_groups` reject anyone else) — there is no
 * free-text "add a member" input, same "registered users only" rule
 * `ParticipantPicker` (B10) already applies. The payload itself is built
 * by `domain/groups.ts#buildCreateGroupInput` (its own test coverage);
 * this component is the wiring: the candidate list, `maxMembers`
 * enforcement, and the create/redirect/error handling.
 */
export function GroupForm() {
  const user = useStore($user);
  const profile = useStore($profile);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid ?? '';

  const friendsQuery = useFriends(uid || undefined);
  const friendIds = React.useMemo(
    () => (friendsQuery.data ? acceptedFriendIds(friendsQuery.data, uid) : []),
    [friendsQuery.data, uid],
  );
  const profilesQuery = useProfiles(friendIds);
  const candidates = React.useMemo(
    () => (profilesQuery.data ?? []).map((p) => ({ id: p.id, name: p.name ?? 'Unknown' })),
    [profilesQuery.data],
  );

  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [formError, setFormError] = React.useState<string | null>(null);

  const createGroup = useCreateGroup();

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Please enter a group name.');
      return;
    }
    // Enforced client-side (plan B12: "enforce maxMembers in the form") —
    // the creator counts as one of the group's members.
    if (selectedIds.length + 1 > MAX_GROUP_MEMBERS) {
      setFormError(`A group can have at most ${MAX_GROUP_MEMBERS} members.`);
      return;
    }

    const namesById = new Map(candidates.map((c) => [c.id, c.name]));
    const input = buildCreateGroupInput({
      name: trimmedName,
      description: description.trim() || undefined,
      currency: preferredCurrency,
      creator: { userId: uid, displayName: profile?.name ?? user?.displayName ?? 'Unknown' },
      invitees: selectedIds.map((id) => ({ userId: id, displayName: namesById.get(id) ?? 'Unknown' })),
      now: new Date().toISOString(),
    });

    try {
      const created = await createGroup.mutateAsync(input);
      // afterNavigation: true — location.assign() below is a full page
      // load in this static MPA that would otherwise discard this toast
      // before it renders (plan B17b amendment, ADR 0008).
      notifySuccess('Group created', { afterNavigation: true });
      window.location.assign(withBase(`/groups/${created.id}`));
    } catch {
      notifyError('Could not create this group');
    }
  }

  if (friendsQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading your friends"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => friendsQuery.refetch()} disabled={friendsQuery.isRetrying} aria-busy={friendsQuery.isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (friendsQuery.data === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Label htmlFor="group-form-name">Group name</Label>
        <Input id="group-form-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Roommates" />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="group-form-description">Description (optional)</Label>
        <Textarea
          id="group-form-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any details about the group"
          rows={3}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-foreground">Members</legend>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add a friend first — members are picked from your accepted friends.</p>
        ) : (
          candidates.map((candidate) => (
            <label key={candidate.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={selectedIds.includes(candidate.id)}
                onCheckedChange={(checked) => toggle(candidate.id, checked === true)}
                aria-label={candidate.name}
              />
              {candidate.name}
            </label>
          ))
        )}
      </fieldset>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={createGroup.isPending} aria-busy={createGroup.isPending}>
        Create group
      </Button>
    </form>
  );
}
