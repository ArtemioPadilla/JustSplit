import { MonthlyTrendsChart, type MonthlyTrendsChartProps } from './MonthlyTrendsChart';
import { ExpenseDistribution, type ExpenseDistributionProps } from './ExpenseDistribution';
import { BalanceOverview, type BalanceOverviewProps } from './BalanceOverview';

export interface DashboardChartsProps {
  monthlyTrends: MonthlyTrendsChartProps;
  expenseDistribution: ExpenseDistributionProps;
  balanceOverview: BalanceOverviewProps;
}

/**
 * The single `React.lazy(() => import('./DashboardCharts.lazy'))` boundary
 * (plan B8a, spec: "Recharts must never be in the static import graph of a
 * page's islands"). Everything this file statically imports — including
 * `MonthlyTrendsChart`/`ExpenseDistribution`'s own `ui/charts` (Recharts)
 * imports — is only ever fetched once a consumer dynamically imports this
 * module (`ShowcaseDashboardCharts.tsx`; the future B8b `DashboardIsland`).
 * `scripts/check-charts-bundle.mjs` asserts the resulting chunk graph at the
 * built-HTML level. Pure composition, no branching logic of its own.
 */
export default function DashboardCharts({ monthlyTrends, expenseDistribution, balanceOverview }: DashboardChartsProps) {
  return (
    <div className="grid gap-8">
      <MonthlyTrendsChart {...monthlyTrends} />
      <ExpenseDistribution {...expenseDistribution} />
      <BalanceOverview {...balanceOverview} />
    </div>
  );
}
