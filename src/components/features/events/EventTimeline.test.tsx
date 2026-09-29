// @vitest-environment jsdom
//
// Ports the five legacy Next-tree suites this widget replaces (plan B11a):
//   src/__tests__/{timeline,timelineEvents,postEventExpenses,hoverCard,expenseGroups}.test.tsx
//
// What was KEPT: the fixture shape (a 10-day event, a pre-event expense, an
// expense exactly on the start day, two same-day mid-event expenses with
// different currencies/settlement, an expense exactly on the end day —
// `timeline.test.tsx`'s `mockEvent`/`mockExpenses`), the settled/unsettled/
// mixed-group distinction (`hoverCard.test.tsx`, `timeline.test.tsx`'s
// legend), grouping same-day expenses into one marker
// (`expenseGroups.test.tsx`), post-event expenses rendered distinctly
// (`postEventExpenses.test.tsx`), and a hover card revealing per-expense
// detail with a working navigate action (`hoverCard.test.tsx`).
//
// What was DROPPED: `AppContext`/`next/navigation` mocking (this tree has
// neither — spec D3, `onNavigate` is a prop); the MUI/CSS-module class-name
// assertions; the re-implemented stand-in components each legacy file built
// instead of importing the real one (`timelineEvents.test.tsx` and
// `expenseGroups.test.tsx` both tested a hand-rolled mock, not `Timeline`/
// `groupNearbyExpenses` — this suite exercises the REAL `EventTimeline` and
// the REAL `domain/timeline` helpers throughout); the imprecise
// `expenseMarkers.length >= mockExpenses.length` assertion from
// `timeline.test.tsx` (grouping intentionally produces FEWER markers than
// expenses when dates coincide — replaced with an exact, correct count);
// `postEventExpenses.test.tsx`'s direct numeric assertions on
// `calculatePositionPercentage` (already covered, timezone-fixed, in
// `src/domain/timeline/index.test.ts` — this file only asserts the
// resulting `data-post-event` marker/legend rendering).
//
// What is NEW: the permanently-present `sr-only` accessible text
// alternative (every expense reachable without ever opening a hover card —
// CLAUDE.md/plan requirement, no legacy equivalent existed), a dedicated
// keyboard-focus-only test (the legacy suite only ever used `fireEvent.click`),
// and the "no dates set" / "no expenses" guard states.
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventTimeline, type EventTimelineExpense } from './EventTimeline';

const USERS = { u1: 'Alex', u2: 'Sam' };

const EVENT = { startDate: '2023-06-01', endDate: '2023-06-10' };

const EXPENSES: EventTimelineExpense[] = [
  { id: 'exp1', description: 'Pre-event expense', amount: 100, currency: 'USD', date: '2023-05-20', paidBy: 'u1', settledAt: '2023-05-21T00:00:00.000Z' },
  { id: 'exp2', description: 'Start date expense', amount: 50, currency: 'USD', date: '2023-06-01', paidBy: 'u1', settledAt: null },
  { id: 'exp3', description: 'Mid-event expense', amount: 200, currency: 'USD', date: '2023-06-05', paidBy: 'u1', settledAt: '2023-06-06T00:00:00.000Z' },
  { id: 'exp4', description: 'Same day expense', amount: 75, currency: 'EUR', date: '2023-06-05', paidBy: 'u2', settledAt: null },
  { id: 'exp5', description: 'End date expense', amount: 25, currency: 'USD', date: '2023-06-10', paidBy: 'u2', settledAt: null },
];

const identity = (amount: number, _currency: string) => amount;

function renderTimeline(overrides: Partial<React.ComponentProps<typeof EventTimeline>> = {}) {
  const onNavigate = overrides.onNavigate ?? vi.fn();
  const utils = render(
    <EventTimeline
      event={EVENT}
      expenses={EXPENSES}
      users={USERS}
      convert={identity}
      currency="USD"
      onNavigate={onNavigate}
      {...overrides}
    />,
  );
  return { ...utils, onNavigate };
}

