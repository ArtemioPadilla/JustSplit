import { describe, expect, it } from 'vitest';
import { CreateExpenseInputSchema, ExpenseSchema } from './expense';

const validExpense = {
  id: 'exp1',
  groupId: 'group1',
  description: 'Lunch',
  amount: 100,
  currency: 'USD',
  paidBy: 'user1',
  splitType: 'equal',
  splits: [
    { userId: 'user1', amount: 50 },
    { userId: 'user2', amount: 50 },
  ],
  date: '2026-09-28',
  memberIds: ['user1', 'user2'],
  createdBy: 'user1',
  createdAt: '2026-09-28T00:00:00.000Z',
};

describe('ExpenseSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => ExpenseSchema.parse(validExpense)).not.toThrow();
  });

  it('accepts a null groupId (event or friend-to-friend expense, spec D10)', () => {
    const parsed = ExpenseSchema.parse({ ...validExpense, groupId: null });
    expect(parsed.groupId).toBeNull();
  });

  it('rejects an empty memberIds array (spec D10: RLS membership mirror needs at least one member)', () => {
    expect(() => ExpenseSchema.parse({ ...validExpense, memberIds: [] })).toThrow();
  });

  it('is .passthrough(): an unknown top-level key survives the parse (spec D9)', () => {
    const parsed = ExpenseSchema.parse({ ...validExpense, futureField: 'from a newer build' });
    expect(parsed).toMatchObject({ futureField: 'from a newer build' });
  });

  it('accepts the JustSplit-only overflow fields eventId/conceptId/settledAt', () => {
    const parsed = ExpenseSchema.parse({
      ...validExpense,
      eventId: 'event1',
      conceptId: 'concept1',
      settledAt: '2026-09-29T00:00:00.000Z',
    });
    expect(parsed.eventId).toBe('event1');
    expect(parsed.conceptId).toBe('concept1');
    expect(parsed.settledAt).toBe('2026-09-29T00:00:00.000Z');
  });

  it('accepts a null settledAt (unsettled expense)', () => {
    const parsed = ExpenseSchema.parse({ ...validExpense, settledAt: null });
    expect(parsed.settledAt).toBeNull();
  });
});

describe('CreateExpenseInputSchema (plan B3)', () => {
  it('omits conceptId, category and settledAt (spec D9 fields, until Track D issue D1)', () => {
    expect(Object.keys(CreateExpenseInputSchema.shape)).not.toContain('conceptId');
    expect(Object.keys(CreateExpenseInputSchema.shape)).not.toContain('category');
    expect(Object.keys(CreateExpenseInputSchema.shape)).not.toContain('settledAt');
  });

  it('keeps eventId writable (B10 writes it from ?event= at create time)', () => {
    expect(Object.keys(CreateExpenseInputSchema.shape)).toContain('eventId');
  });

  it('parses a create payload without id/createdAt/updatedAt', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = validExpense;
    void _id;
    void _createdAt;
    expect(() => CreateExpenseInputSchema.parse(rest)).not.toThrow();
  });
});
