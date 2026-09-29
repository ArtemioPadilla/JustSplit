import { BarChart } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency } from '@/domain/formatters';
import type { MonthlyTotal } from '@/domain/dashboard';

export interface MonthlyTrendsChartProps {
  /** `monthlyTotals` selector output — already converted to `currency`. */
  data: MonthlyTotal[];
  /** Display currency code, for formatting only (conversion already happened upstream). */
  currency: string;
}

/**
 * Rebuilt on `ui/charts/bar-chart.tsx` (plan B8a) over the pure
 * `domain/dashboard.ts#monthlyTotals` selector — no data fetching, no store
 * reads. Recharts stays out of any page's static import graph: this module
 * (and the chart wrappers it pulls in) is only ever reached through
 * `DashboardCharts.lazy.tsx`'s dynamic import.
 */
export function MonthlyTrendsChart({ data, currency }: MonthlyTrendsChartProps) {
  if (data.length === 0) {
    return <EmptyState title="No monthly trends yet" description="Add an expense to see monthly totals here." />;
  }

  // `BarChart<T extends Record<string, unknown>>`'s constraint isn't satisfiable by a
  // named `interface` (MonthlyTotal) without an index signature — TypeScript only infers
  // an implicit index signature for object *type literals*, not interfaces. Map into a
  // minimal literal-typed row instead of widening MonthlyTotal itself for one call site.
  const chartData: { month: string; total: number }[] = data.map((m) => ({ month: m.month, total: m.total }));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">Monthly trends</h2>
      <BarChart data={chartData} index="month" series={['total']} ariaLabel="Monthly expense totals" />
      {/* Accessible text alternative — bar height/color never carries information alone. */}
      <table className="sr-only">
        <caption>Monthly expense totals in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Total</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {data.map((month) => (
            <tr key={month.monthKey}>
              <td>{month.month}</td>
              <td>{formatCurrency(month.total, currency)}</td>
              <td>{month.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
