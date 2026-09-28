// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryCacheRestoreError } from '@/lib/queryClient';

const { attachPersister, createQueryClient } = vi.hoisted(() => ({
  attachPersister: vi.fn(),
  createQueryClient: vi.fn(),
}));
vi.mock('@/lib/queryClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/queryClient')>()),
  attachPersister,
  createQueryClient,
}));

const { QueryClient } = await import('@tanstack/react-query');
const QueryProvider = (await import('./QueryProvider')).default;

/**
 * Plan B17b: QueryProvider's persister-restore-failure recovery action.
 * `attachPersister`'s `onRestoreError` is a nested, narrowly-scoped
 * ErrorBoundary INSIDE QueryProvider — a sibling of `children`, not an
 * ancestor — so a restore failure shows the recovery banner WITHOUT ever
 * unmounting `children`: the route content underneath keeps rendering and
 * fetching over the network (useLiveQuery's subscription doesn't depend on
 * the persister at all).
 */
describe('QueryProvider persister-restore-failure recovery', () => {
  it('renders children normally and no recovery banner when the persister restores cleanly', () => {
    createQueryClient.mockReturnValue(new QueryClient());
    attachPersister.mockImplementation(() => () => {});

    render(
      <QueryProvider>
        <div>Route content</div>
      </QueryProvider>,
    );

    expect(screen.getByText('Route content')).toBeInTheDocument();
    expect(screen.queryByText(/restore/i)).not.toBeInTheDocument();
  });

  it('shows the recovery action AND keeps rendering children when the persister fails to restore', async () => {
    createQueryClient.mockReturnValue(new QueryClient());
    attachPersister.mockImplementation((_client, options) => {
      // Simulate the async restore-failure path attachPersister's own
      // onRestoreError callback takes (queryClient.ts fires it once the
      // persistQueryClient restore promise rejects).
      queueMicrotask(() => options.onRestoreError(new QueryCacheRestoreError(new Error('idb blocked'))));
      return () => {};
    });

    render(
      <QueryProvider>
        <div>Route content</div>
      </QueryProvider>,
    );

    // Still fetches: the route content is present throughout, never
    // unmounted by the recovery banner appearing alongside it.
    expect(screen.getByText('Route content')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText(/could not restore/i)).toBeInTheDocument());
    expect(screen.getByText('Route content')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restablecer datos locales/i })).toBeInTheDocument();
  });
});
