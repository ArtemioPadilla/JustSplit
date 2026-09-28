import { describe, expect, it } from 'vitest';
import { RegisterSchema } from './register';

/**
 * RegisterSchema — mirrors docs/recipes/auth-supabase.md §4's schema, with
 * `displayName` instead of `name` to match `signUp(email, password,
 * displayName)` (plan B4).
 */
describe('RegisterSchema (Spec-DD)', () => {
  it('accepts a valid signup', () => {
    const result = RegisterSchema.safeParse({
      displayName: 'Ana',
      email: 'ana@example.com',
      password: '12345678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty display name', () => {
    const result = RegisterSchema.safeParse({ displayName: '', email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.path).toEqual(['displayName']);
  });

  it('trims the display name', () => {
    const result = RegisterSchema.safeParse({ displayName: '  Ana  ', email: 'a@b.com', password: '12345678' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.displayName).toBe('Ana');
  });

  it('rejects malformed email', () => {
    const result = RegisterSchema.safeParse({ displayName: 'Ana', email: 'nope', password: '12345678' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.path).toEqual(['email']);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({ displayName: 'Ana', email: 'a@b.com', password: '1234567' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]!.path).toEqual(['password']);
  });
});
