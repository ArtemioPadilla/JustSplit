/**
 * File helpers (plan B3). Ported verbatim from the legacy Next tree's
 * `src/utils/fileUtils.ts`. Plan B5's client-side receipt resize (≤ 1600 px /
 * ≤ 1 MiB before upload) extends this file; out of scope here.
 */

/** Appends `.csv` to `filename` unless it already ends with it (case-insensitive). */
export const ensureCSVExtension = (filename: string): string => {
  if (!filename.toLowerCase().endsWith('.csv')) {
    return `${filename}.csv`;
  }
  return filename;
};
