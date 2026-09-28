import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useStore } from '@nanostores/react';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { UserAvatar } from '@/components/features/profile/UserAvatar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorState } from '@/components/ui/error-state';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { formatCalendarDate } from '@/domain/dates';
import { buildCreateEventInput, buildEventPatch, eventCandidateIds } from '@/domain/events';
import { violatesAddedMembersRule } from '@/domain/expenseParticipants';
import { acceptedFriendIds as computeAcceptedFriendIds } from '@/domain/friends';
import { useCreateEvent } from '@/lib/data/hooks/useCreateEvent';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useGroup } from '@/lib/data/hooks/useGroup';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useUpdateEvent } from '@/lib/data/hooks/useUpdateEvent';
import { EventNotFoundError } from '@/lib/data/repos/events';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import type { Event } from '@/schemas/event';
import { EventFormValuesSchema, type EventFormValues } from '@/schemas/event-form';
import type { ExpenseGroup } from '@/schemas/group';
import { $preferredCurrency } from '@/stores/preferences';
import { $profile, $user } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';

export interface EventFormProps {
  mode: 'create' | 'edit';
  /** Required for `mode="edit"`. */
  event?: Event;
}

/** Reads `?group=` once — this form only reacts to the URL it was mounted with (create mode only). */
function readGroupParam(mode: EventFormProps['mode']): string | undefined {
  if (mode !== 'create' || typeof window === 'undefined') return undefined;
  return new URLSearchParams(window.location.search).get('group') ?? undefined;
}

const RETRY_HINT = 'Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.';

