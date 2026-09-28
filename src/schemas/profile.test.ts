import { describe, expect, it } from 'vitest';
import { JustSplitProfileSchema } from './profile';

const validProfile = {
  id: 'a1b2c3',
  apps: ['justsplit'],
  permissions: [],
  preferences: { preferredCurrency: 'USD' },
};

describe('JustSplitProfileSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => JustSplitProfileSchema.parse(validProfile)).not.toThrow();
  });

  it('accepts preferences.phoneNumber (the hub profiles table has no phoneNumber column)', () => {
    const parsed = JustSplitProfileSchema.parse({
      ...validProfile,
      preferences: { preferredCurrency: 'MXN', phoneNumber: '+52 555 0100' },
    });
    expect(parsed.preferences.phoneNumber).toBe('+52 555 0100');
  });

  it('is .passthrough() on preferences: an unknown preference key survives the parse', () => {
    const parsed = JustSplitProfileSchema.parse({
      ...validProfile,
      preferences: { preferredCurrency: 'USD', theme: 'dark' },
    });
    expect(parsed.preferences).toMatchObject({ theme: 'dark' });
  });
});
