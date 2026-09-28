import { describe, expect, it } from 'vitest';
import { AddFriendFormValuesSchema } from './friend-request-form';

/**
 * Plan B13: the add-by-email form normalises (trim + lowercase) BEFORE
 * validating, so `find_profile_by_email`'s own `lower(u.email) =
 * lower(p_email)` comparison and this form's self-email check both compare
 * against the exact same normalized string.
 */
describe('AddFriendFormValuesSchema', () => {
  it('trims and lowercases the email', () => {
    const result = AddFriendFormValuesSchema.safeParse({ email: '  Ada@Example.COM  ' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('ada@example.com');
  });

  it('rejects an empty or malformed email', () => {
    expect(AddFriendFormValuesSchema.safeParse({ email: '' }).success).toBe(false);
    expect(AddFriendFormValuesSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
  });
});
