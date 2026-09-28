import { describe, expect, it } from 'vitest';
import { buildPreferencesPatch } from './profile';

/**
 * `buildPreferencesPatch` (plan B15) — the preferences-merge bug guard.
 * `SupabaseProfileStore.update` (`@cyber-eco/supabase`) upserts `preferences`
 * as a whole jsonb COLUMN VALUE (`{ id, ...sanitize(partial) }`), never a
 * jsonb merge: handing `updateProfile` a bare `{ phoneNumber }` would
 * silently wipe `preferredCurrency` (and the reverse). Every
 * `updateProfile({ preferences: ... })` call site must build that object
 * through this helper instead of an inline spread.
 */
describe('buildPreferencesPatch', () => {
  it('saving the phone keeps the existing preferredCurrency', () => {
    const current = { preferredCurrency: 'USD', phoneNumber: '555-0100' };
    const result = buildPreferencesPatch(current, { phoneNumber: '555-0199' });
    expect(result).toEqual({ preferredCurrency: 'USD', phoneNumber: '555-0199' });
  });

  it('saving the currency keeps the existing phone number', () => {
    const current = { preferredCurrency: 'USD', phoneNumber: '555-0100' };
    const result = buildPreferencesPatch(current, { preferredCurrency: 'EUR' });
    expect(result).toEqual({ preferredCurrency: 'EUR', phoneNumber: '555-0100' });
  });

  it('tolerates undefined current preferences (first edit ever)', () => {
    const result = buildPreferencesPatch(undefined, { preferredCurrency: 'USD' });
    expect(result).toEqual({ preferredCurrency: 'USD' });
  });

  it('drops a key explicitly patched to undefined instead of keeping it as an undefined value', () => {
    const current = { preferredCurrency: 'USD', phoneNumber: '555-0100' };
    const result = buildPreferencesPatch(current, { phoneNumber: undefined });
    expect(result).toEqual({ preferredCurrency: 'USD' });
    expect(Object.keys(result)).not.toContain('phoneNumber');
  });

  it('never mutates the current object passed in', () => {
    const current = { preferredCurrency: 'USD', phoneNumber: '555-0100' };
    buildPreferencesPatch(current, { preferredCurrency: 'EUR' });
    expect(current).toEqual({ preferredCurrency: 'USD', phoneNumber: '555-0100' });
  });
});
