import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useStore } from '@nanostores/react';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CurrencySelector } from '@/components/features/currency/CurrencySelector';
import { ReceiptImage } from '@/components/features/ReceiptImage';
import { LEGACY_CATEGORY_KEYS, type LegacyCategoryKey } from '@/domain/categories';
import { formatCalendarDate, parseCalendarDate } from '@/domain/dates';
import { resolveEventParticipants, violatesNoGroupInvariant } from '@/domain/expenseParticipants';
import { acceptedFriendIds as computeAcceptedFriendIds } from '@/domain/friends';
import { buildSplits, validateSplit } from '@/domain/expenseSplitter';
import { useAddReceipts } from '@/lib/data/hooks/useAddReceipts';
import { useCreateExpenseWithReceipts } from '@/lib/data/hooks/useCreateExpenseWithReceipts';
import { useEvent } from '@/lib/data/hooks/useEvent';
import { useFriends } from '@/lib/data/hooks/useFriends';
import { useGroup } from '@/lib/data/hooks/useGroup';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useRemoveReceipt } from '@/lib/data/hooks/useRemoveReceipt';
import { useUpdateExpense } from '@/lib/data/hooks/useUpdateExpense';
import * as expensesRepo from '@/lib/data/repos/expenses';
import { withBase } from '@/lib/href';
import type { CreateExpenseInput, Expense } from '@/schemas/expense';
import { ExpenseFormValuesSchema, type ExpenseFormValues } from '@/schemas/expense-form';
import { $user } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { $preferredCurrency } from '@/stores/preferences';
import { ExpenseSplitter } from './ExpenseSplitter';
import { ParticipantPicker, type Candidate } from './ParticipantPicker';
import { ReceiptUploader } from './ReceiptUploader';

const CATEGORY_LABELS: Record<LegacyCategoryKey, string> = {
  food: 'Food',
  transportation: 'Transportation',
  accommodation: 'Accommodation',
  entertainment: 'Entertainment',
  other: 'Other',
};

export interface ExpenseFormProps {
  mode: 'create' | 'edit';
  /** Required for `mode="edit"`. */
  expense?: Expense;
}

function namesFrom(rows: { id: string; name: string | null }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows ?? []) map[row.id] = row.name ?? 'Unknown';
  return map;
}

/** Reads `?group=`/`?event=`/`?friend=` once — this form only reacts to the URL it was mounted with (create mode only, spec: no history-driven re-resolution). */
function readCreateParams(mode: ExpenseFormProps['mode']): { group?: string; event?: string; friend?: string } {
  if (mode !== 'create' || typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    group: params.get('group') ?? undefined,
    event: params.get('event') ?? undefined,
    friend: params.get('friend') ?? undefined,
  };
}

/**
 * The expense form, shared between `/expenses/new` and `/expenses/edit/<id>`
 * (plan B10, risk:high — writes expenses and uploads receipts through
 * `src/lib/data/`). See `docs/decisions/0005-supabase-storage-images.md`'s
 * plan-B10 amendment for the write-ordering rationale this component relies
 * on but does not itself re-implement (that lives in `repos/expenses.ts`).
 */