describe('EventTimeline — dates and grouping (ported from timeline.test.tsx, expenseGroups.test.tsx)', () => {
  it('renders the event start and end dates', () => {
    renderTimeline();
    expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument();
    expect(screen.getByText('Jun 10, 2023')).toBeInTheDocument();
  });

  it('renders one real button marker per timeline group, merging the two same-day mid-event expenses into one', () => {
    renderTimeline();
    // Groups: pre-event (exp1), start day (exp2), mid-event same-day pair (exp3+exp4), end day (exp5).
    const markers = screen.getAllByTestId('timeline-marker');
    expect(markers).toHaveLength(4);
    markers.forEach((marker) => expect(marker.tagName).toBe('BUTTON'));
  });

  it("gives the merged same-day group's marker an accessible name mentioning both expenses", () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    const grouped = markers.find((marker) => marker.getAttribute('aria-label')?.includes('2 expenses'));
    expect(grouped).toBeDefined();
    expect(grouped).toHaveAttribute('data-status', 'mixed');
  });

  it('renders an event with no end date showing only the start date', () => {
    renderTimeline({ event: { startDate: '2023-06-01' } });
    expect(screen.getByText('Jun 1, 2023')).toBeInTheDocument();
    expect(screen.queryByText('Jun 10, 2023')).not.toBeInTheDocument();
  });
});

describe('EventTimeline — settlement status, never by color alone (ported from hoverCard.test.tsx)', () => {
  it('labels an all-settled group "settled" and shows it in the text legend', () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    expect(markers.some((m) => m.getAttribute('data-status') === 'settled')).toBe(true);
    expect(screen.getByText('Settled')).toBeInTheDocument();
  });

  it('labels an all-unsettled group "unsettled" and shows it in the text legend', () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    expect(markers.some((m) => m.getAttribute('data-status') === 'unsettled')).toBe(true);
    expect(screen.getByText('Unsettled')).toBeInTheDocument();
  });

  it('labels a mixed group "partially settled" in its accessible name and shows "Mixed settlement" in the legend', () => {
    renderTimeline();
    expect(screen.getByText('Mixed settlement')).toBeInTheDocument();
    const grouped = screen.getAllByTestId('timeline-marker').find((m) => m.getAttribute('data-status') === 'mixed');
    expect(grouped?.getAttribute('aria-label')).toMatch(/partially settled/);
  });
});

describe('EventTimeline — showSettlementStatus={false} (plan B14a, ADR 0014: no per-expense settled state exists to show)', () => {
  it('shows no settled / unsettled / mixed legend, and the markers carry a neutral status', () => {
    renderTimeline({ showSettlementStatus: false });
    expect(screen.queryByText('Settled')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsettled')).not.toBeInTheDocument();
    expect(screen.queryByText('Mixed settlement')).not.toBeInTheDocument();
    for (const marker of screen.getAllByTestId('timeline-marker')) {
      expect(marker).toHaveAttribute('data-status', 'neutral');
    }
  });

  it('never claims a settlement state in an accessible name, single or grouped, or in the text alternative', () => {
    renderTimeline({ showSettlementStatus: false });
    for (const marker of screen.getAllByTestId('timeline-marker')) {
      expect(marker.getAttribute('aria-label')).not.toMatch(/settled/i);
    }
    for (const entry of screen.getAllByTestId('timeline-sr-expense')) {
      expect(entry.textContent).not.toMatch(/settled/i);
    }
    // Still names the expense and its amount.
    // Once as the marker, once in the text alternative.
    expect(screen.getAllByRole('button', { name: /View expense: Start date expense, \$50\.00, Jun 1, 2023/ })).toHaveLength(2);
  });

  it('keeps the pre-/post-event legend and every expense reachable', () => {
    renderTimeline({ showSettlementStatus: false });
    expect(screen.getByText('Before the event')).toBeInTheDocument();
    expect(screen.getAllByTestId('timeline-sr-expense')).toHaveLength(EXPENSES.length);
  });

  it('the hover card lists the expenses without a settled state', async () => {
    renderTimeline({ showSettlementStatus: false });
    const grouped = screen.getAllByTestId('timeline-marker').find((m) => m.getAttribute('aria-label')?.includes('2 expenses'))!;
    await userEvent.hover(grouped);
    expect(await screen.findByText('Mid-event expense')).toBeInTheDocument();
    expect(screen.queryByText('Settled')).not.toBeInTheDocument();
    expect(screen.queryByText('Unsettled')).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ settled, \d+ unsettled/)).not.toBeInTheDocument();
  });

  it('defaults to showing the legacy settled state (unchanged for existing callers and the showcase)', () => {
    renderTimeline();
    expect(screen.getByText('Settled')).toBeInTheDocument();
  });
});

