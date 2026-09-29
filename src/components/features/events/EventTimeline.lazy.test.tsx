// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * B19b: the hover-card stack (Base UI preview card, floating-ui: ~23 kB gz on
 * /events/list) loads when a marker is first hovered, focused or touched. Until
 * then a marker is a plain `<button>` with the real marker's accessible name and
 * look, so the timeline, its legend and its always-present text list cost nothing
 * up front. The behaviour behind the boundary is `EventTimeline.test.tsx`; this
 * file pins the boundary itself, with the real marker module replaced by a stub
 * whose factory counts evaluations (an evaluation IS the chunk having loaded).
 */
const loads = vi.hoisted(() => ({ count: 0 }));

const EVENT = { startDate: '2023-06-01', endDate: '2023-06-10' };
const EXPENSES = [
  { id: 'e1', description: 'Taxi', amount: 10, currency: 'USD', date: '2023-06-02', paidBy: 'u1', settledAt: null },
  { id: 'e2', description: 'Lunch', amount: 20, currency: 'USD', date: '2023-06-08', paidBy: 'u1', settledAt: null },
];

async function fresh() {
  vi.resetModules();
  vi.doMock('./EventTimelineMarkerImpl', () => {
    loads.count += 1;
    return {
      EventTimelineMarkerImpl: ({ markerProps }: { markerProps: { 'aria-label': string } }) => (
        <button type="button" data-testid="real-marker" aria-label={markerProps['aria-label']} />
      ),
    };
  });
  const { EventTimeline } = await import('./EventTimeline');
  return render(
    <EventTimeline event={EVENT} expenses={EXPENSES} users={{ u1: 'Ana' }} convert={(a) => a} currency="USD" onNavigate={() => {}} />,
  );
}

beforeEach(() => {
  loads.count = 0;
});

describe('EventTimeline marker chunk (B19b)', () => {
  it('renders plain, named marker buttons and loads no hover-card code', async () => {
    await fresh();
    const markers = screen.getAllByTestId('timeline-marker');
    expect(markers).toHaveLength(2);
    for (const marker of markers) {
      expect(marker.tagName).toBe('BUTTON');
      expect(marker.getAttribute('aria-label')).toMatch(/^View expense: /);
    }
    expect(screen.queryByTestId('real-marker')).not.toBeInTheDocument();
    expect(loads.count).toBe(0);
  });

  it.each([
    ['hovering', async (el: HTMLElement) => void (await userEvent.hover(el))],
    ['focusing', async (el: HTMLElement) => void act(() => el.focus())],
    ['touching', async (el: HTMLElement) => void fireEvent.touchStart(el)],
  ])('loads the chunk on %s a marker, and that marker becomes the real one with the same name', async (_name, interact) => {
    await fresh();
    const [marker] = screen.getAllByTestId('timeline-marker');
    const name = marker!.getAttribute('aria-label');
    await interact(marker!);

    await waitFor(() => expect(screen.getByTestId('real-marker')).toHaveAttribute('aria-label', name));
    expect(loads.count).toBe(1);
  });

  it('leaves the text list of every expense in place whatever happens to the markers', async () => {
    await fresh();
    expect(screen.getAllByTestId('timeline-sr-expense')).toHaveLength(2);
  });
});
