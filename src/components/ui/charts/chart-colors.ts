/**
 * Tailwind/shadcn chart color tokens. Returned as CSS var references so
 * the actual color is resolved by the browser at paint time — flips
 * automatically when .dark is applied to <html>.
 */
// Ordered for maximum hue distance between ADJACENT series (audit §4.4):
// emerald → blue → amber → violet → teal. The tokens themselves are
// unchanged; only the assignment order differs so two-series charts don't
// land on the near-identical emerald/teal pair.
export const CHART_COLORS = [
  'var(--chart-1)', // emerald (163)
  'var(--chart-3)', // blue (255)
  'var(--chart-4)', // amber (70)
  'var(--chart-5)', // violet (300)
  'var(--chart-2)', // teal (195)
] as const;

export type ChartColor = (typeof CHART_COLORS)[number];

/** Picks the i-th color, cycling when index exceeds the palette length. */
export function chartColor(i: number): ChartColor {
  // Non-null assertion is safe: i % length is always a valid index (0..length-1).
  return CHART_COLORS[i % CHART_COLORS.length]!;
}
