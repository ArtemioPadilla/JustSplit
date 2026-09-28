// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

/**
 * `EventFormIsland` (plan B11b) — `/events/new`'s route island. Same
 * `ErrorBoundary > AuthIsland > AuthGate > Content` composition as
 * `ExpenseFormIsland`/`GroupFormIsland`; those pieces have their own suites, so
 * this file mocks them as pass-throughs and proves only THIS island's wiring:
 * the sr-only `<h1>` lives outside the auth-gated subtree, and `EventForm` is
 * mounted in `mode="create"`. (`mounted-island-error-boundary.test.ts` asserts
 * the `ErrorBoundary` wrapper generically for every mounted island.)
 */
vi.mock('./AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('./AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { EventForm } = vi.hoisted(() => ({
  EventForm: vi.fn(({ mode }: { mode: string }) => <div data-testid="event-form" data-mode={mode} />),
}));
vi.mock('@/components/features/events/EventForm', () => ({ EventForm }));

const { default: EventFormIsland } = await import('./EventFormIsland');

afterEach(() => {
  vi.clearAllMocks();
});

describe('EventFormIsland', () => {
  it('renders a sr-only h1 outside the auth-gated subtree', () => {
    render(<EventFormIsland />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/new event/i);
    expect(heading).toHaveClass('sr-only');
  });

  it('mounts EventForm in create mode', () => {
    render(<EventFormIsland />);
    expect(screen.getByTestId('event-form')).toHaveAttribute('data-mode', 'create');
  });
});
