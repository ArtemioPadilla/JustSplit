import * as React from 'react';
import { useStore } from '@nanostores/react';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Editable } from '@/components/ui/editable';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { CurrencySelector, useWarmCurrencyCombobox } from '@/components/features/currency/CurrencySelector';
import { DeleteExpenseDialog } from '@/components/features/expenses/DeleteExpenseDialog';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { ReceiptGallery } from '@/components/features/expenses/ReceiptGallery';
import { parseCalendarDate } from '@/domain/dates';
import { isLegacySettled } from '@/domain/ledger';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvent } from '@/lib/data/hooks/useEvent';
import { useExpense } from '@/lib/data/hooks/useExpense';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useUpdateExpense } from '@/lib/data/hooks/useUpdateExpense';
import { withBase } from '@/lib/href';
import { writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import type { Expense, SplitType } from '@/schemas/expense';
import { $preferredCurrency } from '@/stores/preferences';
import { $user } from '@/stores/auth';
import { notifyError } from '@/stores/notifications';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';

const SPLIT_TYPE_LABELS: Record<SplitType, string> = {
  equal: 'Split equally',
  exact: 'Exact amounts',
  percentage: 'Percentage split',
};

/**
 * `/expenses/<id>`'s route view (plan B9), loaded through `AppRouterIsland`'s
 * `React.lazy` per-route boundary. `AuthIsland > AuthGate > Content` — the
 * outer `ErrorBoundary` is the 404 shell's own, per-route one
 * (`AppRouterIsland`'s `ErrorBoundary name={\`AppRouterIsland/${match.name}\`}`),
 * so this view does not nest a second one.
 *
 * An id that resolves to no row renders the SAME `NotFoundView` whether the
 * expense never existed or an RLS policy hides it from this user — the
 * detail query and the 404 shell must never let a caller distinguish
 * "doesn't exist" from "exists but you can't see it" (spec's leaked-id
 * reasoning, ADR 0002).
 */
export default function ExpenseDetailView({ id }: { id: string }) {
  // Fetch the currency combobox chunk in idle time; the selector below renders after auth and data (B19b).
  useWarmCurrencyCombobox();
  return (
    <>
      <h1 className="sr-only">Expense</h1>
      <AuthIsland>
        <AuthGate>
          <ExpenseDetailContent id={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function namesFrom(rows: { id: string; name: string | null }[] | undefined): Record<string, string> {
  const map: Record<string, string> = {};
  for (const row of rows ?? []) map[row.id] = row.name ?? 'Unknown';
  return map;
}

function ExpenseDetailContent({ id }: { id: string }) {
  const expenseQuery = useExpense(id);

  if (expenseQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this expense"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => expenseQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (expenseQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!expenseQuery.data) {
    return <NotFoundView />;
  }

  return <ExpenseDetailLoaded expense={expenseQuery.data} />;
}

function ExpenseDetailLoaded({ expense }: { expense: Expense }) {
  const user = useStore($user);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid;

  const eventQuery = useEvent(expense.eventId ?? undefined);

  const participantIds = React.useMemo(() => {
    const ids = new Set<string>([expense.paidBy]);
    for (const split of expense.splits) ids.add(split.userId);
    return Array.from(ids);
  }, [expense]);
  const profilesQuery = useProfiles(participantIds);
  const names = React.useMemo(() => namesFrom(profilesQuery.data), [profilesQuery.data]);

  // This view's OWN local display currency (plan B9, same as
  // ExpenseListIsland) — initialised from $preferredCurrency, never written
  // back to the profile.
  const [displayCurrency, setDisplayCurrency] = React.useState(preferredCurrency);
  const { convert, ready } = useDisplayConversion([expense.currency], displayCurrency);

  // `Editable` is used UNCONTROLLED (`defaultValue`, per its own precedent —
  // `editable.behavior.test.tsx`) so typing isn't fought by a fixed `value`
  // prop; these two draft states hold what's currently DISPLAYED and are
  // kept in sync with the server-confirmed `expense` prop (a real update
  // landing invalidates the query, which flows back here). `key={draft}`
  // below forces `Editable` to remount with the new `defaultValue` on both
  // an optimistic forward update AND a revert — the only way to change an
  // uncontrolled component's displayed value from outside itself.
  //
  // Adjusted DURING RENDER (React's own "adjusting state when a prop
  // changes" pattern), not inside a `useEffect` — an effect would commit
  // one extra, visible render with the STALE draft before catching up;
  // this bails out in the same render pass instead. `prevDescription`/
  // `prevNotes` are the change-detection cells, deliberately separate from
  // the draft state itself (which also changes on every optimistic
  // update/revert that has nothing to do with a new `expense` prop).
  const [descriptionDraft, setDescriptionDraft] = React.useState(expense.description);
  const [prevDescription, setPrevDescription] = React.useState(expense.description);
  if (expense.description !== prevDescription) {
    setPrevDescription(expense.description);
    setDescriptionDraft(expense.description);
  }
  const [notesDraft, setNotesDraft] = React.useState(expense.notes ?? '');
  const [prevNotes, setPrevNotes] = React.useState(expense.notes ?? '');
  if ((expense.notes ?? '') !== prevNotes) {
    setPrevNotes(expense.notes ?? '');
    setNotesDraft(expense.notes ?? '');
  }

  // Plan B19c (ADR 0015): the page owns ONE connection state and shows ONE sentence for the inline edits and Delete.
  const write = useCanWrite();
  const updateExpense = useUpdateExpense();
  const handleDescriptionCommit = React.useCallback(
    async (value: string) => {
      const previous = descriptionDraft;
      setDescriptionDraft(value);
      try {
        await updateExpense.mutateAsync({ id: expense.id, patch: { description: value } });
      } catch (error) {
        setDescriptionDraft(previous);
        notifyError(writeErrorMessage(error, 'Could not update the description'));
      }
    },
    [updateExpense, expense.id, descriptionDraft],
  );
  const handleNotesCommit = React.useCallback(
    async (value: string) => {
      const previous = notesDraft;
      setNotesDraft(value);
      try {
        await updateExpense.mutateAsync({ id: expense.id, patch: { notes: value } });
      } catch (error) {
        setNotesDraft(previous);
        notifyError(writeErrorMessage(error, 'Could not update the notes'));
      }
    },
    [updateExpense, expense.id, notesDraft],
  );

  const canDelete = Boolean(uid && ((expense.createdBy ?? '') === uid || expense.paidBy === uid));
  const csvUsers = React.useMemo(() => Object.entries(names).map(([userId, name]) => ({ id: userId, name })), [names]);
  const csvEvents = React.useMemo(
    () => (eventQuery.data ? [{ id: eventQuery.data.id, name: eventQuery.data.name }] : []),
    [eventQuery.data],
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Editable
          key={descriptionDraft}
          defaultValue={descriptionDraft}
          onValueCommit={handleDescriptionCommit}
          readOnly={!write.canWrite}
          describedBy={write.noticeId}
          className="font-display text-2xl font-semibold text-foreground"
        />
        {/* Only a legacy (imported) settledAt: nothing per-expense is derivable from the ledger (ADR 0014). */}
        {isLegacySettled(expense) && <Badge>Settled</Badge>}
      </div>

      <OfflineWriteNotice write={write} />

      <div className="flex flex-col gap-2">
        <CurrencySelector
          value={displayCurrency}
          onChange={setDisplayCurrency}
          label="Display currency"
          id="expense-detail-currency"
          className="max-w-xs"
        />
        <p className="text-3xl font-semibold text-foreground">
          {ready ? (
            <>
              {displayCurrency} {convert(expense.amount, expense.currency).toFixed(2)}
            </>
          ) : (
            <Skeleton className="h-9 w-32" />
          )}
        </p>
        {ready && expense.currency !== displayCurrency && (
          <p className="text-sm text-muted-foreground">
            (Originally: {expense.amount.toFixed(2)} {expense.currency})
          </p>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Date</dt>
          <dd className="text-foreground">{parseCalendarDate(expense.date).toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid by</dt>
          <dd className="text-foreground">{names[expense.paidBy] ?? 'Unknown'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Event</dt>
          <dd className="text-foreground">
            {eventQuery.data ? (
              <a href={withBase(`/events/${eventQuery.data.id}`)} className="underline underline-offset-2">
                {eventQuery.data.name}
              </a>
            ) : (
              'No event'
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Split method</dt>
          <dd className="text-foreground">{SPLIT_TYPE_LABELS[expense.splitType]}</dd>
        </div>
      </dl>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Split among ({expense.splits.length})</h2>
        {expense.splits.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {expense.splits.map((split) => (
              <li key={split.userId} className="flex justify-between text-sm">
                <span>{names[split.userId] ?? 'Unknown'}</span>
                <span className="text-muted-foreground">
                  {expense.currency} {split.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">This expense isn&apos;t split with anyone.</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">Notes</h2>
        <Editable
          key={notesDraft}
          defaultValue={notesDraft}
          placeholder="Click to add notes"
          onValueCommit={handleNotesCommit}
          readOnly={!write.canWrite}
          describedBy={write.noticeId}
        />
      </div>

      {expense.images && expense.images.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Receipts</h2>
          <ReceiptGallery paths={expense.images} />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {/* Plan B10: shown to any member, not just the creator/payer — RLS
            (update = member) is the authority, no client-side gate (unlike
            Delete, below, which stays creator/payer-only). */}
        <a href={withBase(`/expenses/edit/${expense.id}`)} className={cn(buttonVariants({ variant: 'outline' }))}>
          Edit
        </a>
        <ExportCsvButton expenses={[expense]} users={csvUsers} events={csvEvents} filename={`expense-${expense.id}.csv`} />
        {canDelete && <DeleteExpenseDialog id={expense.id} description={expense.description} write={write} />}
      </div>
    </div>
  );
}
