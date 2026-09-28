import { withBase } from '@/lib/href';

/** The real not-found view of the 404 shell (spec D2). */
export default function NotFoundView() {
  return (
    <main id="main-content" className="mx-auto flex max-w-3xl flex-col px-4 py-24">
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
    </main>
  );
}
