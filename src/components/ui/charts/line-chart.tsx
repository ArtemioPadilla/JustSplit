import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartColor } from './chart-colors';
import { useMounted } from './use-mounted';
import { cn } from '@/lib/utils';

export interface LineChartProps<T extends Record<string, unknown>> {
  data: T[];
  /** Key of the X-axis category in each datum. */
  index: keyof T & string;
  /** Y-axis series keys. */
  series: (keyof T & string)[];
  height?: number;
  className?: string;
  /** Accessible label for the chart region. Defaults to 'line chart'. */
  ariaLabel?: string;
}

export function LineChart<T extends Record<string, unknown>>({
  data,
  index,
  series,
  height = 300,
  className,
  ariaLabel = 'line chart',
}: LineChartProps<T>) {
  const mounted = useMounted();
  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)} style={{ height }}>
      {mounted && (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          {/* Recharts' generic dataKey narrows to TypedDataKey<T, any> which our
              public `keyof T & string` doesn't structurally satisfy. The runtime
              contract is already enforced at the wrapper boundary; cast here to
              silence the internal Recharts type without weakening the surface API. */}
          <XAxis
            dataKey={index as never}
            stroke="var(--muted-foreground)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--popover-foreground)',
              fontSize: 12,
            }}
            cursor={{ stroke: 'var(--muted-foreground)', strokeWidth: 1 }}
          />
          {series.map((key, i) => (
            <Line
              key={key}
              isAnimationActive={false}
              type="monotone"
              dataKey={key as never}
              stroke={chartColor(i)}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
