import { describe, expect, it } from 'vitest';
import { CHART_COLORS, chartColor } from './chart-colors';

describe('chartColor', () => {
  it('returns CSS var() references', () => {
    expect(CHART_COLORS[0]).toBe('var(--chart-1)');
    expect(CHART_COLORS.every((c) => c.startsWith('var(--chart-'))).toBe(true);
  });
  it('cycles by modulo when index exceeds length', () => {
    expect(chartColor(0)).toBe(CHART_COLORS[0]);
    expect(chartColor(5)).toBe(CHART_COLORS[0]);
    expect(chartColor(6)).toBe(CHART_COLORS[1]);
  });
});
