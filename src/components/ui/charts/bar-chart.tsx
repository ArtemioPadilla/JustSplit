import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartColor } from './chart-colors';
import { useMounted } from './use-mounted';
import { cn } from '@/lib/utils';

export interface BarChartProps<T extends Record<string, unknown>> {
  data: T[];
  /** Key of the X-axis category in each datum. */
  index: keyof T & string;
  /** Y-axis series keys. */
  series: (keyof T & string)[];
  height?: number;
  className?: string;
  /** Accessible label for the chart region. Defaults to 'bar chart'. */
  ariaLabel?: string;
}

export function BarChart<T extends Record<string, unknown>>({
  data,
  index,
  series,
  height = 300,
  className,
  ariaLabel = 'bar chart',
}: BarChartProps<T>) {
  const mounted = useMounted();
  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)} style={{ height }}>
      {mounted && (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
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
            cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
          />
          {series.map((key, i) => (
            <Bar key={key} dataKey={key as never} fill={chartColor(i)} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
