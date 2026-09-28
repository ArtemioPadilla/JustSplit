import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { withBase } from '@/lib/href';

/**
 * The dashboard's own empty state (plan B8b) — shown when the signed-in user
 * has no expenses AND no events yet. This replaces the legacy `WelcomeScreen`
 * (the marketing landing page a signed-out visitor saw), which is now
 * `landing.astro`'s job; the "JustSplit"/tagline copy is not ported here
 * (dropped as a duplicate of the landing page, spec: landing content lives
 * only in landing.astro). What survives is the two CTAs, which still make
 * sense once you're already signed in with nothing tracked yet.
 */
export function WelcomeScreen() {
  return (
    <EmptyState
      title="No expenses or events yet"
      description="Add your first expense or create an event to start splitting costs with the people you share them with."
      action={
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <a href={withBase('/expenses/new')}>Add an expense</a>
          </Button>
          <Button asChild variant="secondary">
            <a href={withBase('/events/new')}>Create an event</a>
          </Button>
        </div>
      }
    />
  );
}
