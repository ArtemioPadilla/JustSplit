import { describe, expect, it } from 'vitest';
import { ProfileEditSchema } from './profile-edit';

/**
 * `ProfileEditSchema` (plan B15) — the profile island's name/phone form.
 * The phone regex mirrors the legacy `/app/profile/page.tsx`'s
 * `validatePhone` (git show origin/main:src/app/profile/page.tsx): a
 * lenient international-number pattern, empty is valid (optional field).
 */
describe('ProfileEditSchema', () => {
  it('accepts a trimmed display name and an empty phone number', () => {
    const result = ProfileEditSchema.safeParse({ displayName: '  Ada Lovelace  ', phoneNumber: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe('Ada Lovelace');
      expect(result.data.phoneNumber).toBe('');
    }
  });

  it('rejects an empty display name', () => {
    const result = ProfileEditSchema.safeParse({ displayName: '   ', phoneNumber: '' });
    expect(result.success).toBe(false);
  });

  it.each(['555-0100', '+525512345678', '5551234', '(555)123-4567'])(
    'accepts a valid phone number %s',
    (phoneNumber) => {
      const result = ProfileEditSchema.safeParse({ displayName: 'Ada', phoneNumber });
      expect(result.success).toBe(true);
    },
  );

  it.each(['abc', '12', '555-abcd', '() 555 --'])('rejects an invalid phone number %s', (phoneNumber) => {
    const result = ProfileEditSchema.safeParse({ displayName: 'Ada', phoneNumber });
    expect(result.success).toBe(false);
  });
});
