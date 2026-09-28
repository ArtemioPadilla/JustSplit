/**
 * Locale-aware date formatter.
 *
 * Wraps `Intl.DateTimeFormat` so every date rendered on the site uses the same
 * options. Pass the page locale (from `detectLocale(pathname)` or the `lang`
 * prop) to get language-appropriate formatting automatically — e.g. "June 9,
 * 2026" in English vs "9 de junio de 2026" in Spanish.
 *
 * ## Usage in Astro pages
 * ```ts
 * import { formatDate } from '@/lib/format-date';
 * const label = formatDate(new Date(post.date), 'es');
 * ```
 *
 * ## Why not dayjs / date-fns?
 * `Intl.DateTimeFormat` is built into every modern runtime, ships zero bytes to
 * the browser, and covers all Inceptor-supported locales without locale data
 * bundles. We only need human-readable labels, not arithmetic.
 */

import type { Locale } from '@/i18n';

/**
 * Format a `Date` as a human-readable string in the given locale.
 *
 * @param date   - The date to format.
 * @param locale - A `Locale` value ('en' | 'es'). Defaults to 'en'.
 * @param opts   - Override `Intl.DateTimeFormatOptions`; defaults to
 *                 `{ dateStyle: 'long' }` which produces e.g. "June 9, 2026".
 *
 * @example
 * formatDate(new Date('2026-06-09'), 'en') // "June 9, 2026"
 * formatDate(new Date('2026-06-09'), 'es') // "9 de junio de 2026"
 */
export function formatDate(
  date: Date,
  locale: Locale = 'en',
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'long' },
): string {
  // Use a BCP 47 tag: 'es' → 'es-419' (Latin American) gives the most widely
  // understood Spanish form. 'en' stays as-is (defaults to en-US in Node/V8).
  const bcp47 = locale === 'es' ? 'es-419' : locale;
  return new Intl.DateTimeFormat(bcp47, opts).format(date);
}
