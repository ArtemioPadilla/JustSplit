// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Expense } from '../schemas/expense';
import { downloadCSV, exportExpensesToCSV, exportToCSV, expensesToCSV } from './csvExport';

/**
 * Ported from the legacy Next tree's `src/utils/__tests__/csvExport.test.ts`
 * (plan B3, spec D10): fixtures move from `participants`/`settled` to
 * `splits[]`/`settledAt`; `users`/`events` are the new `CsvNamedUser`/
 * `CsvNamedEvent` lookup shapes. Needs jsdom (`document`, `Blob`, `URL`).
 */

let nextId = 0;
function makeExpense(overrides: Partial<Expense> & Pick<Expense, 'amount' | 'paidBy' | 'description'> & { participantIds: string[] }): Expense {
  nextId += 1;
  const { participantIds, ...rest } = overrides;
  return {
    id: `exp${nextId}`,
    groupId: null,
    currency: 'USD',
    splitType: 'equal',
    date: '2023-01-01',
    memberIds: participantIds,
    createdBy: rest.paidBy,
    createdAt: '2023-01-01T00:00:00.000Z',
    settledAt: null,
    splits: participantIds.map((userId) => ({ userId, amount: rest.amount / participantIds.length })),
    ...rest,
  };
}

describe('expensesToCSV', () => {
  beforeEach(() => {
    nextId = 0;
  });

  it('generates the header row', () => {
    const rows = expensesToCSV([], [], []).split('\n');
    expect(rows.length).toBeGreaterThanOrEqual(1);
    ['Date', 'Description', 'Amount', 'Currency', 'Paid By', 'Participants', 'Event', 'Status', 'Notes'].forEach((h) =>
      expect(rows[0]).toContain(h),
    );
  });

  it('formats expense data correctly', () => {
    const expenses = [
      makeExpense({ description: 'Lunch', amount: 100.5, paidBy: 'user1', participantIds: ['user1', 'user2'], eventId: 'event1', notes: 'Test notes' }),
    ];
    const users = [
      { id: 'user1', name: 'Alice' },
      { id: 'user2', name: 'Bob' },
    ];
    const events = [{ id: 'event1', name: 'Trip' }];

    const rows = expensesToCSV(expenses, users, events).split('\n');
    expect(rows).toHaveLength(2);

    const dataRow = rows[1];
    expect(dataRow).toContain('Lunch');
    expect(dataRow).toContain('100.50');
    expect(dataRow).toContain('USD');
    expect(dataRow).toContain('Alice');
    expect(dataRow).toContain('Alice, Bob');
    expect(dataRow).toContain('Trip');
    // Plan B14a (ADR 0014): no per-expense status can be derived honestly from a ledger, so the cell is empty.
    expect(dataRow).not.toContain('Unsettled');
    expect(dataRow).toContain('"Trip","","Test notes"');
    expect(dataRow).toContain('Test notes');
  });

  it('writes "Settled" only for a legacy (imported) settledAt, and an empty status otherwise', () => {
    const legacy = makeExpense({ description: 'Old', amount: 10, paidBy: 'user1', participantIds: ['user1'], settledAt: '2023-01-02T00:00:00.000Z' });
    const live = makeExpense({ description: 'New', amount: 10, paidBy: 'user1', participantIds: ['user1'] });
    const rows = expensesToCSV([legacy, live], [{ id: 'user1', name: 'Alice' }], []).split('\n');
    expect(rows[1]).toContain('"Settled"');
    expect(rows[2]).not.toMatch(/settled/i);
    // The header keeps its shape: an empty cell, not a removed column.
    expect(rows[2]!.split('","')).toHaveLength(rows[0]!.split(',').length);
  });

  it('handles unknown users and events gracefully', () => {
    const expenses = [
      makeExpense({
        description: 'Lunch',
        amount: 100,
        paidBy: 'unknown-user',
        participantIds: ['unknown-user'],
        eventId: 'unknown-event',
        settledAt: '2023-01-02T00:00:00.000Z',
      }),
    ];

    const rows = expensesToCSV(expenses, [], []).split('\n');
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain('Unknown');
    expect(rows[1]).toContain('Unknown Event');
    expect(rows[1]).toContain('Settled');
  });

  it('escapes special characters', () => {
    const expenses = [
      makeExpense({
        description: 'Lunch, with "quotes"',
        amount: 100,
        paidBy: 'user1',
        participantIds: ['user1'],
        notes: 'Notes with, commas and "quotes"',
      }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    expect(dataRow).toContain('"Lunch, with ""quotes"""');
    expect(dataRow).toContain('"Notes with, commas and ""quotes"""');
  });

  /**
   * B17a: every user-controlled TEXT cell (description, notes, payer/
   * participant names, event name) is written by other group members, so a
   * cell that starts with `=`, `+`, `-`, `@`, a tab or a CR must be
   * defanged with a leading `'` before quoting (OWASP CSV-injection
   * guidance) — otherwise opening the export in Excel/Sheets executes it as
   * a formula. The computed date, `amount.toFixed(2)`, currency code and
   * status columns are never user-controlled text and must stay untouched
   * (a negative amount must remain numeric, not gain a `'` prefix).
   */
  it('neutralizes a formula-injection payload in the description', () => {
    const expenses = [
      makeExpense({
        description: '=HYPERLINK("http://evil.example","click me")',
        amount: 10,
        paidBy: 'user1',
        participantIds: ['user1'],
      }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    // Internal double-quotes are still doubled by quoteCsvValue on top of the neutralization prefix.
    expect(dataRow).toContain('"\'=HYPERLINK(""http://evil.example"",""click me"")"');
  });

  it('neutralizes a formula-injection payload in notes', () => {
    const expenses = [
      makeExpense({
        description: 'Groceries',
        amount: 10,
        paidBy: 'user1',
        participantIds: ['user1'],
        notes: '+1',
      }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    expect(dataRow.endsWith('"\'+1"')).toBe(true);
  });

  it('neutralizes a formula-injection payload in a payer/participant name', () => {
    const expenses = [
      makeExpense({ description: 'Dinner', amount: 20, paidBy: 'user1', participantIds: ['user1'] }),
    ];
    const users = [{ id: 'user1', name: '@SUM(A1)' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    // Both the "Paid By" and "Participants" columns render the same name.
    expect(dataRow.match(/"'@SUM\(A1\)"/g)?.length).toBe(2);
  });

  it('neutralizes a formula-injection payload in the event name', () => {
    const expenses = [
      makeExpense({ description: 'Dinner', amount: 20, paidBy: 'user1', participantIds: ['user1'], eventId: 'event1' }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];
    const events = [{ id: 'event1', name: '-2+3' }];

    const dataRow = expensesToCSV(expenses, users, events).split('\n')[1];
    expect(dataRow).toContain('"\'-2+3"');
  });

  it('neutralizes a value that starts with a tab or a carriage return', () => {
    const expenses = [
      makeExpense({ description: '\tsneaky', amount: 10, paidBy: 'user1', participantIds: ['user1'] }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    expect(dataRow).toContain('"\'\tsneaky"');
  });

  it('leaves a benign description and the numeric amount column unchanged, including a negative amount', () => {
    const expenses = [
      makeExpense({ description: 'Lunch', amount: -15, paidBy: 'user1', participantIds: ['user1'] }),
    ];
    const users = [{ id: 'user1', name: 'Alice' }];

    const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
    expect(dataRow).toContain('"Lunch"');
    expect(dataRow).toContain('"-15.00"');
    expect(dataRow).not.toContain("'-15.00");
  });

  /**
   * Bug fix (found in B8a review): `expense.date` is a calendar-date string
   * (`YYYY-MM-DD`) from an `<input type="date">`, but `new Date('2026-03-01')`
   * parses that as UTC midnight — anyone west of UTC (the user base is
   * largely in Mexico, UTC-6) exports the PREVIOUS day. Pinned to
   * America/Mexico_City so this fails for the right reason regardless of
   * where/when the suite runs.
   */
  describe('date cell — timezone-safe calendar-date parsing (bug fix)', () => {
    let originalTZ: string | undefined;

    beforeAll(() => {
      originalTZ = process.env.TZ;
      process.env.TZ = 'America/Mexico_City';
    });

    afterAll(() => {
      // Unset stays unset: assigning undefined would leave the string "undefined" (plan A7).
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    it('renders the Date column as the calendar date, not the previous day', () => {
      const expenses = [
        makeExpense({ description: 'Lunch', amount: 10, paidBy: 'user1', participantIds: ['user1'], date: '2026-03-01' }),
      ];
      const users = [{ id: 'user1', name: 'Alice' }];

      const dataRow = expensesToCSV(expenses, users, []).split('\n')[1];
      const expectedDate = new Date(2026, 2, 1).toLocaleDateString();
      expect(dataRow).toContain(expectedDate);
    });
  });
});

describe('exportToCSV formula-injection neutralization (B17a)', () => {
  beforeEach(() => {
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { setAttribute: vi.fn(), style: { display: '' }, click: vi.fn(), remove: vi.fn() };
      }
      return null;
    }) as unknown as typeof document.createElement;
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('neutralizes a formula-injection string cell but leaves a numeric cell (even negative) untouched', () => {
    // downloadCSV builds the Blob synchronously from the CSV string; capture
    // it from the createObjectURL call and read it back with Blob#text()
    // rather than racing exportToCSV's (synchronous) return.
    let capturedBlob: Blob | null = null;
    (URL.createObjectURL as unknown as ReturnType<typeof vi.fn>).mockImplementation((blob: Blob) => {
      capturedBlob = blob;
      return 'mock-url';
    });

    exportToCSV([{ label: '=cmd|/c calc', balance: -42 }], 'export');

    expect(capturedBlob).not.toBeNull();
    return (capturedBlob as unknown as Blob).text().then((text) => {
      const dataRow = text.split('\n')[1];
      expect(dataRow).toContain("'=cmd|/c calc");
      expect(dataRow).toContain('-42');
      expect(dataRow).not.toContain("'-42");
    });
  });
});

describe('downloadCSV', () => {
  const mockClick = vi.fn();
  let originalCreateElement: typeof document.createElement;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateElement = document.createElement;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    document.createElement = vi.fn().mockReturnValue({ setAttribute: vi.fn(), style: {}, click: mockClick });
    URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('creates a link, clicks it, and revokes the object URL', () => {
    downloadCSV('test,data', 'test.csv');
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockClick).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });
});

describe('exportExpensesToCSV', () => {
  beforeEach(() => {
    nextId = 0;
    document.createElement = vi.fn().mockReturnValue({ setAttribute: vi.fn(), style: {}, click: vi.fn() });
    URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts expenses to CSV and triggers a download', () => {
    const expenses = [makeExpense({ description: 'Lunch', amount: 100, paidBy: 'user1', participantIds: ['user1', 'user2'] })];
    const users = [
      { id: 'user1', name: 'Alice' },
      { id: 'user2', name: 'Bob' },
    ];

    exportExpensesToCSV(expenses, users, [], 'test.csv');
    expect(document.createElement).toHaveBeenCalledWith('a');
  });
});

describe('exportToCSV', () => {
  beforeEach(() => {
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { setAttribute: vi.fn(), style: { display: '' }, click: vi.fn(), remove: vi.fn() };
      }
      return null;
    }) as unknown as typeof document.createElement;
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
    URL.createObjectURL = vi.fn().mockReturnValue('mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports data to CSV format', () => {
    const testData = [
      { name: 'John Doe', email: 'john@example.com', amount: 100 },
      { name: 'Jane Smith', email: 'jane@example.com', amount: 150 },
    ];

    exportToCSV(testData, 'test-export');

    expect(URL.createObjectURL).toHaveBeenCalled();
    const mockCreateElement = document.createElement as unknown as ReturnType<typeof vi.fn>;
    const mockAnchor = mockCreateElement.mock.results[0].value;

    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('href', 'mock-url');
    expect(mockAnchor.setAttribute).toHaveBeenCalledWith('download', 'test-export.csv');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('handles empty data gracefully', () => {
    exportToCSV([], 'empty-export');
    expect(URL.createObjectURL).toHaveBeenCalled();
    const mockCreateElement = document.createElement as unknown as ReturnType<typeof vi.fn>;
    const mockAnchor = mockCreateElement.mock.results[0].value;
    expect(mockAnchor.click).toHaveBeenCalled();
  });
});
