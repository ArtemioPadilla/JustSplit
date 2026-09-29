import { EventForm } from '@/components/features/events/EventForm';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';
import { useWarmCurrencyCombobox } from '@/components/features/currency/CurrencySelector';

/**
 * `/events/new`'s route island (plan B11b): `ErrorBoundary > AuthIsland >
 * AuthGate > Content`, the same composition as `ExpenseFormIsland`/
 * `GroupFormIsland` — the sr-only `<h1>` lives OUTSIDE the auth-gated
 * subtree so it is present in every auth state (skeleton, redirect, or the
 * real form), same reasoning as those islands' own `<h1>` placement.
 * `?group=<id>` (linked from a group page) is read by the form itself.
 */
export default function EventFormIsland() {
  // Fetch the currency combobox chunk in idle time; the selector below renders after auth and data (B19b).
  useWarmCurrencyCombobox();
  return (
    <>
      <h1 className="sr-only">New event</h1>
      <ErrorBoundary name="EventFormIsland">
        <AuthIsland>
          <AuthGate>
            <EventForm mode="create" />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}
