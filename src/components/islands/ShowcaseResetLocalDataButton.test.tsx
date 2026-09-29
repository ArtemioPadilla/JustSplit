// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ShowcaseResetLocalDataButton from './ShowcaseResetLocalDataButton';

/**
 * /showcase mount site (plan B17b) — ResetLocalDataButton itself is fully
 * tested; this is the smoke test that the ErrorBoundary-wrapped showcase
 * wrapper actually mounts it (CLAUDE.md "every mounted island wraps
 * ErrorBoundary", enforced generally by
 * src/tests/mounted-island-error-boundary.test.ts's source scan).
 */
describe('ShowcaseResetLocalDataButton', () => {
  it('mounts the "Reset local data" trigger', () => {
    render(<ShowcaseResetLocalDataButton />);
    expect(screen.getByRole('button', { name: /reset local data/i })).toBeInTheDocument();
  });
});
