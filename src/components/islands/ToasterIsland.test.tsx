// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ToasterIsland from './ToasterIsland';
import { notifySuccess } from '@/stores/notifications';

/**
 * Plan B17b: BaseLayout mounts exactly one `<ToasterIsland client:idle/>`
 * on every non-marketing page (the layout-level Toaster topology decided in
 * ADR 0008). `src/tests/mounted-island-error-boundary.test.ts` already
 * enforces the ErrorBoundary-wrap rule as a source-text scan; this is the
 * render-level smoke test that the island actually mounts Base UI's
 * `<Toaster/>` (its Viewport region) with no crash.
 */
describe('ToasterIsland', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });
  afterEach(() => {
    sessionStorage.clear();
  });

  it('mounts the shared Toaster viewport (aria-live polite Notifications region)', () => {
    render(<ToasterIsland />);
    expect(screen.getByRole('region', { name: 'Notifications' })).toHaveAttribute('aria-live', 'polite');
  });

  /**
   * Plan B17b amendment (cross-navigation toasts): the real round trip
   * across a simulated reload — `notifySuccess(..., { afterNavigation:
   * true })` (the pre-navigation write, real notifications.ts, not mocked)
   * writes to `sessionStorage`, which survives a `location.assign()`
   * because it's the SAME tab; mounting `<ToasterIsland/>` (the
   * post-reload mount) must drain it and render the toast.
   */
  it('renders a toast that was queued (afterNavigation) before this mount — the post-reload round trip', async () => {
    notifySuccess('Group created', { afterNavigation: true });

    render(<ToasterIsland />);

    expect(await screen.findByText('Group created')).toBeInTheDocument();
  });

  it('does not re-fire an already-drained toast on a second mount', async () => {
    notifySuccess('Once only', { afterNavigation: true });

    const first = render(<ToasterIsland />);
    await screen.findByText('Once only');
    first.unmount();

    render(<ToasterIsland />);
    // Give any (incorrect) re-fire a chance to render before asserting absence.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText('Once only')).not.toBeInTheDocument();
  });
});