export function ExpenseForm({ mode, expense }: ExpenseFormProps) {
  const user = useStore($user);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid;

  const params = React.useMemo(() => readCreateParams(mode), [mode]);
  const contextGroupId = mode === 'create' ? params.group : (expense?.groupId ?? undefined);
  const contextEventId = mode === 'create' ? params.event : (expense?.eventId ?? undefined);

  const groupQuery = useGroup(contextGroupId ?? undefined);
  const eventQuery = useEvent(contextEventId ?? undefined);
  // A SEPARATE query from `groupQuery` above: when `?event=` resolves to an
  // event that belongs to a group, that group is generally NOT the same one
  // `?group=`/edit's own `contextGroupId` would resolve (there is no
  // `?group=` param in the event case at all) — spec: `event.groupId` set
  // means "treat this as a group expense", the same rule as `?group=`
  // (coordinator review, risk:high: `eventId` has no column, so RLS knows
  // nothing about event membership — only its OWN group, if any).
  const eventGroupQuery = useGroup(eventQuery.data?.groupId ?? undefined);
  const friendsQuery = useFriends(uid);

  // Plan B13: the "other user in a 2-person `users[]`" logic now lives in
  // one pure helper (`domain/friends.ts`), shared with the friends islands
  // — this memo is just the wiring (uid guard + useFriends' data shape).
  const acceptedFriendIds = React.useMemo(() => {
    if (!friendsQuery.data || !uid) return [];
    return computeAcceptedFriendIds(friendsQuery.data, uid);
  }, [friendsQuery.data, uid]);

  const fallbackCandidateIds = React.useMemo(
    () => (uid ? Array.from(new Set([uid, ...acceptedFriendIds])) : []),
    [uid, acceptedFriendIds],
  );

  interface ResolvedContext {
    candidateIds: string[];
    currency?: string;
    groupId?: string;
    /** The resolved group's OWN memberIds (spec: `memberIds` = the group's memberIds, `?group=` and a group-backed `?event=` alike) — kept separate from `candidateIds` so a `?group=`/event-group intersection fallback doesn't have to be reverse-engineered at submit time. */
    groupMemberIds?: string[];
    eventId?: string;
    ignored?: 'group' | 'event' | 'friend';
    /** Only ever nonzero for a no-group `?event=`: how many of the event's real members got excluded for not being an accepted friend. Count only (never names). */
    excludedNonFriendCount: number;
  }

  const resolved = React.useMemo((): ResolvedContext => {
    if (mode === 'create') {
      if (params.group) {
        if (groupQuery.data) {
          return {
            candidateIds: groupQuery.data.memberIds,
            currency: groupQuery.data.currency,
            groupId: groupQuery.data.id,
            groupMemberIds: groupQuery.data.memberIds,
            excludedNonFriendCount: 0,
          };
        }
        if (groupQuery.isSuccess) return { candidateIds: fallbackCandidateIds, ignored: 'group', excludedNonFriendCount: 0 };
        return { candidateIds: [], excludedNonFriendCount: 0 };
      }
      if (params.event) {
        if (eventQuery.data) {
          if (eventQuery.data.groupId) {
            if (eventGroupQuery.data) {
              const r = resolveEventParticipants(eventQuery.data, eventGroupQuery.data, acceptedFriendIds, uid ?? '');
              return {
                candidateIds: r.candidateIds,
                currency: r.currency,
                groupId: r.groupId,
                groupMemberIds: eventGroupQuery.data.memberIds,
                eventId: eventQuery.data.id,
                excludedNonFriendCount: 0,
              };
            }
            if (eventGroupQuery.isSuccess) return { candidateIds: fallbackCandidateIds, ignored: 'event', excludedNonFriendCount: 0 };
            return { candidateIds: [], excludedNonFriendCount: 0 };
          }
          if (!friendsQuery.isSuccess) return { candidateIds: [], excludedNonFriendCount: 0 };
          const r = resolveEventParticipants(eventQuery.data, undefined, acceptedFriendIds, uid ?? '');
          return { candidateIds: r.candidateIds, currency: r.currency, eventId: eventQuery.data.id, excludedNonFriendCount: r.excludedNonFriendCount };
        }
        if (eventQuery.isSuccess) return { candidateIds: fallbackCandidateIds, ignored: 'event', excludedNonFriendCount: 0 };
        return { candidateIds: [], excludedNonFriendCount: 0 };
      }
      if (params.friend) {
        if (uid && acceptedFriendIds.includes(params.friend)) {
          return { candidateIds: [uid, params.friend], excludedNonFriendCount: 0 };
        }
        if (friendsQuery.isSuccess) return { candidateIds: fallbackCandidateIds, ignored: 'friend', excludedNonFriendCount: 0 };
        return { candidateIds: [], excludedNonFriendCount: 0 };
      }
      return { candidateIds: fallbackCandidateIds, excludedNonFriendCount: 0 };
    }
    // edit
    const base = expense?.groupId ? (groupQuery.data?.memberIds ?? []) : fallbackCandidateIds;
    return {
      candidateIds: Array.from(new Set([...base, ...(expense?.memberIds ?? [])])),
      groupId: expense?.groupId ?? undefined,
      groupMemberIds: expense?.groupId ? groupQuery.data?.memberIds : undefined,
      eventId: expense?.eventId ?? undefined,
      excludedNonFriendCount: 0,
    };
  }, [
    mode,
    params,
    groupQuery.data,
    groupQuery.isSuccess,
    eventQuery.data,
    eventQuery.isSuccess,
    eventGroupQuery.data,
    eventGroupQuery.isSuccess,
    friendsQuery.isSuccess,
    fallbackCandidateIds,
    acceptedFriendIds,
    uid,
    expense,
  ]);

  const profilesQuery = useProfiles(resolved.candidateIds);
  const names = React.useMemo(() => namesFrom(profilesQuery.data), [profilesQuery.data]);
  const candidates: Candidate[] = React.useMemo(
    () => resolved.candidateIds.map((id) => ({ id, name: names[id] ?? 'Unknown' })),
    [resolved.candidateIds, names],
  );

  const defaultCurrency = expense?.currency ?? resolved.currency ?? preferredCurrency;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(ExpenseFormValuesSchema),
    defaultValues:
      mode === 'edit' && expense
        ? {
            description: expense.description,
            amount: String(expense.amount),
            currency: expense.currency,
            date: expense.date,
            category: (expense.category as LegacyCategoryKey) ?? 'other',
            paidBy: expense.paidBy,
            participantIds: expense.splits.map((s) => s.userId),
            splitType: expense.splitType,
            // Populated for real right after mount by the effect below (it
            // needs `expense.splits[].amount`/`.percentage`, not just ids).
            shares: {},
            notes: expense.notes ?? '',
          }
        : {
            description: '',
            amount: '',
            currency: defaultCurrency,
            date: formatCalendarDate(new Date()),
            category: 'other',
            paidBy: uid ?? '',
            participantIds: [],
            splitType: 'equal',
            shares: {},
            notes: '',
          },
  });

  // Edit mode's initial `shares` needs the ACTUAL per-split shares (exact
  // dollar amount, or percentage), computed once from the loaded expense —
  // done here (not inline above) because it reads `expense.splits`, not
  // `expense.splitType` twice.
  const editSharesAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (mode !== 'edit' || !expense || editSharesAppliedRef.current) return;
    editSharesAppliedRef.current = true;
    const shares: Record<string, number> = {};
    for (const split of expense.splits) {
      shares[split.userId] = expense.splitType === 'percentage' ? (split.percentage ?? 0) : split.amount;
    }
    form.setValue('shares', shares);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, guarded by the ref
  }, [mode, expense]);

  // Create-mode context defaults (currency / paidBy / participants), applied
  // ONCE the resolution path has settled and only while the user hasn't
  // touched the form yet — a query resolving after the user already started
  // typing must never clobber their input.
  const defaultsAppliedRef = React.useRef(false);
  const eventContextSettled =
    eventQuery.isSuccess &&
    (!eventQuery.data || (eventQuery.data.groupId ? eventGroupQuery.isSuccess : friendsQuery.isSuccess));
  const contextSettled =
    mode === 'create' &&
    (params.group ? groupQuery.isSuccess : params.event ? eventContextSettled : friendsQuery.isSuccess);
  React.useEffect(() => {
    if (mode !== 'create' || defaultsAppliedRef.current || !contextSettled || form.formState.isDirty) return;
    defaultsAppliedRef.current = true;
    form.setValue('currency', resolved.currency ?? preferredCurrency);
    form.setValue('paidBy', uid ?? '');
    form.setValue('participantIds', resolved.candidateIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, guarded by the ref
  }, [mode, contextSettled]);

  const [files, setFiles] = React.useState<File[]>([]);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [invariantError, setInvariantError] = React.useState<string | null>(null);

  // Edit-mode-only UX gap (coordinator review): if the CURRENT editor isn't
  // an accepted friend of everyone already on a no-group expense, the
  // `expenses_update` RLS policy denies the save outright. Rather than let
  // that surface as B9's generic post-submit error, this form knows upfront
  // (derived from `useFriends`) and disables Save with an explicit reason.
  // Group expenses are unaffected — any group member may edit one. UX only;
  // RLS is still the sole authority.
  const editBlockedByFriendship = React.useMemo(() => {
    if (mode !== 'edit' || !expense || expense.groupId || !uid || !friendsQuery.isSuccess) return false;
    return violatesNoGroupInvariant(expense.memberIds, acceptedFriendIds, uid);
  }, [mode, expense, uid, friendsQuery.isSuccess, acceptedFriendIds]);
  const createId = React.useMemo(() => (mode === 'create' ? expensesRepo.generateId() : undefined), [mode]);

  const createMutation = useCreateExpenseWithReceipts();
  const updateMutation = useUpdateExpense();
  const addReceiptsMutation = useAddReceipts();
  const removeReceiptMutation = useRemoveReceipt();

  const pending =
    createMutation.isPending || updateMutation.isPending || addReceiptsMutation.isPending;

  const watchedSplitType = form.watch('splitType');
  const watchedParticipantIds = form.watch('participantIds');
  const watchedShares = form.watch('shares');
  const watchedAmountRaw = form.watch('amount');
  const amount = Number(watchedAmountRaw) || 0;

  async function handleValid(values: ExpenseFormValues) {
    const splitValidation = validateSplit(values.splitType, Number(values.amount), values.participantIds, values.shares);
    if (!splitValidation.valid) {
      notifyError(splitValidation.message ?? 'The split is not balanced yet.');
      return;
    }

    const splits = buildSplits(values.splitType, Number(values.amount), values.participantIds, values.paidBy, values.shares);
    const memberIds = resolved.groupId
      ? (resolved.groupMemberIds ?? values.participantIds)
      : Array.from(new Set([...values.participantIds, values.paidBy, uid].filter((v): v is string => Boolean(v))));

    // Defensive pre-submit check (coordinator review, risk:high): mirrors the
    // `expenses_insert`/`_update` RLS policy's own `group_id is null` branch
    // — every member other than the caller must be an accepted friend.
    // Never trust client state to have kept this true on its own (a
    // friendship can be revoked out from under an already-selected
    // participant) — refuse BEFORE sending a request RLS would only deny
    // anyway. UX only; RLS stays the sole authority either way.
    if (!resolved.groupId && uid && violatesNoGroupInvariant(memberIds, acceptedFriendIds, uid)) {
      setInvariantError(
        "Something about who's on this expense changed. Please review the participants and try again.",
      );
      return;
    }
    setInvariantError(null);

    if (mode === 'create') {
      if (!uid || !createId) return;
      const input: CreateExpenseInput = {
        groupId: resolved.groupId ?? null,
        description: values.description,
        amount: Number(values.amount),
        currency: values.currency,
        paidBy: values.paidBy,
        splitType: values.splitType,
        splits,
        date: values.date,
        category: values.category,
        notes: values.notes || undefined,
        memberIds,
        createdBy: uid,
        eventId: resolved.eventId,
      };

      try {
        const result = await createMutation.mutateAsync({ id: createId, input, files });
        // afterNavigation: true — the location.assign() right below is a
        // full page load in this static MPA that would otherwise discard
        // this toast (including the partial-failure honesty message)
        // before it renders (plan B17b amendment, ADR 0008).
        if (result.failedUploadCount > 0) {
          notifyError(
            `Expense saved, but ${result.failedUploadCount} receipt${result.failedUploadCount === 1 ? '' : 's'} couldn't be uploaded. You can add ${result.failedUploadCount === 1 ? 'it' : 'them'} again from Edit.`,
            { afterNavigation: true },
          );
        } else {
          notifySuccess('Expense saved', { afterNavigation: true });
        }
        window.location.assign(withBase(`/expenses/${result.expense.id}`));
      } catch {
        notifyError('Could not save this expense. Please try again.');
      }
      return;
    }

    // edit
    if (!expense) return;
    try {
      await updateMutation.mutateAsync({
        id: expense.id,
        patch: {
          description: values.description,
          amount: Number(values.amount),
          currency: values.currency,
          paidBy: values.paidBy,
          splitType: values.splitType,
          splits,
          date: values.date,
          category: values.category,
          notes: values.notes || undefined,
          memberIds,
        },
      });

      let failedUploadCount = 0;
      if (files.length > 0) {
        const receiptResult = await addReceiptsMutation.mutateAsync({ id: expense.id, files });
        failedUploadCount = receiptResult.failedUploadCount;
      }

      // afterNavigation: true — see the create branch above for why.
      if (failedUploadCount > 0) {
        notifyError(
          `Expense saved, but ${failedUploadCount} receipt${failedUploadCount === 1 ? '' : 's'} couldn't be uploaded. You can add ${failedUploadCount === 1 ? 'it' : 'them'} again from Edit.`,
          { afterNavigation: true },
        );
      } else {
        notifySuccess('Expense saved', { afterNavigation: true });
      }
      window.location.assign(withBase(`/expenses/${expense.id}`));
    } catch {
      notifyError('Could not save this expense. Please try again.');
    }
  }

  async function handleRemoveExistingReceipt(path: string) {
    if (!expense) return;
    try {
      await removeReceiptMutation.mutateAsync({ id: expense.id, path });
      notifySuccess('Receipt removed');
    } catch {
      notifyError('Could not remove this receipt.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleValid)} noValidate className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
        {/* Not an <h1> on purpose: the mounting island/route view (`ExpenseFormIsland`/`ExpenseEditView`) owns
            the page's ONE <h1>, sr-only and OUTSIDE the auth-gated subtree (same as `ExpenseDetailView`'s
            `Editable` heading), so axe's `page-has-heading-one` passes in every auth state, not just this one. */}
        <p className="font-display text-2xl font-semibold text-foreground">{mode === 'create' ? 'New expense' : 'Edit expense'}</p>

        {resolved.ignored && (
          <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            We couldn&apos;t find that {resolved.ignored} — showing your friends instead.
          </p>
        )}

        {resolved.excludedNonFriendCount > 0 && (
          <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            {resolved.excludedNonFriendCount} {resolved.excludedNonFriendCount === 1 ? 'person' : 'people'} in this
            event {resolved.excludedNonFriendCount === 1 ? "isn't" : "aren't"} in your friends yet, so they can&apos;t
            be added to this expense.
          </p>
        )}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="expense-form-description">Description</FormLabel>
              <FormControl>
                <Input id="expense-form-description" placeholder="e.g., Dinner at restaurant" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="expense-form-amount">Amount</FormLabel>
                <FormControl>
                  <Input id="expense-form-amount" inputMode="decimal" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <CurrencySelector id="expense-form-currency" value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel htmlFor="expense-form-date">Date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value ? parseCalendarDate(field.value) : undefined}
                    onValueChange={(date) => field.onChange(date ? formatCalendarDate(date) : '')}
                    triggerProps={{ id: 'expense-form-date' }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="expense-form-category">Category</FormLabel>
                <FormControl>
                  <select
                    id="expense-form-category"
                    value={field.value}
                    onChange={field.onChange}
                    className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {LEGACY_CATEGORY_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {CATEGORY_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="paidBy"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ParticipantPicker
                  candidates={candidates}
                  participantIds={watchedParticipantIds}
                  onParticipantIdsChange={(ids) => form.setValue('participantIds', ids, { shouldDirty: true })}
                  paidBy={field.value}
                  onPaidByChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
              {form.formState.errors.participantIds && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.participantIds.message}</p>
              )}
            </FormItem>
          )}
        />

        <ExpenseSplitter
          splitType={watchedSplitType}
          onSplitTypeChange={(type) => form.setValue('splitType', type, { shouldDirty: true })}
          participantIds={watchedParticipantIds}
          amount={amount}
          shares={watchedShares}
          onSharesChange={(shares) => form.setValue('shares', shares, { shouldDirty: true })}
          names={names}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel htmlFor="expense-form-notes">Notes</FormLabel>
              <FormControl>
                <Textarea id="expense-form-notes" placeholder="Optional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'edit' && expense?.images && expense.images.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Existing receipts</span>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {expense.images.map((path) => (
                <li key={path} className="relative">
                  <ReceiptImage path={path} alt="Existing receipt" className="h-20 w-full rounded-md object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingReceipt(path)}
                    aria-label={`Remove existing receipt ${path}`}
                    disabled={removeReceiptMutation.isPending}
                    className="absolute -right-1.5 -top-1.5 rounded-full bg-background px-1 text-xs text-muted-foreground shadow ring-1 ring-border hover:text-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Receipts</span>
          <ReceiptUploader
            files={files}
            onChange={setFiles}
            existingCount={mode === 'edit' ? (expense?.images?.length ?? 0) : 0}
            onError={setFileError}
          />
          {fileError && (
            <p role="alert" className="text-sm text-destructive">
              {fileError}
            </p>
          )}
        </div>

        {editBlockedByFriendship && (
          <p role="status" className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
            You can view this expense, but only someone who is friends with everyone on it can edit it here.
          </p>
        )}

        {invariantError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {invariantError}
          </p>
        )}

        <Button type="submit" disabled={pending || editBlockedByFriendship} aria-busy={pending}>
          {pending ? 'Saving…' : mode === 'create' ? 'Save expense' : 'Save changes'}
        </Button>
      </form>
    </Form>
  );
}
