import { withBase } from '@/lib/href';

/**
 * The real not-found view of the 404 shell (spec D2).
 *
 * Two ways in, and only one of them may own the page's `<main>` landmark
 * (a second, nested one trips axe's `landmark-main-is-top-level`,
 * `landmark-no-duplicate-main` and `landmark-unique`; plan A7):
 *  - `standalone` — `AppRouterIsland` for a URL that matches no route: nothing
 *    wraps it, so this is the page's main landmark;
 *  - default — a detail/edit view whose id resolves to no row (missing or
 *    RLS-hidden): the router's own `<main>` is already around it.
 */
export default function NotFoundView({ standalone = false }: { standalone?: boolean }) {
  const Container = standalone ? 'main' : 'div';
  return (
    <Container id={standalone ? 'main-content' : undefined} className="mx-auto flex max-w-3xl flex-col px-4 py-24">
      <p className="font-mono text-sm uppercase tracking-widest text-primary">404</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">
        The URL doesn&apos;t match any page. If a link on this site brought you here, that&apos;s a bug worth filing
        with the chat bubble in the corner.
      </p>
      <a
        href={withBase('/')}
        className="mt-8 inline-flex w-fit rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back home
      </a>
    </Container>
  );
}
