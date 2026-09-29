import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseForm } from '@/components/features/expenses/ExpenseForm';
import { useExpense } from '@/lib/data/hooks/useExpense';
import AuthGate from '../AuthGate';
import AuthIsland from '../AuthIsland';
import NotFoundView from './NotFoundView';
import { useWarmCurrencyCombobox } from '@/components/features/currency/CurrencySelector';

/**
 * `/expenses/edit/<id>`'s route view (plan B10, risk:high), loaded through
 * `AppRouterIsland`'s `React.lazy` per-route boundary (same pattern as
 * `ExpenseDetailView`, plan B9) — the outer `ErrorBoundary` is the 404
 * shell's own, per-route one, so this view does not nest a second one.
 *
 * An id that resolves to no row (missing, or an RLS-hidden expense) renders
 * the SAME `NotFoundView` the shell already uses for an unknown path — same
 * leaked-id reasoning as `ExpenseDetailView` (ADR 0002).
 */
export default function ExpenseEditView({ id }: { id: string }) {
  // Fetch the currency combobox chunk in idle time; the selector below renders after auth and data (B19b).
  useWarmCurrencyCombobox();
  return (
    <>
      <h1 className="sr-only">Edit expense</h1>
      <AuthIsland>
        <AuthGate>
          <ExpenseEditContent id={id} />
        </AuthGate>
      </AuthIsland>
    </>
  );
}

function ExpenseEditContent({ id }: { id: string }) {
  const expenseQuery = useExpense(id);

  if (expenseQuery.isError) {
    return (
      <ErrorState
        title="Something went wrong loading this expense"
        hint='Please try again in a moment. If this keeps happening, you can report it with the "Report an issue" button.'
        action={
          <Button type="button" onClick={() => expenseQuery.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (expenseQuery.isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!expenseQuery.data) {
    return <NotFoundView />;
  }

  return <ExpenseForm mode="edit" expense={expenseQuery.data} />;
}
