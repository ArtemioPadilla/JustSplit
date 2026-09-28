import { EventTimeline, type EventTimelineExpense } from '@/components/features/events/EventTimeline';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper (plan B11a): obviously fictional sample data (a
 * made-up "Ski Trip" with made-up people), so nothing here reads real user
 * data. `onNavigate` just logs — a real mount (B11b) passes the events
 * island's actual navigation.
 */
const EVENT = { name: 'Ski Trip (fictional)', startDate: '2026-01-10', endDate: '2026-01-17' };

const USERS: Record<string, string> = { fictional1: 'Fictional Alex', fictional2: 'Fictional Sam' };

const EXPENSES: EventTimelineExpense[] = [
  { id: 'fictional-exp-1', description: 'Fictional gear rental', amount: 60, currency: 'USD', date: '2026-01-05', paidBy: 'fictional1', settledAt: '2026-01-06T00:00:00.000Z' },
  { id: 'fictional-exp-2', description: 'Fictional lift tickets', amount: 320, currency: 'USD', date: '2026-01-10', paidBy: 'fictional1', settledAt: null },
  { id: 'fictional-exp-3', description: 'Fictional cabin (night 1)', amount: 210, currency: 'EUR', date: '2026-01-13', paidBy: 'fictional2', settledAt: '2026-01-14T00:00:00.000Z' },
  { id: 'fictional-exp-4', description: 'Fictional groceries', amount: 45, currency: 'EUR', date: '2026-01-13', paidBy: 'fictional1', settledAt: null },
  { id: 'fictional-exp-5', description: 'Fictional dinner out', amount: 90, currency: 'USD', date: '2026-01-17', paidBy: 'fictional2', settledAt: null },
];

const identityConvert = (amount: number) => amount;

export default function ShowcaseEventTimeline() {
  return (
    <ErrorBoundary name="ShowcaseEventTimeline">
      <EventTimeline
        event={EVENT}
        expenses={EXPENSES}
        users={USERS}
        convert={identityConvert}
        currency="USD"
        onNavigate={(expenseId) => {
          // Showcase demo only, never shipped to a real page — a real mount (B11b) navigates for real.
          console.log('Showcase: would navigate to expense', expenseId);
        }}
      />
    </ErrorBoundary>
  );
}
