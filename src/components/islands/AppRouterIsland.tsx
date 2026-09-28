import * as React from 'react';
import { matchRoute, type RouteMatch } from '@/lib/app-routes';
import { createDisposer } from '@/lib/disposer';
import ErrorBoundary from './ErrorBoundary';
import NotFoundView from './routes/NotFoundView';
import RouteStub from './routes/RouteStub';

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

export default function AppRouterIsland() {
  const [match, setMatch] = React.useState<RouteMatch>(current);

  React.useEffect(() => {
    const d = createDisposer();
    d.on(window, 'popstate', () => setMatch(current()));
    return d.dispose;
  }, []);

  if (match.name === 'not-found' || !match.id) return <NotFoundView />;

  return (
    <ErrorBoundary name={`AppRouterIsland/${match.name}`}>
      <main id="main-content">
        <RouteStub route={match.name} id={match.id} />
      </main>
    </ErrorBoundary>
  );
}
