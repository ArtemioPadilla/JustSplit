import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { EventForm } from '@/components/features/events/EventForm';
import { useEvent } from '@/lib/data/hooks/useEvent';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';

/**
 * `/events/edit/<id>`'s route view (plan B11b), loaded through
 * `AppRouterIsland`'s `React.lazy` per-route boundary (same pattern as
 * `ExpenseEditView`) — the outer `ErrorBoundary` is the 404 shell's own, so
 * this view does not nest a second one.
 *
 * An id that resolves to no row (missing, or hidden by RLS) renders the SAME
 * `NotFoundView` the shell uses for an unknown path — same leaked-id
 * reasoning as every other dynamic route (ADR 0002). Any event member may edit
 * (`events_update` = member; there is no client-side gate).
 */
export default function EventEditView({ id }: { id: string }) {
  return (
    <>
      <h1 className="sr-only">Edit event</h1>
      <AuthIsland>
        <AuthGate>
          <EventEditContent id={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function EventEditContent({ id }: { id: string }) {
  const eventQuery = useEvent(id);

  if (eventQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this event"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => eventQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (eventQuery.isLoading) {
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

  if (!eventQuery.data) {
    return <NotFoundView />;
  }

  return <EventForm mode="edit" event={eventQuery.data} />;
}
