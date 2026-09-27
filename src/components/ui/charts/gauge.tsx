import * as React from 'react';
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { chartColor } from './chart-colors';
import { useMounted } from './use-mounted';
import { cn } from '@/lib/utils';

export interface GaugeProps {
  /** Value 0–max. */
  value: number;
  max?: number;
  height?: number;
  className?: string;
  colorIndex?: number;
  label?: React.ReactNode;
  /** Accessible label for the chart region. Defaults to 'gauge chart'. */
  ariaLabel?: string;
}

// Gauge — a single-value radial dial (e.g. score, completion).
export function Gauge({ value, max = 100, height = 180, className, colorIndex = 0, label, ariaLabel = 'gauge chart' }: GaugeProps) {
  const mounted = useMounted();
  const pct = Math.round((value / max) * 100);
  return (
    <div role="img" aria-label={ariaLabel} className={cn('relative w-full', className)} style={{ height }}>
      {mounted && (
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ value }]}
            startAngle={90}
            endAngle={-270}
          >
            <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
            <RadialBar dataKey="value" isAnimationActive={false} cornerRadius={999} fill={chartColor(colorIndex)} background={{ fill: 'var(--secondary)' }} />
          </RadialBarChart>
        </ResponsiveContainer>
      )}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-foreground">{pct}%</span>
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
