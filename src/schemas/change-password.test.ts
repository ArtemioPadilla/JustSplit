import { describe, expect, it } from 'vitest';
import { ChangePasswordSchema } from './change-password';

/**
 * `ChangePasswordSchema` (plan B15): the profile island's "change password"
 * form. Strength rule is REUSED from `RegisterSchema.shape.password` (the
 * sign-up form's own rule) rather than duplicated — plus a `confirmPassword`
 * field the sign-up form doesn't have.
 */
describe('ChangePasswordSchema', () => {
  it('accepts a matching pair of strong-enough passwords', () => {
    const result = ChangePasswordSchema.safeParse({ newPassword: 'brandnewpw1', confirmPassword: 'brandnewpw1' });
    expect(result.success).toBe(true);
  });

  it('rejects a password shorter than 8 characters (same rule as sign-up)', () => {
    const result = ChangePasswordSchema.safeParse({ newPassword: 'short1', confirmPassword: 'short1' });
    expect(result.success).toBe(false);
  });

  it('rejects a confirmPassword that does not match newPassword', () => {
    const result = ChangePasswordSchema.safeParse({ newPassword: 'brandnewpw1', confirmPassword: 'somethingelse1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(['confirmPassword']);
    }
  });
});
