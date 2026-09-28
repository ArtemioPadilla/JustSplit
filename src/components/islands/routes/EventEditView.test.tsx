// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '@/schemas/event';

/**
 * `EventEditView` (plan B11b) — the `/events/edit/<id>` route view, loaded by
 * `AppRouterIsland`. Auth composition is covered elsewhere (pass-through
 * mocks, same as `ExpenseEditView.test.tsx`); this file proves the
 * loading / error+retry / not-found / loaded states driven by `useEvent`, and
 * that the loaded row reaches `EventForm mode="edit"`. A missing or RLS-hidden
 * id renders the SAME `NotFoundView` as every other dynamic route (ADR 0002's
 * leaked-id reasoning).
 */
vi.mock('../AuthIsland', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('../AuthGate', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const { useEvent } = vi.hoisted(() => ({ useEvent: vi.fn() }));
vi.mock('@/lib/data/hooks/useEvent', () => ({ useEvent }));

const { EventForm } = vi.hoisted(() => ({
  EventForm: vi.fn(({ mode, event }: { mode: string; event?: Event }) => (
    <div data-testid="event-form" data-mode={mode} data-event-id={event?.id} />
  )),
}));
vi.mock('@/components/features/events/EventForm', () => ({ EventForm }));

const { default: EventEditView } = await import('./EventEditView');

afterEach(() => {
  vi.clearAllMocks();
});

const EVENT: Event = {
  id: 'e1',
  name: 'Cancún',
  memberIds: ['u1'],
  kind: 'event',
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('EventEditView', () => {
  it('renders a sr-only h1 and a busy skeleton while the event loads', () => {
    useEvent.mockReturnValue({ isError: false, isLoading: true, data: undefined, refetch: vi.fn() });
    const { container } = render(<EventEditView id="e1" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Edit event');
    expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only');
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
  });

  it('renders NotFoundView for an id that resolves to no row (missing or RLS-hidden)', () => {
    useEvent.mockReturnValue({ isError: false, isLoading: false, data: null, refetch: vi.fn() });
    render(<EventEditView id="nope" />);
    expect(screen.getByText(/not found/i)).toBeInTheDocument();
    expect(screen.queryByTestId('event-form')).not.toBeInTheDocument();
  });

  it('renders an error state with a working Retry when the query fails', async () => {
    const refetch = vi.fn();
    useEvent.mockReturnValue({ isError: true, isLoading: false, data: undefined, refetch });
    render(<EventEditView id="e1" />);
    expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    await userEvent.setup().click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('renders EventForm in edit mode with the loaded event', () => {
    useEvent.mockReturnValue({ isError: false, isLoading: false, data: EVENT, refetch: vi.fn() });
    render(<EventEditView id="e1" />);
    const form = screen.getByTestId('event-form');
    expect(form).toHaveAttribute('data-mode', 'edit');
    expect(form).toHaveAttribute('data-event-id', 'e1');
  });
});
