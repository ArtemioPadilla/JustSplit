import { AccountSettings } from '@/components/features/profile/AccountSettings';
import { ProfileForm } from '@/components/features/profile/ProfileForm';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import ErrorBoundary from './ErrorBoundary';

/**
 * `/profile`'s route island (plan B15, risk:high): `ErrorBoundary >
 * AuthIsland > AuthGate > Content`, the same composition as
 * `GroupFormIsland`/`ExpenseFormIsland` (plan B4's pattern). The sr-only
 * `<h1>` lives OUTSIDE the auth-gated subtree (same reasoning as those two
 * islands' own `<h1>` placement): it must be present in every auth state
 * `AuthGate`'s skeleton and `AuthIsland`'s "not configured" Alert render
 * with no heading of their own.
 */
export default function ProfileIsland() {
  return (
    <>
      <h1 className="sr-only">Your profile</h1>
      <ErrorBoundary name="ProfileIsland">
        <AuthIsland>
          <AuthGate>
            <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
              <ProfileForm />
              <AccountSettings />
            </div>
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}
