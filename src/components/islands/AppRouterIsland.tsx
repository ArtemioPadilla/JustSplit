import * as React from 'react';
import { matchRoute, type RouteMatch, type RouteName } from '@/lib/app-routes';
import { createDisposer } from '@/lib/disposer';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from './ErrorBoundary';
import NotFoundView from './routes/NotFoundView';

// Plan B9: the first dynamic route wired to a real view. `React.lazy` PER
// ROUTE (not a static import) so the 404 shell's own static import graph
// never statically carries a route view's whole dependency tree.
const ExpenseDetailView = React.lazy(() => import('./routes/ExpenseDetailView'));
/** Plan B10: the second dynamic route wired to a real view, same reasoning. */
const ExpenseEditView = React.lazy(() => import('./routes/ExpenseEditView'));
/** Plan B13: the third dynamic route wired to a real view, same reasoning. */
const FriendDetailView = React.lazy(() => import('./routes/FriendDetailView'));
/** Plan B12: the fourth dynamic route wired to a real view, same reasoning. */
const GroupDetailView = React.lazy(() => import('./routes/GroupDetailView'));
/** Plan B11b: the last two dynamic routes wired to real views, same reasoning. */
const EventDetailView = React.lazy(() => import('./routes/EventDetailView'));
const EventEditView = React.lazy(() => import('./routes/EventEditView'));

/**
 * The router of the 404 app shell (spec D2, plan B2c). GitHub Pages serves
 * `dist/404.html` for every URL without a prerendered page; this island reads
 * `location.pathname` (minus Astro's base) and mounts the matching route
 * island. Mounted with `client:only="react"`, so `window` exists on first
 * render. Every dynamic route family has its own lazily loaded view
 * (plans B9–B13); the `switch` below is exhaustive over `RouteName`, so a new
 * family fails `type-check` until it is wired.
 */
function current(): RouteMatch {
  return matchRoute(window.location.pathname, import.meta.env.BASE_URL);
}

function RouteFallback() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-24" aria-busy="true">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function routeContent(match: { name: Exclude<RouteName, 'not-found'>; id: string }) {
  switch (match.name) {
    case 'expense-detail':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <ExpenseDetailView id={match.id} />
        </React.Suspense>
      );
    case 'expense-edit':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <ExpenseEditView id={match.id} />
        </React.Suspense>
      );
    case 'friend-detail':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <FriendDetailView id={match.id} />
        </React.Suspense>
      );
    case 'group-detail':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <GroupDetailView id={match.id} />
        </React.Suspense>
      );
    case 'event-detail':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <EventDetailView id={match.id} />
        </React.Suspense>
      );
    case 'event-edit':
      return (
        <React.Suspense fallback={<RouteFallback />}>
          <EventEditView id={match.id} />
        </React.Suspense>
      );
    default: {
      const unhandled: never = match.name;
      return unhandled;
    }
  }
}

export default function AppRouterIsland() {
  const [match, setMatch] = React.useState<RouteMatch>(current);

  React.useEffect(() => {
    const d = createDisposer();
    d.on(window, 'popstate', () => setMatch(current()));
    return d.dispose;
  }, []);

  if (match.name === 'not-found' || !match.id) return <NotFoundView standalone />;
  const { name, id } = match;

  return (
    <ErrorBoundary name={`AppRouterIsland/${name}`}>
      <main id="main-content">{routeContent({ name, id })}</main>
    </ErrorBoundary>
  );
}
