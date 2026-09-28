import { GroupForm } from '@/components/features/groups/GroupForm';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/**
 * `/groups/new`'s route island (plan B12, risk:high): `ErrorBoundary >
 * AuthIsland > AuthGate > Content`, the same composition as
 * `ExpenseFormIsland` (B10) — the sr-only `<h1>` lives OUTSIDE the
 * auth-gated subtree so it is present in every auth state, same reasoning
 * as `ExpenseFormIsland`'s own `<h1>` placement.
 */
export default function GroupFormIsland() {
  return (
    <>
      <h1 className="sr-only">New group</h1>
      <ErrorBoundary name="GroupFormIsland">
        <AuthIsland>
          <AuthGate>
            <GroupForm />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}
