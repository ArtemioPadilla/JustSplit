import * as React from 'react';
import ErrorBoundary from './ErrorBoundary';
import { balancesWithUser, categoryDistribution, monthlyTotals } from '@/domain/dashboard';
import type { Expense } from '@/schemas/expense';

// The single dynamic-import boundary for the chart widgets (plan B8a, spec:
// Recharts must never be in a page's static import graph). `React.lazy` +
// this dynamic import() is what gets Vite to code-split the chunk out of
// this island's own — see UserMenuIsland.tsx / lazy-date-picker.tsx for the
// same pattern. scripts/check-charts-bundle.mjs asserts the resulting chunk
// graph at the built-HTML level.
const DashboardCharts = React.lazy(() => import('@/components/features/dashboard/DashboardCharts.lazy'));

const identity = (amount: number): number => amount;

// Obviously fictional showcase fixtures (CLAUDE.md quality bar: no
// real-looking people). "You" is the demo's current user; the other two
// names are clearly synthetic placeholders, not names a real person might
// share.
const YOU = 'demo-you';
const FRIEND_A = 'demo-friend-a';
const FRIEND_B = 'demo-friend-b';
const NAMES: Record<string, string> = { [FRIEND_A]: 'Sample Friend A', [FRIEND_B]: 'Sample Friend B' };

const today = new Date();
const isoDate = (monthsAgo: number): string => new Date(today.getFullYear(), today.getMonth() - monthsAgo, 10).toISOString().slice(0, 10);

const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'sample-groceries',
    groupId: null,
    description: 'Sample groceries',
    amount: 60,
    currency: 'USD',
    paidBy: YOU,
    splitType: 'equal',
    category: 'Food',
    splits: [
      { userId: YOU, amount: 30 },
      { userId: FRIEND_A, amount: 30 },
    ],
    date: isoDate(0),
    memberIds: [YOU, FRIEND_A],
    createdBy: YOU,
    createdAt: `${isoDate(0)}T00:00:00.000Z`,
    settledAt: null,
  },
  {
    id: 'sample-taxi',
    groupId: null,
    description: 'Sample taxi ride',
    amount: 40,
    currency: 'USD',
    paidBy: FRIEND_B,
    splitType: 'equal',
    category: 'Transport',
    splits: [
      { userId: FRIEND_B, amount: 20 },
      { userId: YOU, amount: 20 },
    ],
    date: isoDate(0),
    memberIds: [YOU, FRIEND_B],
    createdBy: FRIEND_B,
    createdAt: `${isoDate(0)}T00:00:00.000Z`,
    settledAt: null,
  },
  {
    id: 'sample-movie-night',
    groupId: null,
    description: 'Sample movie night',
    amount: 24,
    currency: 'USD',
    paidBy: YOU,
    splitType: 'equal',
    category: 'Entertainment',
    splits: [
      { userId: YOU, amount: 12 },
      { userId: FRIEND_A, amount: 12 },
    ],
    date: isoDate(1),
    memberIds: [YOU, FRIEND_A],
    createdBy: YOU,
    createdAt: `${isoDate(1)}T00:00:00.000Z`,
    settledAt: null,
  },
];

/**
 * /showcase-only wrapper (plan B8a): mounts the three chart widgets over
 * fictional in-memory data run through the real selectors
 * (`domain/dashboard.ts`), same pattern as `ShowcaseExportCsvButton`. A
 * single hydration boundary — this is one composed unit, not a multi-island
 * compound composition.
 */
export default function ShowcaseDashboardCharts() {
  return (
    <ErrorBoundary name="ShowcaseDashboardCharts">
      <React.Suspense fallback={<DashboardChartsFallback />}>
        <DashboardCharts
          monthlyTrends={{ data: monthlyTotals(SAMPLE_EXPENSES, identity), currency: 'USD' }}
          expenseDistribution={{ data: categoryDistribution(SAMPLE_EXPENSES, identity), currency: 'USD' }}
          balanceOverview={{ balances: balancesWithUser(SAMPLE_EXPENSES, YOU, NAMES, identity), currency: 'USD' }}
        />
      </React.Suspense>
    </ErrorBoundary>
  );
}

/** Non-jumping skeleton while the lazy Recharts chunk loads. */
function DashboardChartsFallback() {
  return (
    <div className="grid gap-8" aria-busy="true">
      <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
      <div className="h-72 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
    </div>
  );
}
