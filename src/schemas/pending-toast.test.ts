import { describe, expect, it } from 'vitest';
import { MAX_PENDING_TOASTS, PendingToastQueueSchema, PendingToastSchema } from './pending-toast';

/**
 * Plan B17b amendment (cross-navigation toasts, ADR 0008): the wire shape
 * for `sessionStorage`'s `justsplit:pending-toasts` key. A storage
 * boundary — CLAUDE.md rule 8 — so it's a Zod schema, not a bare
 * `interface`, and `drainPendingToasts()` must be able to reject anything
 * malformed without throwing.
 */
describe('PendingToastSchema', () => {
  it('accepts a valid entry with a description', () => {
    const result = PendingToastSchema.safeParse({ kind: 'error', title: 'Something broke', description: 'Try again.' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid entry without a description', () => {
    const result = PendingToastSchema.safeParse({ kind: 'success', title: 'Saved' });
    expect(result.success).toBe(true);
  });

  it('rejects an unknown kind', () => {
    const result = PendingToastSchema.safeParse({ kind: 'warning', title: 'Saved' });
    expect(result.success).toBe(false);
  });

  it('rejects an empty title', () => {
    const result = PendingToastSchema.safeParse({ kind: 'info', title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a missing title', () => {
    const result = PendingToastSchema.safeParse({ kind: 'info' });
    expect(result.success).toBe(false);
  });
});

describe('PendingToastQueueSchema', () => {
  it('accepts an array up to MAX_PENDING_TOASTS entries', () => {
    const queue = Array.from({ length: MAX_PENDING_TOASTS }, (_, i) => ({ kind: 'info' as const, title: `Toast ${i}` }));
    expect(PendingToastQueueSchema.safeParse(queue).success).toBe(true);
  });

  it('rejects an array longer than MAX_PENDING_TOASTS entries', () => {
    const queue = Array.from({ length: MAX_PENDING_TOASTS + 1 }, (_, i) => ({ kind: 'info' as const, title: `Toast ${i}` }));
    expect(PendingToastQueueSchema.safeParse(queue).success).toBe(false);
  });

  it('rejects a non-array (e.g. hand-edited devtools value, or a stale non-queue shape)', () => {
    expect(PendingToastQueueSchema.safeParse({ kind: 'info', title: 'not an array' }).success).toBe(false);
  });

  it('rejects an array containing one malformed entry', () => {
    const queue = [{ kind: 'info', title: 'ok' }, { kind: 'bogus', title: 'bad' }];
    expect(PendingToastQueueSchema.safeParse(queue).success).toBe(false);
  });
});
