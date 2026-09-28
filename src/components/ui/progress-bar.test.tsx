// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './progress-bar';

/**
 * Ported from the legacy Next tree's `src/__tests__/progressBar.test.tsx`.
 * That suite also covered `variant`/`height`/`showPercentage` props this
 * tree's `progress-bar.tsx` (plan B1) never grew — those assertions are
 * dropped rather than ported (plan B16 scopes the port to "clamping 0-100,
 * role=progressbar + aria-valuenow/min/max, label", which the component
 * already implements; nothing here fixes a gap, it just makes the contract
 * explicit and regression-proof).
 */
describe('ProgressBar (ported clamp/aria assertions, plan B16)', () => {
  it('renders with role=progressbar and the value reflected in aria-valuenow', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '50');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps a value greater than 100 down to 100', () => {
    render(<ProgressBar value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps a value less than 0 up to 0', () => {
    render(<ProgressBar value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('exposes the label prop as the accessible name', () => {
    render(<ProgressBar value={50} label="Settlement progress" />);
    expect(screen.getByRole('progressbar', { name: 'Settlement progress' })).toBeInTheDocument();
  });
});
