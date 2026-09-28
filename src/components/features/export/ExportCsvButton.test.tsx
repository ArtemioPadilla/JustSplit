// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Expense } from '@/schemas/expense';
import { ExportCsvButton } from './ExportCsvButton';

/**
 * Plan B17a: `ExportCsvButton` wraps `download-trigger.tsx` around
 * `domain/csvExport.ts#expensesToCSV`. Behavior contracts under test:
 *   1. Renders the legacy "Export as CSV" label by default and triggers a
 *      download whose Blob carries a UTF-8 BOM + `text/csv;charset=utf-8`.
 *   2. A path-/OS-hostile filename is sanitized and gets a `.csv` extension
 *      before it ever reaches `anchor.download`.
 *   3. A failed export surfaces through `notifyError` (toasts only), not
 *      console-only, and the button recovers from its loading state.
 */

const { notifyError } = vi.hoisted(() => ({ notifyError: vi.fn() }));
vi.mock('@/stores/notifications', () => ({ notifyError }));

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp1',
    groupId: null,
    description: 'Lunch',
    amount: 42,
    currency: 'USD',
    paidBy: 'user1',
    splitType: 'equal',
    splits: [{ userId: 'user1', amount: 42 }],
    date: '2023-01-01',
    memberIds: ['user1'],
    createdBy: 'user1',
    createdAt: '2023-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const users = [{ id: 'user1', name: 'Alice' }];
const events = [{ id: 'event1', name: 'Trip' }];

let capturedBlob: Blob | null;
let capturedFilename: string | null;

beforeEach(() => {
  capturedBlob = null;
  capturedFilename = null;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return 'blob:mock-url';
    }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    capturedFilename = this.download;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  notifyError.mockClear();
});

describe('ExportCsvButton', () => {
  it('renders the legacy "Export as CSV" label by default', () => {
    render(<ExportCsvButton expenses={[makeExpense()]} users={users} events={events} filename="expenses" />);
    expect(screen.getByRole('button', { name: 'Export as CSV' })).toBeInTheDocument();
  });

  it('downloads a UTF-8-BOM-prefixed text/csv Blob built from expensesToCSV', async () => {
    const user = userEvent.setup();
    render(<ExportCsvButton expenses={[makeExpense()]} users={users} events={events} filename="expenses" />);

    await user.click(screen.getByRole('button', { name: 'Export as CSV' }));

    await waitFor(() => expect(capturedBlob).not.toBeNull());
    expect((capturedBlob as unknown as Blob).type).toBe('text/csv;charset=utf-8');
    const text = await (capturedBlob as unknown as Blob).text();
    expect(text.startsWith('﻿')).toBe(true);
    expect(text).toContain('Lunch');
  });

  it('sanitizes a path-hostile filename and appends .csv before the download', async () => {
    const user = userEvent.setup();
    render(
      <ExportCsvButton
        expenses={[makeExpense()]}
        users={users}
        events={events}
        filename="Trip/Report:2026"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Export as CSV' }));

    await waitFor(() => expect(capturedFilename).not.toBeNull());
    expect(capturedFilename).toBe('TripReport2026.csv');
  });

  it('surfaces a failed export through notifyError, not console-only, and recovers from loading', async () => {
    const user = userEvent.setup();
    // A malformed expense (participant id referencing nothing) still resolves fine —
    // force a real failure by making the Blob constructor throw for this one click.
    const originalBlob = globalThis.Blob;
    vi.stubGlobal(
      'Blob',
      class {
        constructor() {
          throw new Error('boom');
        }
      },
    );

    render(<ExportCsvButton expenses={[makeExpense()]} users={users} events={events} filename="expenses" />);
    const button = screen.getByRole('button', { name: 'Export as CSV' });
    await user.click(button);

    await waitFor(() => expect(notifyError).toHaveBeenCalledTimes(1));
    expect(notifyError.mock.calls[0]![0]).toEqual(expect.any(String));
    await waitFor(() => expect(button).not.toBeDisabled());

    vi.stubGlobal('Blob', originalBlob);
  });
});
