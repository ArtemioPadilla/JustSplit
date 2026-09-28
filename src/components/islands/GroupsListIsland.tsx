import * as React from 'react';
import { PlusIcon } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useGroups } from '@/lib/data/hooks/useGroups';
import { withBase } from '@/lib/href';
import { cn } from '@/lib/utils';
import { $user } from '@/stores/auth';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/** Plan B12: linked from the list's header row, present in every content state (empty, loaded, error). */
function NewGroupLink() {
  return (
    <a href={withBase('/groups/new')} className={cn(buttonVariants({ variant: 'default' }))}>
      <PlusIcon aria-hidden="true" className="size-4" />
      New group
    </a>
  );
}

/**
 * `/groups/list`'s route island (plan B12): `ErrorBoundary > AuthIsland >
 * AuthGate > Content`, the same composition and error/retry handling as
 * `ExpenseListIsland`/`FriendsIsland`. Mounted `client:only="react"` from
 * `src/pages/groups/list.astro`.
 */
export default function GroupsListIsland() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Groups</h1>
        <NewGroupLink />
      </div>
      <ErrorBoundary name="GroupsListIsland">
        <AuthIsland>
          <AuthGate>
            <GroupsListContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}

function GroupsListContent() {
  const user = useStore($user);
  const uid = user?.uid;

  const groupsQuery = useGroups(uid);

  if (groupsQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading your groups"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => groupsQuery.refetch()} disabled={groupsQuery.isRetrying} aria-busy={groupsQuery.isRetrying}>
            Retry
          </Button>
        }
      />
    );
  }

  if (groupsQuery.data === undefined) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const groups = groupsQuery.data;
  if (groups.length === 0) {
    return <EmptyState title="No groups yet" description="Create a group to start tracking shared expenses together." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {groups.map((group) => (
        <li key={group.id} className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3">
          <a href={withBase(`/groups/${group.id}`)} className="font-medium text-foreground underline-offset-2 hover:underline">
            {group.name}
          </a>
          <span className="text-sm text-muted-foreground">
            {group.memberIds.length} member{group.memberIds.length === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  );
}
