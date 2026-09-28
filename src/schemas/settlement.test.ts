import { describe, expect, it } from 'vitest';
import { CreateSettlementInputSchema, SettlementSchema } from './settlement';

const validSettlement = {
  id: 'settle1',
  groupId: null,
  fromUserId: 'user1',
  toUserId: 'user2',
  amount: 50,
  currency: 'USD',
  date: '2026-09-28',
  memberIds: ['user1', 'user2'],
  createdBy: 'user1',
  createdAt: '2026-09-28T00:00:00.000Z',
};

describe('SettlementSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => SettlementSchema.parse(validSettlement)).not.toThrow();
  });

  it('accepts the JustSplit-only overflow fields expenseIds/eventId', () => {
    const parsed = SettlementSchema.parse({
      ...validSettlement,
      expenseIds: ['exp1', 'exp2'],
      eventId: 'event1',
    });
    expect(parsed.expenseIds).toEqual(['exp1', 'exp2']);
    expect(parsed.eventId).toBe('event1');
  });

  it('is .passthrough(): an unknown top-level key survives the parse', () => {
    const parsed = SettlementSchema.parse({ ...validSettlement, futureField: 'x' });
    expect(parsed).toMatchObject({ futureField: 'x' });
  });
});

describe('CreateSettlementInputSchema (plan B3)', () => {
  it('keeps expenseIds/eventId writable (B14 writes both at create time)', () => {
    expect(Object.keys(CreateSettlementInputSchema.shape)).toEqual(
      expect.arrayContaining(['expenseIds', 'eventId']),
    );
  });

  it('parses a create payload without id/createdAt/updatedAt', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = validSettlement;
    void _id;
    void _createdAt;
    expect(() => CreateSettlementInputSchema.parse(rest)).not.toThrow();
  });
});
