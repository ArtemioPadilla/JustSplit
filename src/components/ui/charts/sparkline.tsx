import * as React from 'react';
import { LineChart as RechartsLineChart, Line, ResponsiveContainer } from 'recharts';
import { chartColor } from './chart-colors';
import { useMounted } from './use-mounted';
import { cn } from '@/lib/utils';

export interface SparklineProps {
  /** Numeric series to plot. */
  data: number[];
  height?: number;
  className?: string;
  colorIndex?: number;
  /** Accessible label for the chart region. Defaults to 'sparkline'. */
  ariaLabel?: string;
}

// Sparkline — a tiny axis-less trend line for inline use in tables/cards.
export function Sparkline({ data, height = 40, className, colorIndex = 0, ariaLabel = 'sparkline' }: SparklineProps) {
  const mounted = useMounted();
  const rows = data.map((value, i) => ({ i, value }));
  return (
    <div role="img" aria-label={ariaLabel} className={cn('w-full', className)} style={{ height }}>
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsLineChart data={rows} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColor(colorIndex)}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
