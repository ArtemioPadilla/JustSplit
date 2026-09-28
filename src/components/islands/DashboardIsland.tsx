import * as React from 'react';
import { useStore } from '@nanostores/react';
import { DashboardHeader } from '@/components/features/dashboard/DashboardHeader';
import { FinancialSummary } from '@/components/features/dashboard/FinancialSummary';
import { RecentExpenses } from '@/components/features/dashboard/RecentExpenses';
import { RecentSettlements } from '@/components/features/dashboard/RecentSettlements';
import { UpcomingEvents } from '@/components/features/dashboard/UpcomingEvents';
import { WelcomeScreen } from '@/components/features/dashboard/WelcomeScreen';
import { Skeleton } from '@/components/ui/skeleton';
import {
  balancesWithUser,
  categoryDistribution,
  monthlyTotals,
  totalSpent,
  unsettledCount,
  upcomingEvents as selectUpcomingEvents,
} from '@/domain/dashboard';
import { parseCalendarDate } from '@/domain/dates';
import { useDisplayConversion } from '@/lib/currency/useDisplayConversion';
import { useEvents } from '@/lib/data/hooks/useEvents';
import { useExpenses } from '@/lib/data/hooks/useExpenses';
import { useProfiles } from '@/lib/data/hooks/useProfiles';
import { useSettlements } from '@/lib/data/hooks/useSettlements';
import { $preferredCurrency, clearRateCache } from '@/stores/preferences';
import { $profile, $user, updateProfile } from '@/stores/auth';
import { notifyError, notifySuccess } from '@/stores/notifications';
import AuthGate from './AuthGate';
import AuthIsland from './AuthIsland';
import CurrencyExchangeTicker from './CurrencyExchangeTicker';
import ErrorBoundary from './ErrorBoundary';

const DashboardCharts = React.lazy(() => import('@/components/features/dashboard/DashboardCharts.lazy'));
const RECENT_EXPENSES_LIMIT = 5;
const RECENT_SETTLEMENTS_LIMIT = 3;

/**
 * `/`'s route island (plan B8b): `ErrorBoundary > AuthIsland > AuthGate >
 * Content`, the same composition every protected Phase-2 island follows
 * (`AuthIsland.tsx`'s doc comment, plan B4). Mounted `client:only="react"`
 * from `src/pages/index.astro`, with a static `DashboardSkeleton` in the
 * island's `slot="fallback"`.
 *
 * The `<h1>` lives HERE, outside the auth-gated subtree, and is
 * screen-reader-only: `AuthGate`'s own not-ready Skeleton and `AuthIsland`'s
 * "not configured" Alert (the build has no Supabase env vars in CI) render
 * with no heading of their own, and axe's `page-has-heading-one` rule must
 * still pass regardless of which of those three states the page is in when
 * scanned. `DashboardHeader` shows no redundant visible "Dashboard" text of
 * its own (see its own file: this issue's decision lists exactly what it
 * renders, and a page title isn't one of them).
 */
export default function DashboardIsland() {
  return (
    <>
      <h1 className="sr-only">Dashboard</h1>
      <ErrorBoundary name="DashboardIsland">
        <AuthIsland>
          <AuthGate>
            <DashboardContent />
          </AuthGate>
        </AuthIsland>
      </ErrorBoundary>
    </>
  );
}

function DashboardContent() {
  const user = useStore($user);
  const profile = useStore($profile);
  const preferredCurrency = useStore($preferredCurrency);
  const uid = user?.uid;

  const expensesQuery = useExpenses(uid);
  const eventsQuery = useEvents(uid);
  const settlementsQuery = useSettlements(uid);

  const expenses = expensesQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const settlements = settlementsQuery.data ?? [];
  const dataLoading = expensesQuery.data === undefined || eventsQuery.data === undefined || settlementsQuery.data === undefined;

  const currencies = React.useMemo(() => expenses.map((expense) => expense.currency), [expenses]);
  const { convert, ready, approximate, refresh } = useDisplayConversion(currencies);

  const participantIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const expense of expenses) {
      ids.add(expense.paidBy);
      for (const split of expense.splits) ids.add(split.userId);
    }
    for (const settlement of settlements) {
      ids.add(settlement.fromUserId);
      ids.add(settlement.toUserId);
    }
    return Array.from(ids);
  }, [expenses, settlements]);
  const profilesQuery = useProfiles(participantIds);
  const names = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of profilesQuery.data ?? []) map[row.id] = row.name ?? 'Unknown';
    return map;
  }, [profilesQuery.data]);

  const handleCurrencyChange = React.useCallback(
    async (code: string) => {
      try {
        await updateProfile({ preferences: { ...profile?.preferences, preferredCurrency: code } });
      } catch {
        notifyError('Could not update your preferred currency');
      }
    },
    [profile],
  );

  const handleRefreshRates = React.useCallback(() => {
    clearRateCache();
    refresh();
    notifySuccess('Exchange rates refreshed');
  }, [refresh]);

  if (dataLoading) {
    return <DashboardLoadingSkeleton />;
  }

  if (expenses.length === 0 && events.length === 0) {
    return <WelcomeScreen />;
  }

  const csvUsers = Object.entries(names).map(([id, name]) => ({ id, name }));
  const csvEvents = events.map((event) => ({ id: event.id, name: event.name }));

  const recentExpenses = [...expenses]
    .sort((a, b) => parseCalendarDate(b.date).getTime() - parseCalendarDate(a.date).getTime())
    .slice(0, RECENT_EXPENSES_LIMIT);
  const recentSettlements = [...settlements]
    .sort((a, b) => parseCalendarDate(b.date).getTime() - parseCalendarDate(a.date).getTime())
    .slice(0, RECENT_SETTLEMENTS_LIMIT);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-10">
      <DashboardHeader
        expenses={expenses}
        users={csvUsers}
        events={csvEvents}
        currency={preferredCurrency}
        onCurrencyChange={handleCurrencyChange}
        onRefreshRates={handleRefreshRates}
      />

      <CurrencyExchangeTicker />

      {ready ? (
        <>
          <FinancialSummary
            totalSpent={totalSpent(expenses, convert)}
            unsettledCount={unsettledCount(expenses)}
            currency={preferredCurrency}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <RecentExpenses expenses={recentExpenses} names={names} convert={convert} currency={preferredCurrency} />
            <RecentSettlements settlements={recentSettlements} names={names} convert={convert} currency={preferredCurrency} />
          </div>

          <UpcomingEvents events={selectUpcomingEvents(events)} />

          <React.Suspense fallback={<ChartsFallback />}>
            <DashboardCharts
              monthlyTrends={{ data: monthlyTotals(expenses, convert), currency: preferredCurrency }}
              expenseDistribution={{ data: categoryDistribution(expenses, convert), currency: preferredCurrency }}
              balanceOverview={{ balances: balancesWithUser(expenses, uid ?? '', names, convert), currency: preferredCurrency }}
            />
          </React.Suspense>

          {approximate && (
            <p className="text-xs text-muted-foreground">* Some amounts use approximate rates</p>
          )}
        </>
      ) : (
        <>
          <UpcomingEvents events={selectUpcomingEvents(events)} />
          <DashboardLoadingSkeleton />
        </>
      )}
    </div>
  );
}

/** Post-hydration loading state (data still in flight, or rates not yet resolved). */
function DashboardLoadingSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10" aria-busy="true">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

function ChartsFallback() {
  return (
    <div className="grid gap-8" aria-busy="true">
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-72 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
