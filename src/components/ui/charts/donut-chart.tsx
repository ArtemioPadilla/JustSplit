import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { chartColor } from './chart-colors';
import { useMounted } from './use-mounted';
import { cn } from '@/lib/utils';

export interface DonutDatum {
  name: string;
  value: number;
}

export interface DonutChartProps {
  data: DonutDatum[];
  height?: number;
  className?: string;
  /** Inner radius as a percentage of the outer radius. Defaults to 60. */
  innerRadius?: number;
  /** Accessible label for the chart region. Defaults to 'donut chart'. */
  ariaLabel?: string;
}

export function DonutChart({ data, height = 280, className, innerRadius = 60, ariaLabel = 'donut chart' }: DonutChartProps) {
  const mounted = useMounted();
  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)} style={{ height }}>
      {mounted && (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={chartColor(i)} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--popover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--popover-foreground)',
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ color: 'var(--foreground)', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      )}
    </div>
  );
}
