// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    expect(dataRow).toContain('Unsettled');
    expect(dataRow).toContain('Test notes');
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
