/**
 * Category taxonomy stub (plan B3, spec D9). Exports only the five legacy
 * keys the Next app already writes today (byte-for-byte, spec D9) — the only
 * options plan B10's category select may write. Track D issue D1 replaces
 * this whole file with the full 16-key taxonomy (`{ key, labels: {en, es},
 * icon, color }`), `normalizeCategory()` and `categoriesForKind()`; it does
 * **not** replace the form, which keeps working against whatever this file
 * currently exports.
 */

export const LEGACY_CATEGORY_KEYS = ['food', 'transportation', 'accommodation', 'entertainment', 'other'] as const;

export type LegacyCategoryKey = (typeof LEGACY_CATEGORY_KEYS)[number];
