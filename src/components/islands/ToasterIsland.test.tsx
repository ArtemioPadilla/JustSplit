// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ToasterIsland from './ToasterIsland';

/**
 * Plan B17b: BaseLayout mounts exactly one `<ToasterIsland client:idle/>`
 * on every non-marketing page (the layout-level Toaster topology decided in
 * ADR 0008). `src/tests/mounted-island-error-boundary.test.ts` already
 * enforces the ErrorBoundary-wrap rule as a source-text scan; this is the
 * render-level smoke test that the island actually mounts Base UI's
 * `<Toaster/>` (its Viewport region) with no crash.
 */
describe('ToasterIsland', () => {
  it('mounts the shared Toaster viewport (aria-live polite Notifications region)', () => {
    render(<ToasterIsland />);
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveAttribute('aria-live', 'polite');
  });
});
