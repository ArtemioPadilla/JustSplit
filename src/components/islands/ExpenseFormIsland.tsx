import { ExpenseForm } from '@/components/features/expenses/ExpenseForm';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/**
 * `/expenses/new`'s route island (plan B10, risk:high): `ErrorBoundary >
 * AuthIsland > AuthGate > Content`, the same composition as
 * `ExpenseListIsland` (B9) — the sr-only `<h1>` lives OUTSIDE the
 * auth-gated subtree so it is present in every auth state (not-ready
 * skeleton, the unconfigured-build Alert, or the real form), same reasoning
 * as `DashboardIsland`/`ExpenseListIsland`'s own `<h1>` placement.
 */
export default function ExpenseFormIsland() {
  return (
    <>
      <h1 className="sr-only">New expense</h1>
      <ErrorBoundary name="ExpenseFormIsland">
        <AuthIsland>
          <AuthGate>
            <ExpenseForm mode="create" />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}
