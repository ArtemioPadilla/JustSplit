import { describe, expect, it } from 'vitest';
import { CreateEventInputSchema, EventSchema } from './event';

const validEvent = {
  id: 'event1',
  name: 'Cancun trip',
  memberIds: ['user1', 'user2'],
  kind: 'event',
  createdBy: 'user1',
  createdAt: '2026-09-28T00:00:00.000Z',
};

describe('EventSchema (plan B3)', () => {
  it('parses a minimal, valid row', () => {
    expect(() => EventSchema.parse(validEvent)).not.toThrow();
  });

  it('accepts kind: "trip" and the overflow settings field', () => {
    const parsed = EventSchema.parse({ ...validEvent, kind: 'trip', settings: { budget: { amount: 500, currency: 'USD' } } });
    expect(parsed.kind).toBe('trip');
    expect(parsed.settings).toMatchObject({ budget: { amount: 500, currency: 'USD' } });
  });

  it('is .passthrough(): an unrecognized kind still parses (spec D9)', () => {
    const parsed = EventSchema.parse({ ...validEvent, kind: 'reunion' });
    expect(parsed.kind).toBe('reunion');
  });
});

describe('CreateEventInputSchema (plan B3)', () => {
  it('omits settings (spec D9 field, until Track D issue D1)', () => {
    expect(Object.keys(CreateEventInputSchema.shape)).not.toContain('settings');
  });

  it('keeps kind writable (B11b writes kind at create time)', () => {
    expect(Object.keys(CreateEventInputSchema.shape)).toContain('kind');
  });

  it('parses a create payload without id/createdAt/updatedAt', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = validEvent;
    void _id;
    void _createdAt;
    expect(() => CreateEventInputSchema.parse(rest)).not.toThrow();
  });
});
