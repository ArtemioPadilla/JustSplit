// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { withBase } from '@/lib/href';
import type { Event } from '@/schemas/event';
import { UpcomingEvents } from './UpcomingEvents';

/**
 * Rewritten from the skipped legacy `UpcomingEvents.test.tsx` (plan B8b) onto
 * the B8a `upcomingEvents` selector's output (caller-filtered, capped at 3,
 * soonest-first) instead of AppContext + inline past/future logic. Real
 * route link target is `/events/<id>` (`src/lib/app-routes.ts`).
 */
function makeEvent(overrides: Partial<Event> & Pick<Event, 'id' | 'name'>): Event {
  return {
    memberIds: ['user1'],
    kind: 'event',
    createdBy: 'user1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('UpcomingEvents', () => {
  it('renders event names and locations', () => {
    const events = [makeEvent({ id: 'event1', name: 'Team Trip', location: 'Beach', startDate: '2026-06-15' })];
    render(<UpcomingEvents events={events} />);

    expect(screen.getByText('Team Trip')).toBeInTheDocument();
    expect(screen.getByText(/Beach/)).toBeInTheDocument();
  });

  it('links each event to its detail page', () => {
    const events = [makeEvent({ id: 'event1', name: 'Team Trip', startDate: '2026-06-15' })];
    render(<UpcomingEvents events={events} />);

    expect(screen.getByRole('link', { name: /Team Trip/ })).toHaveAttribute('href', withBase('/events/event1'));
  });

  it('renders an empty state with no upcoming events', () => {
    render(<UpcomingEvents events={[]} />);
    expect(screen.getByText(/no upcoming events/i)).toBeInTheDocument();
  });
});