describe('EventTimeline — pre-/post-event expenses shown distinctly (ported from postEventExpenses.test.tsx)', () => {
  it('flags the pre-event marker and clamps it visually to the start of the track', () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    const preEvent = markers.find((m) => m.getAttribute('data-pre-event') === 'true');
    expect(preEvent).toBeDefined();
    expect(preEvent).toHaveStyle({ left: '0%' });
    expect(preEvent?.getAttribute('aria-label')).toMatch(/before the event/);
    expect(screen.getByText('Before the event')).toBeInTheDocument();
  });

  it('flags a post-event expense (dated after endDate) and clamps it to the end of the track', () => {
    const withPostEvent = [...EXPENSES, { id: 'exp6', description: 'Post-event expense', amount: 40, currency: 'USD', date: '2023-06-25', paidBy: 'u1', settledAt: null }];
    renderTimeline({ expenses: withPostEvent });
    const markers = screen.getAllByTestId('timeline-marker');
    const postEvent = markers.find((m) => m.getAttribute('data-post-event') === 'true');
    expect(postEvent).toBeDefined();
    expect(postEvent).toHaveStyle({ left: '100%' });
    expect(postEvent?.getAttribute('aria-label')).toMatch(/after the event/);
    expect(screen.getByText('After the event')).toBeInTheDocument();
  });
});

describe('EventTimeline — hover card reveals expense detail and navigates (ported from hoverCard.test.tsx)', () => {
  it('reveals description, converted amount, settlement status and payer on hover', async () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    const startMarker = markers.find((m) => m.getAttribute('aria-label')?.includes('Start date expense'))!;

    await userEvent.hover(startMarker);

    await waitFor(() => expect(screen.getByText('Start date expense')).toBeInTheDocument());
    expect(screen.getByText('$50.00')).toBeInTheDocument();
    expect(screen.getByText('Paid by Alex')).toBeInTheDocument();
  });

  it('reveals the same detail on keyboard focus alone, no pointer involved', async () => {
    renderTimeline();
    const markers = screen.getAllByTestId('timeline-marker');
    const startMarker = markers.find((m) => m.getAttribute('aria-label')?.includes('Start date expense'))!;

    startMarker.focus();

    await waitFor(() => expect(screen.getByText('Start date expense')).toBeInTheDocument());
  });

  it('converts the amount into the display currency using the injected convert function', async () => {
    const onNavigate = vi.fn();
    renderTimeline({ convert: (amount) => amount * 2, currency: 'MXN', onNavigate });
    const markers = screen.getAllByTestId('timeline-marker');
    const startMarker = markers.find((m) => m.getAttribute('aria-label')?.includes('Start date expense'))!;

    await userEvent.hover(startMarker);

    await waitFor(() => expect(screen.getByText('$100.00')).toBeInTheDocument());
  });

  it('calls onNavigate with the expense id when its item is clicked inside the hover card', async () => {
    const onNavigate = vi.fn();
    renderTimeline({ onNavigate });
    const markers = screen.getAllByTestId('timeline-marker');
    const startMarker = markers.find((m) => m.getAttribute('aria-label')?.includes('Start date expense'))!;

    await userEvent.hover(startMarker);
    const detail = await screen.findByText('Start date expense');
    await userEvent.click(detail.closest('button')!);

    expect(onNavigate).toHaveBeenCalledWith('exp2');
  });

  it('lists every expense in the grouped hover card, each independently navigable', async () => {
    const onNavigate = vi.fn();
    renderTimeline({ onNavigate });
    const grouped = screen.getAllByTestId('timeline-marker').find((m) => m.getAttribute('aria-label')?.includes('2 expenses'))!;

    await userEvent.hover(grouped);
    await screen.findByText('Mid-event expense');
    expect(screen.getByText('Same day expense')).toBeInTheDocument();

    await userEvent.click(screen.getByText('Same day expense').closest('button')!);
    expect(onNavigate).toHaveBeenCalledWith('exp4');
  });
});

describe('EventTimeline — sr-only accessible alternative, never hover-only (new, plan B11a requirement)', () => {
  it('lists every expense as a real, always-present button with date, description and amount', () => {
    renderTimeline();
    const items = screen.getAllByTestId('timeline-sr-expense');
    expect(items).toHaveLength(EXPENSES.length);
    expect(items[0]).toHaveTextContent('Pre-event expense');
    expect(items[0]).toHaveTextContent('$100.00');
    expect(items[0]).toHaveTextContent('May 20, 2023');
  });

  it('navigates via the sr-only list without ever opening a hover card', async () => {
    const onNavigate = vi.fn();
    renderTimeline({ onNavigate });
    const items = screen.getAllByTestId('timeline-sr-expense');
    await userEvent.click(items[2]); // exp3, "Mid-event expense"
    expect(onNavigate).toHaveBeenCalledWith('exp3');
  });
});

