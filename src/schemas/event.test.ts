import { describe, expect, it } from 'vitest';
import { CreateEventInputSchema, EventPatchSchema, EventSchema } from './event';

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

/**
 * Plan B11b: the relational adapter's `fromRow` copies every mapped column, so
 * an event created without a description, end date, location or currency reads
 * back with those keys as `null` (PostgREST never omits a null column). The
 * schema used to reject that (`z.string().optional()` is not `nullable`), which
 * would have made `repos.events.get` throw for the most ordinary event there is.
 */
describe('EventSchema — a row as the relational adapter returns it (plan B11b)', () => {
  const nullColumns = {
    ...validEvent,
    description: null,
    date: null,
    startDate: null,
    endDate: null,
    location: null,
    preferredCurrency: null,
    groupId: null,
  };

  it('parses a row whose empty columns are null', () => {
    expect(EventSchema.safeParse(nullColumns).success).toBe(true);
  });

  it('normalises null to undefined so every caller sees one "absent" shape', () => {
    const parsed = EventSchema.parse(nullColumns);
    expect(parsed.description).toBeUndefined();
    expect(parsed.endDate).toBeUndefined();
    expect(parsed.startDate).toBeUndefined();
    expect(parsed.preferredCurrency).toBeUndefined();
  });

  it('still keeps a real value', () => {
    const parsed = EventSchema.parse({ ...nullColumns, endDate: '2026-10-05', description: 'Beach' });
    expect(parsed.endDate).toBe('2026-10-05');
    expect(parsed.description).toBe('Beach');
  });

  it('accepts a null-columned row through the create-input schema too (repos.events.create re-reads it)', () => {
    const { id: _id, createdAt: _createdAt, ...rest } = nullColumns;
    void _id;
    void _createdAt;
    expect(CreateEventInputSchema.safeParse(rest).success).toBe(true);
  });
});

describe('EventPatchSchema — a partial update the edit form can send (plan B11b)', () => {
  it('lets an edit clear an optional column with null (undefined would just be dropped from the request)', () => {
    const parsed = EventPatchSchema.parse({ endDate: null, description: null });
    expect(parsed).toEqual({ endDate: null, description: null });
  });

  it('accepts the editable fields together', () => {
    expect(
      EventPatchSchema.safeParse({
        name: 'Trip',
        description: 'Beach',
        date: '2026-10-01',
        startDate: '2026-10-01',
        endDate: '2026-10-05',
        preferredCurrency: 'MXN',
        memberIds: ['user1', 'user2'],
      }).success,
    ).toBe(true);
  });

  it('refuses an empty member list (an event always has its creator)', () => {
    expect(EventPatchSchema.safeParse({ memberIds: [] }).success).toBe(false);
  });

  it('refuses a blank name', () => {
    expect(EventPatchSchema.safeParse({ name: '' }).success).toBe(false);
  });

  it('refuses keys an edit must never send: createdBy is immutable, groupId/kind are not edited here', () => {
    expect(EventPatchSchema.safeParse({ createdBy: 'someone-else' }).success).toBe(false);
    expect(EventPatchSchema.safeParse({ groupId: 'g1' }).success).toBe(false);
    expect(EventPatchSchema.safeParse({ kind: 'trip' }).success).toBe(false);
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