function FormSkeleton() {
  // Same width and roughly the same rhythm as the loaded form, so nothing jumps when it arrives.
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

/**
 * The event form, shared between `/events/new` and `/events/edit/<id>` (plan
 * B11b). This component only RESOLVES the context — who may be picked — and
 * waits for it (a skeleton, or an error with a retry); `EventFormFields`
 * below is the form itself, mounted once with final defaults.
 *
 * Participants are registered users only (ADR 0006), never free text:
 *   - a group event (`?group=` on create, `event.groupId` on edit): the group's
 *     members — `events_insert` needs `member_ids ⊆ group`, and `guard_events`
 *     checks each ADDED member against the group on update;
 *   - otherwise: the caller's accepted friends.
 * On edit the current members are always listed too, friend or not: the
 * database checks only ADDED members (ADR 0013), so an existing non-friend
 * member never blocks a save and can be removed. UX only — RLS stays the sole
 * authority (CLAUDE.md rule 8).
 */
export function EventForm({ mode, event }: EventFormProps) {
  const user = useStore($user);
  const uid = user?.uid ?? '';

  const groupParam = React.useMemo(() => readGroupParam(mode), [mode]);
  const contextGroupId = mode === 'create' ? groupParam : (event?.groupId ?? undefined);
  const groupQuery = useGroup(contextGroupId);
  const friendsQuery = useFriends(uid || undefined);

  const group: ExpenseGroup | null | undefined = contextGroupId ? groupQuery.data : undefined;
  // `?group=` that resolves to nothing (missing, or hidden by RLS) is ignored with a notice, never guessed at.
  const groupIgnored = mode === 'create' && Boolean(groupParam) && group === null;
  // A group event picks from its group, so it never waits for (or fails on) the friends list.
  const friendsNeeded = !group && !(mode === 'edit' && event?.groupId);

  if (contextGroupId && groupQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this group"
        hint={RETRY_HINT}
        action={
          <Button type="button" onClick={() => groupQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }
  if (contextGroupId && group === undefined) return <FormSkeleton />;
  if (friendsNeeded && friendsQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading your friends"
        hint={RETRY_HINT}
        action={
          <Button type="button" onClick={() => friendsQuery.refetch()} disabled={friendsQuery.isRetrying} aria-busy={friendsQuery.isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }
  if (friendsNeeded && friendsQuery.data === undefined) return <FormSkeleton />;

  const friendIds = uid && friendsQuery.data ? computeAcceptedFriendIds(friendsQuery.data, uid) : [];
  // A group event picks from its group; a group event whose group this member can no longer see can add nobody.
  const poolIds = group ? group.memberIds : mode === 'edit' && event?.groupId ? [] : friendIds;

  return (
    <EventFormFields
      mode={mode}
      event={event}
      uid={uid}
      poolIds={poolIds}
      friendIds={friendIds}
      group={group ?? null}
      groupHidden={mode === 'edit' && Boolean(event?.groupId) && group === null}
      groupIgnored={groupIgnored}
    />
  );
}

interface EventFormFieldsProps {
  mode: EventFormProps['mode'];
  event?: Event;
  uid: string;
  /** Who may be ADDED (already resolved: friends, or the group's members). */
  poolIds: string[];
  friendIds: string[];
  /** The group this event belongs to, when the caller can see it. */
  group: ExpenseGroup | null;
  /** An existing group event whose group this member can no longer see: nobody can be added. */
  groupHidden: boolean;
  /** A `?group=` that resolved to nothing. */
  groupIgnored: boolean;
}

function EventFormFields({ mode, event, uid, poolIds, friendIds, group, groupHidden, groupIgnored }: EventFormFieldsProps) {
  const user = useStore($user);
  const profile = useStore($profile);
  const preferredCurrency = useStore($preferredCurrency);

  const candidateIds = React.useMemo(
    () => eventCandidateIds({ uid, poolIds, existingMemberIds: mode === 'edit' ? event?.memberIds : undefined }),
    [uid, poolIds, mode, event?.memberIds],
  );
  const profilesQuery = useProfiles(candidateIds);
  const profileById = React.useMemo(() => {
    const map: Record<string, { name: string | null; avatarUrl: string | null }> = {};
    for (const row of profilesQuery.data ?? []) map[row.id] = { name: row.name, avatarUrl: row.avatarUrl };
    return map;
  }, [profilesQuery.data]);
  const nameOf = (id: string): string => {
    const known = profileById[id]?.name;
    if (known) return known;
    if (id === uid) return profile?.name ?? user?.displayName ?? 'You';
    return profilesQuery.isPending ? 'Loading…' : 'Unknown';
  };

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const pending = createEvent.isPending || updateEvent.isPending;
  const [invariantError, setInvariantError] = React.useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(EventFormValuesSchema),
    defaultValues:
      mode === 'edit' && event
        ? {
            name: event.name,
            description: event.description ?? '',
            startDate: event.startDate ?? event.date ?? '',
            endDate: event.endDate ?? '',
            preferredCurrency: event.preferredCurrency ?? preferredCurrency,
            memberIds: event.memberIds,
          }
        : {
            name: '',
            description: '',
            startDate: formatCalendarDate(new Date()),
            endDate: '',
            preferredCurrency: group?.currency ?? preferredCurrency,
            memberIds: [uid],
          },
  });
  const memberIds = useWatch({ control: form.control, name: 'memberIds' });
  const startDate = useWatch({ control: form.control, name: 'startDate' });

  function toggle(id: string, checked: boolean) {
    const next = checked ? [...memberIds, id] : memberIds.filter((existing) => existing !== id);
    form.setValue('memberIds', next, { shouldDirty: true, shouldValidate: true });
  }

  /** The database's rule for ADDED members, mirrored so a doomed save is refused before the round trip. */
  function refuseIfMembersInvalid(nextMemberIds: string[], previousMemberIds: string[]): boolean {
    const violates = violatesAddedMembersRule(nextMemberIds, previousMemberIds, {
      uid,
      acceptedFriendIds: friendIds,
      groupMemberIds: group ? group.memberIds : undefined,
    });
    setInvariantError(violates ? "Something about who's on this event changed. Please review the participants and try again." : null);
    return violates;
  }

  async function handleValid(values: EventFormValues) {
    if (mode === 'create') {
      const input = buildCreateEventInput({ ...values, uid, groupId: group?.id });
      if (refuseIfMembersInvalid(input.memberIds, [])) return;
      try {
        const created = await createEvent.mutateAsync(input);
        // afterNavigation: true — location.assign() below is a full page load
        // in this static MPA that would otherwise discard this toast before it
        // renders (plan B17b amendment, ADR 0008).
        notifySuccess('Event created', { afterNavigation: true });
        window.location.assign(withBase(`/events/${created.id}`));
      } catch {
        notifyError('Could not create this event. Please try again.');
      }
      return;
    }

    if (!event) return;
    const patch = buildEventPatch(event, values, uid);
    // Nothing changed: no request, no toast — just go back to the event.
    if (Object.keys(patch).length === 0) {
      window.location.assign(withBase(`/events/${event.id}`));
      return;
    }
    if (patch.memberIds && refuseIfMembersInvalid(patch.memberIds, event.memberIds)) return;
    setInvariantError(null);
    try {
      await updateEvent.mutateAsync({ id: event.id, patch });
      notifySuccess('Event updated', { afterNavigation: true });
      window.location.assign(withBase(`/events/${event.id}`));
    } catch (error) {
      notifyError(
        error instanceof EventNotFoundError
          ? 'This event no longer exists, or you can’t edit it any more.'
          : 'Could not save your changes. Please try again.',
      );
    }
  }

  const cancelHref = withBase(mode === 'edit' && event ? `/events/${event.id}` : '/events/list');
  const nobodyToAdd = poolIds.length === 0 && !group && !groupHidden;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid)} noValidate className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        {/* Not an <h1> on purpose: the mounting island/route view owns the page's ONE <h1>, sr-only and
            OUTSIDE the auth-gated subtree, so axe's `page-has-heading-one` passes in every auth state. */}
        <p className="font-display text-2xl font-semibold text-foreground">{mode === 'create' ? 'New event' : 'Edit event'}</p>

        {groupIgnored && (
          <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            We couldn&apos;t find that group — showing your friends instead.
          </p>
        )}
        {group && (
          <p className="text-sm text-muted-foreground">
            Group: <span className="font-medium text-foreground">{group.name}</span>
          </p>
        )}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="event-form-name">Event name</FormLabel>
              <FormControl>
                <Input id="event-form-name" placeholder="e.g., Trip to Paris" autoComplete="off" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="event-form-description">Description (optional)</FormLabel>
              <FormControl>
                <Textarea id="event-form-description" rows={3} placeholder="Add any details about the event" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Native date inputs, not `ui/date-picker`: they render in the visitor's own locale, are keyboard
            operable everywhere, can be cleared (the end date is optional), and `min` keeps the end after the start. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="event-form-start-date">Start date</FormLabel>
                <FormControl>
                  <Input id="event-form-start-date" type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="event-form-end-date">End date (optional)</FormLabel>
                <FormControl>
                  <Input id="event-form-end-date" type="date" min={startDate || undefined} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="preferredCurrency"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CurrencySelector id="event-form-currency" label="Currency" value={field.value} onChange={field.onChange} />
              </FormControl>
              <p className="text-xs text-muted-foreground">Used as the default when viewing this event&apos;s totals.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="flex flex-col gap-2" aria-describedby="event-form-participants-hint">
          <legend className="text-sm font-medium text-foreground">Participants</legend>
          <p id="event-form-participants-hint" className="text-xs text-muted-foreground">
            {group
              ? `Only members of ${group.name} can be on this event.`
              : groupHidden
                ? 'You can’t add people to this event because you’re no longer in its group.'
                : 'Pick from your accepted friends. You’re always part of the event.'}
            {mode === 'edit' && ' People you remove stop seeing this event’s expenses, except any expense that names them.'}
          </p>
          {candidateIds.map((id) => {
            const isMe = id === uid;
            const name = nameOf(id);
            const label = isMe ? `${name} (you)` : name;
            return (
              <label
                key={id}
                className={cn('flex items-center gap-2 text-sm text-foreground', isMe ? 'cursor-default' : 'cursor-pointer')}
              >
                <Checkbox
                  checked={isMe || memberIds.includes(id)}
                  disabled={isMe}
                  onCheckedChange={(checked) => toggle(id, checked === true)}
                  aria-label={label}
                />
                <UserAvatar src={profileById[id]?.avatarUrl} name={name} alt="" className="size-6" />
                {label}
              </label>
            );
          })}
          {nobodyToAdd && (
            <p className="text-sm text-muted-foreground">
              No friends to add yet. You can still create the event and add people later from Edit, or{' '}
              <a href={withBase('/friends')} className="underline underline-offset-2">
                add a friend
              </a>{' '}
              first.
            </p>
          )}
          {form.formState.errors.memberIds && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {form.formState.errors.memberIds.message}
            </p>
          )}
        </fieldset>

        {invariantError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {invariantError}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} aria-busy={pending}>
            {pending ? (mode === 'create' ? 'Creating…' : 'Saving…') : mode === 'create' ? 'Create event' : 'Save changes'}
          </Button>
          <a href={cancelHref} className={cn(buttonVariants({ variant: 'ghost' }))}>
            Cancel
          </a>
        </div>
      </form>
    </Form>
  );
}
