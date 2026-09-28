import * as React from 'react';

import { DownloadTrigger } from '@/components/ui/download-trigger';
import { expensesToCSV, type CsvNamedEvent, type CsvNamedUser } from '@/domain/csvExport';
import { ensureCSVExtension, sanitizeFilename } from '@/domain/fileUtils';
import { notifyError } from '@/stores/notifications';
import type { Expense } from '@/schemas/expense';

/** So Excel renders accented names correctly (the user base writes Spanish) — BOM lives in the Blob only. */
const UTF8_BOM = '﻿';

export interface ExportCsvButtonProps {
  /** Expenses to export — already filtered to whatever scope the caller owns (all, one event, one expense...). */
  expenses: Expense[];
  /** `{id,name}` lookup — callers resolve these from `useProfiles` (B5a); this component stays data-source-agnostic. */
  users: CsvNamedUser[];
  events: CsvNamedEvent[];
  /** Sanitized and given a `.csv` extension before it ever reaches the download. */
  filename: string;
  label?: string;
  disabled?: boolean;
}

/**
 * Shared CSV export button (plan B17a) — wraps `download-trigger.tsx` around
 * `domain/csvExport.ts#expensesToCSV`. Mounted by the four export sites the
 * legacy UI has today: `DashboardHeader` (B8b), the expenses list toolbar
 * (B9), expense detail (B9) and event detail (B11b) — none of that mounting
 * happens here; this issue only ships the button and its `/showcase` entry.
 */
export function ExportCsvButton({
  expenses,
  users,
  events,
  filename,
  label = 'Export as CSV',
  disabled,
}: ExportCsvButtonProps) {
  const handleExport = React.useCallback(async () => {
    // expensesToCSV's string output is untouched apart from the formula-
    // injection neutralization it already applies (B17a) — the BOM is
    // prepended only in the Blob passed to the browser download.
    const csv = expensesToCSV(expenses, users, events);
    return new Blob([UTF8_BOM, csv], { type: 'text/csv;charset=utf-8' });
  }, [expenses, users, events]);

  const handleError = React.useCallback((error: Error) => {
    notifyError('Could not export CSV', { description: error.message });
  }, []);

  // Sanitize BEFORE ensuring the extension (see fileUtils.ts's doc comment):
  // callers pass user-controlled event names (`<event.name>-expenses.csv`).
  const safeFilename = ensureCSVExtension(sanitizeFilename(filename));

  return (
    <DownloadTrigger
      onExport={handleExport}
      filename={safeFilename}
      label={label}
      onError={handleError}
      disabled={disabled}
    />
  );
}
