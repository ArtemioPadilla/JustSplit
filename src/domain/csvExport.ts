/**
 * CSV export (plan B3). Ported from the legacy Next tree's
 * `src/utils/csvExport.ts`, re-typed onto the `src/schemas/expense.ts`
 * `Expense` (spec D10): `participants` reads from `splits[].userId` instead
 * of the retired `participants` array, and `status` is "Settled" for a legacy
 * `settledAt != null` only, empty otherwise (B14a, ADR 0014). `users`/`events` stay small,
 * schema-independent lookup shapes (`{ id, name }`) — a `User` collection
 * doesn't exist in the universal types; only names are needed here.
 */
import type { Expense } from '../schemas/expense';
import { ensureCSVExtension } from './fileUtils';
import { parseCalendarDate } from './dates';
import { isLegacySettled } from './ledger';

export interface CsvNamedUser {
  id: string;
  name: string;
}

export interface CsvNamedEvent {
  id: string;
  name: string;
}

const warn = (message: string): void => {
  console.warn(`[CSV Export] ${message}`);
};

/**
 * CSV formula-injection neutralization (B17a, OWASP CSV-injection guidance):
 * every text cell in an export can be written by another group member and
 * opened in Excel/Sheets, which treats a cell starting with `=`, `+`, `-`,
 * `@`, a tab or a CR as a formula/macro trigger. Prefixing it with a single
 * quote forces it to render as literal text while leaving benign values
 * (and numeric cells, which never go through this function) untouched.
 */
const FORMULA_INJECTION_PREFIX_RE = /^[=+\-@\t\r]/;
const neutralizeCsvFormula = (value: string): string =>
  FORMULA_INJECTION_PREFIX_RE.test(value) ? `'${value}` : value;

/** Always-quote escaping, used by `expensesToCSV` (matches the legacy output byte-for-byte). */
const quoteCsvValue = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/** Quote-only-when-needed escaping, used by the generic `exportToCSV`. */
const escapeCsvValue = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

/** Convert `expenses` to a CSV string (one row per expense, header first). */
export const expensesToCSV = (expenses: Expense[], users: CsvNamedUser[], events: CsvNamedEvent[]): string => {
  const headers = ['Date', 'Description', 'Amount', 'Currency', 'Paid By', 'Participants', 'Event', 'Status', 'Notes'];

  const getUserName = (userId: string): string => users.find((u) => u.id === userId)?.name ?? 'Unknown';

  const getEventName = (eventId?: string | null): string => {
    if (!eventId) return 'No Event';
    return events.find((e) => e.id === eventId)?.name ?? 'Unknown Event';
  };

  const rows = expenses.map((expense) => {
    const participantNames = expense.splits.map((split) => getUserName(split.userId)).join(', ');
    // Plan B14a (ADR 0014): only a legacy (imported) `settledAt` says "Settled".
    // Settling up is a payment on a ledger, so no per-expense status can be derived
    // honestly; the cell stays empty rather than claiming "Unsettled".
    const status = isLegacySettled(expense) ? 'Settled' : '';

    return [
      // Date, amount, currency and status are never user-controlled text —
      // neutralization is deliberately skipped for these four columns so a
      // negative amount stays numeric (spec: "do not alter numeric cells").
      // `parseCalendarDate` (bug fix, B8a review): a bare `new Date(expense.date)`
      // reads a calendar-date string as UTC midnight, exporting the PREVIOUS
      // day for anyone west of UTC (the user base is largely in Mexico, UTC-6).
      parseCalendarDate(expense.date).toLocaleDateString(),
      neutralizeCsvFormula(expense.description),
      expense.amount.toFixed(2),
      expense.currency,
      neutralizeCsvFormula(getUserName(expense.paidBy)),
      neutralizeCsvFormula(participantNames),
      neutralizeCsvFormula(getEventName(expense.eventId)),
      status,
      neutralizeCsvFormula(expense.notes ?? ''),
    ]
      .map((value) => quoteCsvValue(value.toString()))
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

/** Trigger a browser download of `csvContent` as `filename`. */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

/** Convert `expenses` to CSV and trigger a download in one call. */
export const exportExpensesToCSV = (
  expenses: Expense[],
  users: CsvNamedUser[],
  events: CsvNamedEvent[],
  filename = 'expenses.csv',
): void => {
  downloadCSV(expensesToCSV(expenses, users, events), filename);
};

/** Convert any row-shaped array to CSV (headers from the first row's keys) and trigger a download. */
export const exportToCSV = <T extends Record<string, unknown>>(data: T[], filename: string): void => {
  if (!data || data.length === 0) {
    warn('No data provided for CSV export');
    downloadCSV('', ensureCSVExtension(filename || 'export.csv'));
    return;
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const cell = row[header];
          const cellData = cell === undefined || cell === null ? '' : String(cell);
          // Only neutralize genuine string cells — a numeric cell (e.g. a
          // negative balance) must stay numeric, never gain a `'` prefix,
          // even though its stringified form also starts with `-`.
          const safeData = typeof cell === 'string' ? neutralizeCsvFormula(cellData) : cellData;
          return escapeCsvValue(safeData);
        })
        .join(','),
    ),
  ].join('\n');

  downloadCSV(csvContent, ensureCSVExtension(filename));
};
