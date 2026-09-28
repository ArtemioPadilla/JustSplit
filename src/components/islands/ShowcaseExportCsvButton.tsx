import * as React from 'react';
import { ExportCsvButton } from '@/components/features/export/ExportCsvButton';
import type { Expense } from '@/schemas/expense';
import ErrorBoundary from './ErrorBoundary';

/**
 * /showcase-only wrapper (plan B17a) — small, obviously-fictional in-memory
 * sample against `src/schemas/expense.ts` (no real-looking people or
 * testimonials). `ExportCsvButton` itself is data-source-agnostic; a real
 * mount site (B8b/B9/B11b) passes live expenses + `useProfiles` users.
 */
export default function ShowcaseExportCsvButton() {
  return (
    <ErrorBoundary name="ShowcaseExportCsvButton">
      <ShowcaseExportCsvButtonInner />
    </ErrorBoundary>
  );
}

const SAMPLE_USERS = [
  { id: 'demo-user-1', name: 'Pat Example' },
  { id: 'demo-user-2', name: 'Sam Sample' },
];

const SAMPLE_EVENTS = [{ id: 'demo-event-1', name: 'Fictional Cabin Weekend' }];

const SAMPLE_EXPENSES: Expense[] = [
  {
    id: 'demo-expense-1',
    groupId: null,
    description: 'Groceries',
    amount: 48.5,
    currency: 'USD',
    paidBy: 'demo-user-1',
    splitType: 'equal',
    splits: [
      { userId: 'demo-user-1', amount: 24.25 },
      { userId: 'demo-user-2', amount: 24.25 },
    ],
    date: '2026-01-04',
    eventId: 'demo-event-1',
    memberIds: ['demo-user-1', 'demo-user-2'],
    createdBy: 'demo-user-1',
    createdAt: '2026-01-04T12:00:00.000Z',
    settledAt: null,
  },
  {
    id: 'demo-expense-2',
    groupId: null,
    description: 'Firewood',
    amount: 15,
    currency: 'USD',
    paidBy: 'demo-user-2',
    splitType: 'equal',
    splits: [
      { userId: 'demo-user-1', amount: 7.5 },
      { userId: 'demo-user-2', amount: 7.5 },
    ],
    date: '2026-01-05',
    eventId: 'demo-event-1',
    memberIds: ['demo-user-1', 'demo-user-2'],
    createdBy: 'demo-user-2',
    createdAt: '2026-01-05T09:00:00.000Z',
    settledAt: '2026-01-06T00:00:00.000Z',
  },
];

function ShowcaseExportCsvButtonInner() {
  return (
    <div className="flex flex-col gap-2">
      <ExportCsvButton
        expenses={SAMPLE_EXPENSES}
        users={SAMPLE_USERS}
        events={SAMPLE_EVENTS}
        filename="fictional-cabin-weekend-expenses.csv"
      />
      <p className="text-xs text-muted-foreground">
        Downloads a CSV built from the two fictional expenses above (domain/csvExport.ts).
      </p>
    </div>
  );
}
