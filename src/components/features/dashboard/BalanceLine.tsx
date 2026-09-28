import { cn } from '@/lib/utils';
import { formatCurrency } from '@/domain/formatters';

export interface BalanceLineProps {
  name: string;
  /** Signed, in the display currency: positive = they owe you, negative = you owe them. */
  balance: number;
  /** The largest `|balance|` across every row in the same `BalanceOverview`, for proportional sizing. */
  maxAbsBalance: number;
  currency: string;
}

/**
 * A single diverging balance row (plan B8a). Built as an accessible CSS bar,
 * not a Recharts chart: this is the sub-decision's explicit deviation from
 * the plan's literal "MonthlyTrendsChart, ExpenseDistribution, BalanceLine
 * rebuilt on ui/charts/ Recharts wrappers" — a diverging bar per PERSON has
 * no natural single-chart Recharts representation (it isn't a series; it's
 * one value per row), so the only Recharts-native way to render it would be
 * one `ResponsiveContainer`/`BarChart` per row, which multiplies SVG/canvas
 * instances for what is visually one bar and buys nothing over a styled
 * `<div>`. `MonthlyTrendsChart` and `ExpenseDistribution` (genuine series
 * over time / categories) stay on the `ui/charts` wrappers.
 *
 * Owe/owed is never conveyed by color alone (CLAUDE.md a11y rule): the
 * visible text label ("Alex owes you $50.00" / "You owe Alex $50.00") is the
 * primary signal; the colored bar (`data-direction`) is a secondary,
 * decorative reinforcement (`aria-hidden`).
 */
export function BalanceLine({ name, balance, maxAbsBalance, currency }: BalanceLineProps) {
  const direction = balance < 0 ? 'left' : 'right';
  const amount = formatCurrency(Math.abs(balance), currency);
  const label = balance > 0 ? `${name} owes you ${amount}` : balance < 0 ? `You owe ${name} ${amount}` : `${name}: settled up`;
  // Half the track (50%) represents `maxAbsBalance`; the fill is that share of the half.
  const widthPercent = maxAbsBalance > 0 ? (Math.abs(balance) / maxAbsBalance) * 50 : 0;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="relative h-2 w-full rounded-full bg-muted" aria-hidden="true">
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border" />
        {balance !== 0 && (
          <div
            data-testid="balance-line-fill"
            data-direction={direction}
            className={cn('absolute inset-y-0 rounded-full', balance > 0 ? 'bg-chart-2' : 'bg-destructive')}
            style={direction === 'right' ? { left: '50%', width: `${widthPercent}%` } : { right: '50%', width: `${widthPercent}%` }}
          />
        )}
      </div>
    </div>
  );
}
