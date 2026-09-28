import { describe, expect, it } from 'vitest';
import lineSrc from './line-chart.tsx?raw';
import barSrc from './bar-chart.tsx?raw';
import areaSrc from './area-chart.tsx?raw';
import donutSrc from './donut-chart.tsx?raw';

const sources = {
  LineChart: lineSrc,
  BarChart: barSrc,
  AreaChart: areaSrc,
  DonutChart: donutSrc,
};

describe.each(Object.entries(sources))('%s wrapper', (name, source) => {
  it('imports from recharts', () => {
    expect(source).toMatch(/from\s+['"]recharts['"]/);
  });
  it('uses chartColor or CHART_COLORS for theming', () => {
    expect(source).toMatch(/chartColor|CHART_COLORS/);
  });
  it('renders inside ResponsiveContainer', () => {
    expect(source).toMatch(/ResponsiveContainer/);
  });
  it(`exports ${name}`, () => {
    expect(source).toMatch(new RegExp(`export.*\\b${name}\\b`));
  });
});
