import { describe, expect, it } from 'vitest';
import { LEGACY_CATEGORY_KEYS } from './categories';

describe('LEGACY_CATEGORY_KEYS (plan B3, spec D9 — byte-for-byte with the Next app)', () => {
  it('is exactly the five keys the Next app writes today', () => {
    expect(LEGACY_CATEGORY_KEYS).toEqual(['food', 'transportation', 'accommodation', 'entertainment', 'other']);
  });
});
