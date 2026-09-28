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

/** Path-/OS-hostile characters (Windows reserved set, superset of POSIX's `/`) plus control chars. */
const UNSAFE_FILENAME_CHARS_RE = /[\\/:*?"<>|\x00-\x1f]/g;

/**
 * Strip path-/OS-hostile and control characters from a filename built from
 * user-controlled input (plan B17a: `ExportCsvButton` callers pass
 * `<event.name>-expenses.csv`, and event names are written by any group
 * member). Collapses whitespace runs and trims the ends; falls back to
 * `'expenses.csv'` if sanitizing leaves nothing behind. Run this BEFORE
 * `ensureCSVExtension` — sanitizing after would strip characters from an
 * already-appended `.csv` in edge cases (e.g. an all-hostile input) and
 * could leave a non-fallback, extension-only result like `.csv`.
 */
export const sanitizeFilename = (filename: string): string => {
  const cleaned = filename.replace(UNSAFE_FILENAME_CHARS_RE, '').replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'expenses.csv';
};
