import * as React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient, attachPersister, type QueryCacheRestoreError } from '@/lib/queryClient';
import { ErrorState } from '@/components/ui/error-state';
import ErrorBoundary from './ErrorBoundary';

interface QueryProviderProps {
  /** Optional custom idb key (useful for tests / multi-tenant setups). */
  idbKey?: string;
  children: React.ReactNode;
}

/** Renders nothing until `error` is set, then throws it during render so the
 * sibling `ErrorBoundary` below catches it — the standard React pattern for
 * turning an async failure (caught in a `useEffect`) into something an
 * error boundary can show a fallback for. */
function RestoreErrorThrower({ error }: { error: QueryCacheRestoreError | null }) {
  if (error) throw error;
  return null;
}

// Rendered only when the persisted cache fails to restore (rare), but it brings
// the whole Base UI dialog stack with it. Loading it on demand keeps that out of
// every app page's statically loaded JS (plan B19).
const ResetLocalDataButton = React.lazy(() =>
  import('@/components/features/settings/ResetLocalDataButton').then((m) => ({ default: m.ResetLocalDataButton })),
);

function PersisterRestoreFailedNotice() {
  return (
    <ErrorState
      title="Could not restore your local data"
      hint="This device's cached data may be corrupt or unavailable. The app still works over the network — reset local data if this keeps happening."
      action={
        // A same-size, decorative placeholder: the notice does not jump when the button arrives.
        <React.Suspense fallback={<span aria-hidden="true" className="inline-block h-9 w-52" />}>
          <ResetLocalDataButton />
        </React.Suspense>
      }
    />
  );
}

/**
 * Per-island QueryClient provider with idb-keyval persistence wired in.
 * Mount this around any island that wants to use useQuery.
 *
 * The client is created once with useState's lazy initializer — never
 * recreated on re-render. attachPersister returns an unsubscribe that
 * runs in the StrictMode-safe useEffect cleanup.
 *
 * Persister-restore-failure recovery (plan B17b, ADR 0008): the nested
 * `ErrorBoundary` below is a SIBLING of `children`, not an ancestor — a
 * restore failure (`QueryCacheRestoreError`, `src/lib/queryClient.ts`)
 * shows the recovery banner (an `ErrorState` with a `ResetLocalDataButton`)
 * WITHOUT ever unmounting `children`. The route content underneath keeps
 * rendering and fetching normally: `useLiveQuery`'s subscription is the
 * network source regardless of whether the persister ever had anything to
 * restore, so a failed hydration falls straight back to a live fetch
 * (no corruption detector needed — the Query cache is disposable).
 */
export default function QueryProvider({ idbKey, children }: QueryProviderProps) {
  const [client] = React.useState(() => createQueryClient());
  const [restoreError, setRestoreError] = React.useState<QueryCacheRestoreError | null>(null);

  React.useEffect(() => {
    const detach = attachPersister(client, { idbKey, onRestoreError: setRestoreError });
    return () => detach();
  }, [client, idbKey]);

  return (
    <QueryClientProvider client={client}>
      <ErrorBoundary name="QueryProvider/persister" fallback={() => <PersisterRestoreFailedNotice />}>
        <RestoreErrorThrower error={restoreError} />
      </ErrorBoundary>
      {children}
    </QueryClientProvider>
  );
}
