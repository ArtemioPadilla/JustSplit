import { DonutChart, type DonutDatum } from '@/components/ui/charts';
import { EmptyState } from '@/components/ui/empty-state';
import { formatCurrency, formatPercentage } from '@/domain/formatters';
import type { CategoryTotal } from '@/domain/dashboard';

export interface ExpenseDistributionProps {
  /** `categoryDistribution` selector output — already converted to `currency`. */
  data: CategoryTotal[];
  /** Display currency code, for formatting only (conversion already happened upstream). */
  currency: string;
}

/**
 * Rebuilt on `ui/charts/donut-chart.tsx` (plan B8a) over the pure
 * `domain/dashboard.ts#categoryDistribution` selector, grouped by the raw
 * `category` string (Track D issue D8 re-keys it to the taxonomy).
 */
export function ExpenseDistribution({ data, currency }: ExpenseDistributionProps) {
  if (data.length === 0) {
    return <EmptyState title="No expense data available" description="Categorized spending will show up here." />;
  }

  const donutData: DonutDatum[] = data.map((slice) => ({ name: slice.category, value: slice.total }));

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">Expense distribution</h2>
      <DonutChart data={donutData} ariaLabel="Expense distribution by category" />
      {/* Accessible text alternative — the recharts Legend renders category names but not amounts/percentages. */}
      <table className="sr-only">
        <caption>Expense distribution by category, in {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Total</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {data.map((slice) => (
            <tr key={slice.category}>
              <td>{slice.category}</td>
              <td>{formatCurrency(slice.total, currency)}</td>
              <td>{formatPercentage(slice.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
