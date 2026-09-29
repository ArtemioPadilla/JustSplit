import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { Checkbox } from '@/components/ui/checkbox';
import { buttonVariants } from '@/components/ui/button';
import { useAttachEventsToGroup } from '@/lib/data/hooks/useAttachEventsToGroup';
import { useAttachExpensesToGroup } from '@/lib/data/hooks/useAttachExpensesToGroup';
import { GroupNotFoundError } from '@/lib/data/repos/groups';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useSharedWrite, type WriteState } from '@/lib/use-can-write';
import { cn } from '@/lib/utils';
import { notifyError, notifySuccess } from '@/stores/notifications';

export interface AttachableExpense {
  id: string;
  description: string;
}

export interface AttachableEvent {
  id: string;
  name: string;
}

export interface AttachRowsPanelProps {
  groupId: string;
  /** Already filtered by the caller (`domain/groups.ts#filterAttachableExpenses`) — every id here is eligible. */
  attachableExpenses: AttachableExpense[];
  /** Already filtered by the caller (`domain/groups.ts#filterAttachableEvents`). */
  attachableEvents: AttachableEvent[];
  /** The page's connection state (plan B19c, ADR 0015); standing alone, the panel reads it and shows its own sentence. */
  write?: WriteState;
}

/**
 * The group detail island's "attach existing rows" panel (plan B12).
 * `repos.groups.attachExpenses`/`attachEvents` return `{ attached,
 * skipped }` rather than throwing for a row that wasn't eligible or didn't
 * verify — this panel's own toast is the ONE place that summary reaches
 * the user, honestly: a full success is one toast, a partial one names how
 * many could not be attached rather than claiming every checked row
 * succeeded.
 */
export function AttachRowsPanel({ groupId, attachableExpenses, attachableEvents, write: pageWrite }: AttachRowsPanelProps) {
  const { write, owned } = useSharedWrite(pageWrite);
  if (attachableExpenses.length === 0 && attachableEvents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nothing to attach right now — ungrouped expenses/events whose participants are all already in this group will show up here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {owned && <OfflineWriteNotice write={write} />}
      {attachableExpenses.length > 0 && <AttachExpensesSection groupId={groupId} expenses={attachableExpenses} write={write} />}
      {attachableEvents.length > 0 && <AttachEventsSection groupId={groupId} events={attachableEvents} write={write} />}
    </div>
  );
}

function summarize(kind: 'expense' | 'event', result: { attached: string[]; skipped: string[] }): void {
  if (result.skipped.length === 0) {
    notifySuccess(`Attached ${result.attached.length} ${kind}${result.attached.length === 1 ? '' : 's'}`);
    return;
  }
  notifyError(
    `Attached ${result.attached.length} ${kind}${result.attached.length === 1 ? '' : 's'}; ${result.skipped.length} could not be attached.`,
  );
}

/**
 * `mutateAsync` itself can reject too (coordinator review) — not just the
 * per-row eligibility/verification `{ attached, skipped }` `summarize`
 * handles: `GroupNotFoundError` (the group deleted mid-session by another
 * admin/tab — `repos.groups.attachExpenses`/`attachEvents`'s own preflight)
 * or any adapter/network failure the batch write itself hit. Both get an
 * honest, generic toast — never the raw error/SQL/policy text (CLAUDE.md).
 */
function reportAttachFailure(error: unknown): void {
  if (error instanceof GroupNotFoundError) {
    notifyError('This group no longer exists');
    return;
  }
  notifyError(writeErrorMessage(error, "Couldn't attach these items. Please try again."));
}

function AttachExpensesSection({ groupId, expenses, write }: { groupId: string; expenses: AttachableExpense[]; write: WriteState }) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const attachExpenses = useAttachExpensesToGroup();

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)));
  }

  async function handleAttach() {
    if (refuseIfOffline()) return;
    try {
      const result = await attachExpenses.mutateAsync({ groupId, expenseIds: selectedIds });
      summarize('expense', result);
      setSelectedIds([]);
    } catch (error) {
      // Selection is kept on failure (never cleared) so a retry doesn't
      // start from scratch; `attachExpenses.isPending` already settles back
      // to `false` once `mutateAsync` rejects, restoring the button.
      reportAttachFailure(error);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">Attach expenses</legend>
      {expenses.map((expense) => (
        <label key={expense.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={selectedIds.includes(expense.id)}
            onCheckedChange={(checked) => toggle(expense.id, checked === true)}
            aria-label={expense.description}
          />
          {expense.description}
        </label>
      ))}
      <button
        type="button"
        onClick={handleAttach}
        disabled={selectedIds.length === 0 || attachExpenses.isPending}
        aria-busy={attachExpenses.isPending}
        className={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
        {...write.blocked}
      >
        Attach expenses
      </button>
    </fieldset>
  );
}

function AttachEventsSection({ groupId, events, write }: { groupId: string; events: AttachableEvent[]; write: WriteState }) {
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const attachEvents = useAttachEventsToGroup();

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)));
  }

  async function handleAttach() {
    if (refuseIfOffline()) return;
    try {
      const result = await attachEvents.mutateAsync({ groupId, eventIds: selectedIds });
      summarize('event', result);
      setSelectedIds([]);
    } catch (error) {
      reportAttachFailure(error);
    }
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium text-foreground">Attach events</legend>
      {events.map((event) => (
        <label key={event.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={selectedIds.includes(event.id)}
            onCheckedChange={(checked) => toggle(event.id, checked === true)}
            aria-label={event.name}
          />
          {event.name}
        </label>
      ))}
      <button
        type="button"
        onClick={handleAttach}
        disabled={selectedIds.length === 0 || attachEvents.isPending}
        aria-busy={attachEvents.isPending}
        className={cn(buttonVariants({ variant: 'outline' }), 'self-start')}
        {...write.blocked}
      >
        Attach events
      </button>
    </fieldset>
  );
}
