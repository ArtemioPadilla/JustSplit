import type { RouteName } from '@/lib/app-routes';

const TITLES: Record<Exclude<RouteName, 'not-found'>, string> = {
  'expense-detail': 'Expense',
  'expense-edit': 'Edit expense',
  'event-detail': 'Event',
  'event-edit': 'Edit event',
  'group-detail': 'Group',
  'friend-detail': 'Friend',
};

/**
 * Placeholder for a route island that lands in Phase 2 (plans B8–B13). It
 * proves the 404 shell routed the URL; it renders no data.
 */
export default function RouteStub({ route, id }: { route: Exclude<RouteName, 'not-found'>; id: string }) {
  return (
    <section
      data-testid="route-view"
      data-route={route}
      data-id={id}
      className="mx-auto flex max-w-3xl flex-col px-4 py-24"
    >
      <p className="font-mono text-sm uppercase tracking-widest text-primary">{TITLES[route]}</p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground">Coming soon</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        This page is part of the new JustSplit and arrives in a later release.
      </p>
    </section>
  );
}
