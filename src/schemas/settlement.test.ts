import { describe, expect, it } from 'vitest';
import { CreateSettlementInputSchema, SettleInputSchema, SettlementSchema } from './settlement';

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

  it('accepts a null eventId: event_id is a nullable column since B2d (ADR 0013)', () => {
    expect(SettlementSchema.parse({ ...validSettlement, eventId: null }).eventId).toBeNull();
  });

  it('parses a row whose nullable columns (method, notes, transactionId) are null, reading them as absent', () => {
    const parsed = SettlementSchema.parse({ ...validSettlement, method: null, notes: null, transactionId: null });
    expect(parsed.method).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
    expect(parsed.transactionId).toBeUndefined();
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

describe('SettleInputSchema (plan B14a — what a caller hands repos.settlements.settle)', () => {
  const valid = { fromUserId: 'user1', toUserId: 'user2', amount: 50, currency: 'USD', date: '2026-09-28' };

  it('parses the minimal input; identity, memberIds and groupId are the repo\'s to fill, never the caller\'s', () => {
    const parsed = SettleInputSchema.parse(valid);
    expect(parsed).toEqual(valid);
    expect(Object.keys(SettleInputSchema.shape)).not.toEqual(expect.arrayContaining(['createdBy']));
    expect(Object.keys(SettleInputSchema.shape)).not.toEqual(expect.arrayContaining(['memberIds']));
    expect(Object.keys(SettleInputSchema.shape)).not.toEqual(expect.arrayContaining(['groupId']));
  });

  it('accepts the optional eventId, method and notes', () => {
    expect(SettleInputSchema.parse({ ...valid, eventId: 'ev1', method: 'cash', notes: 'thanks' })).toMatchObject({ eventId: 'ev1', method: 'cash' });
  });

  it('rejects paying yourself', () => {
    expect(() => SettleInputSchema.parse({ ...valid, toUserId: 'user1' })).toThrow();
  });

  it('rejects a zero, negative or non-finite amount', () => {
    for (const amount of [0, -5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => SettleInputSchema.parse({ ...valid, amount })).toThrow();
    }
  });

  it('rejects an amount with more than cents of precision (round it first)', () => {
    expect(() => SettleInputSchema.parse({ ...valid, amount: 10.005 })).toThrow();
    expect(() => SettleInputSchema.parse({ ...valid, amount: 33.33 })).not.toThrow();
  });

  it('rejects a currency that is not a three-letter uppercase code, and a date that is not a calendar date', () => {
    expect(() => SettleInputSchema.parse({ ...valid, currency: 'usd' })).toThrow();
    expect(() => SettleInputSchema.parse({ ...valid, currency: 'US' })).toThrow();
    expect(() => SettleInputSchema.parse({ ...valid, date: '28/09/2026' })).toThrow();
  });

  it('rejects an empty party id', () => {
    expect(() => SettleInputSchema.parse({ ...valid, fromUserId: '' })).toThrow();
  });
});
