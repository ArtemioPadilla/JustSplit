import { describe, expect, it } from 'vitest';
import { CreateExpenseGroupInputSchema, ExpenseGroupSchema } from './group';

const validGroup = {
  id: 'group1',
  name: 'Roomies',
  type: 'friends',
  currency: 'USD',
  members: [{ userId: 'user1', displayName: 'Alice', role: 'owner', joinedAt: '2026-09-28T00:00:00.000Z' }],
  totalExpenses: 0,
  memberIds: ['user1'],
  adminIds: ['user1'],
  createdBy: 'user1',
  createdAt: '2026-09-28T00:00:00.000Z',
};

describe('ExpenseGroupSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => ExpenseGroupSchema.parse(validGroup)).not.toThrow();
  });

  // See expense.test.ts: `description` is a nullable column, so a group created without one reads back null
  // (found driving /groups/new against a real stack: the row was inserted, then get() threw and the form
  // reported "Could not create this group" — a retry would have created a duplicate).
  it('parses a row whose description column is null, reading it as absent', () => {
    const parsed = ExpenseGroupSchema.parse({ ...validGroup, description: null });
    expect(parsed.description).toBeUndefined();
  });

  it('accepts the JustSplit-only overflow fields kind/concepts and the widened settings', () => {
    const parsed = ExpenseGroupSchema.parse({
      ...validGroup,
      kind: 'couple',
      settings: { defaultSplitType: 'equal', simplifyDebts: true, maxMembers: 50, defaultCurrency: 'EUR' },
      concepts: [{ id: 'c1', name: 'Renta', category: 'rent' }],
    });
    expect(parsed.kind).toBe('couple');
    expect(parsed.settings).toMatchObject({ defaultCurrency: 'EUR' });
    expect(parsed.concepts).toHaveLength(1);
  });

  it('is .passthrough(): an unrecognized kind still parses (spec D9: never throws on an unknown string)', () => {
    const parsed = ExpenseGroupSchema.parse({ ...validGroup, kind: 'polycule' });
    expect(parsed.kind).toBe('polycule');
  });
});

describe('CreateExpenseGroupInputSchema (plan B3)', () => {
  it('omits kind, settings and concepts (spec D9 fields, until Track D issue D1)', () => {
    const keys = Object.keys(CreateExpenseGroupInputSchema.shape);
    expect(keys).not.toContain('kind');
    expect(keys).not.toContain('settings');
    expect(keys).not.toContain('concepts');
  });

  it('parses a create payload without id/createdAt/updatedAt', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = validGroup;
    void _id;
    void _createdAt;
    expect(() => CreateExpenseGroupInputSchema.parse(rest)).not.toThrow();
  });
});