describe('EventTimeline — expenses panel is focus-visible, not permanently invisible (a11y fix, coordinator review)', () => {
  // The panel is `sr-only` (Tailwind) until focus enters it, then it becomes
  // a real visible panel — a sighted keyboard user must never tab onto a
  // control they cannot see (WCAG 2.4.7). Driven by an onFocus/onBlur state
  // toggle rather than CSS `:focus-within`, because Tailwind isn't compiled
  // in this test environment — a class-name assertion is the only thing
  // that's actually testable here, and the review explicitly calls this out
  // as the fallback when `:focus-within` isn't testable in jsdom.
  it('starts sr-only (visually hidden) before anything inside it has focus', () => {
    renderTimeline();
    expect(screen.getByTestId('timeline-expenses-panel')).toHaveClass('sr-only');
  });

  it('drops sr-only while focus is inside it, and restores it once focus leaves', () => {
    renderTimeline();
    const panel = screen.getByTestId('timeline-expenses-panel');
    const items = screen.getAllByTestId('timeline-sr-expense');

    fireEvent.focus(items[0]);
    expect(panel).not.toHaveClass('sr-only');
    expect(screen.getByText('Expenses in this event')).toBeInTheDocument();

    fireEvent.blur(items[0]);
    expect(panel).toHaveClass('sr-only');
  });

  // B11a follow-up (plan B11b): the blur handler used to close the panel on ANY
  // blur, so tabbing from one expense to the next closed it for a beat and
  // reopened it on the next focus — a visible flicker (and a layout jump) for
  // exactly the keyboard user this panel exists for. Only focus LEAVING the
  // panel may close it.
  it('stays open when focus moves to another control inside the panel (blur carries a relatedTarget inside)', () => {
    renderTimeline();
    const panel = screen.getByTestId('timeline-expenses-panel');
    const items = screen.getAllByTestId('timeline-sr-expense');

    fireEvent.focus(items[0]);
    fireEvent.blur(items[0], { relatedTarget: items[1] });

    expect(panel).not.toHaveClass('sr-only');
  });

  it('closes when focus moves to an element outside the panel', () => {
    renderTimeline();
    const panel = screen.getByTestId('timeline-expenses-panel');
    const items = screen.getAllByTestId('timeline-sr-expense');
    const marker = screen.getAllByTestId('timeline-marker')[0];

    fireEvent.focus(items[0]);
    fireEvent.blur(items[0], { relatedTarget: marker });

    expect(panel).toHaveClass('sr-only');
  });

  it('keeps each same-day grouped expense (exp3 and exp4) as its own naturally-focusable control in the panel — the dependable keyboard path into a merged marker', () => {
    renderTimeline();
    const items = screen.getAllByTestId('timeline-sr-expense');
    const midEvent = items.find((item) => item.textContent?.includes('Mid-event expense'));
    const sameDay = items.find((item) => item.textContent?.includes('Same day expense'));

    expect(midEvent).toBeDefined();
    expect(sameDay).toBeDefined();
    expect(midEvent).not.toBe(sameDay);
    // No explicit tabindex at all = a normal, natural tab stop (unlike the
    // hover-card popup's buttons below, which opt OUT of the tab order).
    expect(midEvent).not.toHaveAttribute('tabindex');
    expect(sameDay).not.toHaveAttribute('tabindex');
  });

  it("removes the hover-card popup's expense buttons from the tab order (tabIndex -1) — the panel above is the single dependable keyboard path, the popup is a mouse/hover quick-preview only", async () => {
    renderTimeline();
    const grouped = screen.getAllByTestId('timeline-marker').find((m) => m.getAttribute('aria-label')?.includes('2 expenses'))!;

    await userEvent.hover(grouped);
    const detail = await screen.findByText('Mid-event expense');
    const popupButton = detail.closest('button')!;

    expect(popupButton).toHaveAttribute('tabindex', '-1');
  });
});

describe('EventTimeline — empty / missing-data states', () => {
  it('renders no markers, legend or sr-only list when there are no expenses', () => {
    renderTimeline({ expenses: [] });
    expect(screen.queryAllByTestId('timeline-marker')).toHaveLength(0);
    expect(screen.queryAllByTestId('timeline-sr-expense')).toHaveLength(0);
    expect(screen.queryByTestId('timeline-expenses-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Settled')).not.toBeInTheDocument();
  });

  it('shows a fallback message when the event has neither startDate nor date', () => {
    renderTimeline({ event: {} });
    expect(screen.getByText(/no dates set/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId('timeline-marker')).toHaveLength(0);
  });
});
