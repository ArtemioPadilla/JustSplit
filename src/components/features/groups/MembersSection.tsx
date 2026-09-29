import * as React from 'react';
import { OfflineWriteNotice } from '@/components/features/OfflineWriteNotice';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { isLastAdmin, withAddedMembers, withRemovedMember } from '@/domain/groups';
import { useUpdateGroup } from '@/lib/data/hooks/useUpdateGroup';
import { refuseIfOffline, writeErrorMessage } from '@/lib/offline-write';
import { useCanWrite, useSharedWrite, type WriteState } from '@/lib/use-can-write';
import { notifyError, notifySuccess } from '@/stores/notifications';
import { cn } from '@/lib/utils';
import type { ExpenseGroup } from '@/schemas/group';

export interface MembersSectionProps {
  group: ExpenseGroup;
  /** Live names via `useProfiles`, keyed by userId — falls back to the member's own stored `displayName` when a profile hasn't resolved. */
  names: Record<string, string>;
  /** The signed-in viewer. */
  uid: string;
  /** Accepted friends of `uid` who are not already members — the "Add members" dialog's candidate pool. */
  friendCandidates: { id: string; name: string }[];
  /** The page's connection state (plan B19c, ADR 0015); standing alone, the section reads it and shows its own sentence. */
  write?: WriteState;
}

/**
 * The group detail island's member list + admin-only management (plan
 * B12, risk:high). Every management action here is UX-only:
 * `guard_expense_groups`'s BEFORE UPDATE trigger is the actual authority
 * (admin-only, every added member an accepted friend of the acting admin —
 * CLAUDE.md rule 8). The one client-side preflight left is `isLastAdmin`: a
 * group with no admin can never be managed or deleted again, which RLS cannot
 * express. Removing a member no longer needs a preflight (ADR 0013): rows that
 * still name them stay readable and editable, so nothing is locked.
 */
export function MembersSection({ group, names, uid, friendCandidates, write: pageWrite }: MembersSectionProps) {
  const isAdmin = group.adminIds.includes(uid);
  const { write, owned } = useSharedWrite(pageWrite);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium text-muted-foreground">Members ({group.members.length})</h2>
        {isAdmin && <AddMembersDialog group={group} candidates={friendCandidates} write={write} />}
      </div>
      {owned && isAdmin && <OfflineWriteNotice write={write} />}
      <ul className="flex flex-col gap-2">
        {group.members.map((member) => {
          const name = names[member.userId] ?? member.displayName;
          const lastAdmin = isLastAdmin(member.userId, group.adminIds);
          return (
            <li key={member.userId} className="flex flex-col gap-1 rounded-md border border-border px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {name}
                  <Badge variant="outline">{member.role}</Badge>
                </span>
                {isAdmin && !lastAdmin && <RemoveMemberDialog group={group} memberId={member.userId} name={name} write={write} />}
              </div>
              {isAdmin && lastAdmin && (
                <p className="text-xs text-muted-foreground">{name} is the last admin and can&apos;t be removed.</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface RemoveMemberDialogProps {
  group: ExpenseGroup;
  memberId: string;
  name: string;
  /** The section's connection state, for the trigger (one sentence for every row). */
  write: WriteState;
}

/** Same compound-component shape as `RemoveFriendDialog`/`DeleteExpenseDialog`; the trigger's visible text stays plain "Remove" with an `aria-label` distinguishing WHICH member for a screen-reader user (several rows share the same visible label). */
function RemoveMemberDialog({ group, memberId, name, write }: RemoveMemberDialogProps) {
  const [open, setOpen] = React.useState(false);
  const updateGroup = useUpdateGroup();
  // The dialog has its own state: it can be open when the connection drops, and its confirm button must say why it is blocked.
  const inDialog = useCanWrite();

  async function handleConfirm() {
    if (refuseIfOffline()) return;
    const patch = withRemovedMember(group, memberId);
    try {
      await updateGroup.mutateAsync({ id: group.id, patch: patch as Partial<ExpenseGroup> });
      notifySuccess('Member removed');
      setOpen(false);
    } catch (error) {
      notifyError(writeErrorMessage(error, 'Could not remove this member'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && refuseIfOffline()) return;
        setOpen(next);
      }}
    >
      <DialogTrigger aria-label={`Remove ${name}`} className={cn(buttonVariants({ variant: 'outline' }))} {...write.blocked}>
        Remove
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {name}?</DialogTitle>
          <DialogDescription>{name} will no longer be a member of this group.</DialogDescription>
        </DialogHeader>
        <OfflineWriteNotice write={inDialog} />
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={updateGroup.isPending}
            aria-busy={updateGroup.isPending}
            className={cn(buttonVariants({ variant: 'destructive' }))}
            {...inDialog.blocked}
          >
            Remove
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AddMembersDialogProps {
  group: ExpenseGroup;
  candidates: { id: string; name: string }[];
  /** The section's connection state, for the trigger. */
  write: WriteState;
}

/** The whole Dialog composition lives here (CLAUDE.md compound-component rule), same shape as `DeleteExpenseDialog`. */
function AddMembersDialog({ group, candidates, write }: AddMembersDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const updateGroup = useUpdateGroup();
  // The dialog has its own state: it can be open when the connection drops, and its confirm button must say why it is blocked.
  const inDialog = useCanWrite();

  function toggle(id: string, checked: boolean) {
    setSelectedIds((prev) => (checked ? [...prev, id] : prev.filter((existing) => existing !== id)));
  }

  async function handleConfirm() {
    if (refuseIfOffline()) return;
    const invitees = candidates.filter((c) => selectedIds.includes(c.id)).map((c) => ({ userId: c.id, displayName: c.name }));
    const patch = withAddedMembers(group, invitees, group.adminIds[0] ?? group.createdBy, new Date().toISOString());
    try {
      await updateGroup.mutateAsync({ id: group.id, patch: patch as Partial<ExpenseGroup> });
      notifySuccess('Members added');
      setOpen(false);
      setSelectedIds([]);
    } catch (error) {
      notifyError(writeErrorMessage(error, 'Could not add these members'));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next && refuseIfOffline()) return;
        setOpen(next);
      }}
    >
      <DialogTrigger className={cn(buttonVariants({ variant: 'outline' }))} {...write.blocked}>
        Add members
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>Members are picked from your accepted friends who aren&apos;t already in this group.</DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No accepted friends left to add.</p>
        ) : (
          <fieldset className="flex flex-col gap-2">
            {candidates.map((candidate) => (
              <label key={candidate.id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                <Checkbox
                  checked={selectedIds.includes(candidate.id)}
                  onCheckedChange={(checked) => toggle(candidate.id, checked === true)}
                  aria-label={candidate.name}
                />
                {candidate.name}
              </label>
            ))}
          </fieldset>
        )}
        <OfflineWriteNotice write={inDialog} />
        <DialogFooter>
          <DialogClose className={cn(buttonVariants({ variant: 'outline' }))}>Cancel</DialogClose>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={updateGroup.isPending || selectedIds.length === 0}
            aria-busy={updateGroup.isPending}
            className={cn(buttonVariants({ variant: 'default' }))}
            {...inDialog.blocked}
          >
            Add
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
