import { z } from 'zod';

/**
 * An optional string column that reads back as `undefined` when the database
 * holds NULL (plan B11b). The relational adapter copies every mapped column into
 * the document, so a column nobody filled in is `null`, never absent — and
 * `z.string().optional()` rejects `null`, which made `repos.*.get` throw for the
 * most ordinary row (an expense without notes, a group without a description)
 * right after a successful insert. `preprocess` keeps ONE "absent" shape
 * (`undefined`) for every caller and leaves the inferred type — `string |
 * undefined`, optional key — exactly as it was.
 */
export const optionalColumn = () => z.preprocess((value) => (value === null ? undefined : value), z.string().optional());
