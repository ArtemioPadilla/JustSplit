import * as React from 'react';
import { matchRoute, type RouteMatch, type RouteName } from '@/lib/app-routes';
import { createDisposer } from '@/lib/disposer';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from './ErrorBoundary';
import NotFoundView from './routes/NotFoundView';
import RouteStub from './routes/RouteStub';

// Plan B9: the first dynamic route wired to a real view. `React.lazy` PER
// ROUTE (not a static import) so the 404 shell's own static import graph
// never statically carries a route view's whole dependency tree — only
// `expense-detail` has one so far; the rest still render RouteStub (a
// trivial static import) until their own Phase-2 issues land.
const ExpenseDetailView = React.lazy(() => import('./routes/ExpenseDetailView'));

/**
 * The router of the 404 app shell (spec D2, plan B2c). GitHub Pages serves
 * `dist/404.html` for every URL without a prerendered page; this island reads
 * `location.pathname` (minus Astro's base) and mounts the matching route
 * island. Mounted with `client:only="react"`, so `window` exists on first
 * render. Route islands replace RouteStub in Phase 2 (plans B8–B13).
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
    default:
      return <RouteStub route={match.name} id={match.id} />;
  }
}

export default function AppRouterIsland() {
  const [match, setMatch] = React.useState<RouteMatch>(current);

  React.useEffect(() => {
    const d = createDisposer();
    d.on(window, 'popstate', () => setMatch(current()));
    return d.dispose;
  }, []);

  if (match.name === 'not-found' || !match.id) return <NotFoundView />;
  const { name, id } = match;

  return (
    <ErrorBoundary name={`AppRouterIsland/${name}`}>
      <main id="main-content">{routeContent({ name, id })}</main>
    </ErrorBoundary>
  );
}
