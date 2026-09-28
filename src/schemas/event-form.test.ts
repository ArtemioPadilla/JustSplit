import { describe, expect, it } from 'vitest';
import { EventFormValuesSchema } from './event-form';

const valid = {
  name: 'Cancún',
  description: '',
  startDate: '2026-06-01',
  endDate: '',
  preferredCurrency: 'MXN',
  memberIds: ['u1'],
};

function messages(values: unknown): Record<string, string> {
  const result = EventFormValuesSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0]), issue.message]));
}

describe('EventFormValuesSchema (plan B11b, Spec-DD)', () => {
  it('accepts a minimal event: name, start date, currency, the creator', () => {
    expect(EventFormValuesSchema.safeParse(valid).success).toBe(true);
  });

  it('requires a name that is not just spaces', () => {
    expect(messages({ ...valid, name: '' })).toHaveProperty('name', 'Event name is required.');
    expect(messages({ ...valid, name: '   ' })).toHaveProperty('name', 'Event name is required.');
  });

  it('requires a real start date, reported on the start field', () => {
    expect(messages({ ...valid, startDate: '' })).toHaveProperty('startDate', 'Choose a start date.');
    expect(messages({ ...valid, startDate: '2026-02-31' })).toHaveProperty('startDate', 'Choose a start date.');
  });

  it('reports an end before the start on the end field, and a garbage end likewise', () => {
    expect(messages({ ...valid, endDate: '2026-05-01' })).toHaveProperty('endDate', 'The end date can’t be before the start date.');
    expect(messages({ ...valid, endDate: 'soon' })).toHaveProperty('endDate', 'Enter the end date as a real date, or leave it empty.');
  });

  it('accepts an empty end date and an end on the start day', () => {
    expect(EventFormValuesSchema.safeParse({ ...valid, endDate: '' }).success).toBe(true);
    expect(EventFormValuesSchema.safeParse({ ...valid, endDate: '2026-06-01' }).success).toBe(true);
  });

  it('requires a currency and at least one participant', () => {
    expect(messages({ ...valid, preferredCurrency: '' })).toHaveProperty('preferredCurrency', 'Choose a currency.');
    expect(messages({ ...valid, memberIds: [] })).toHaveProperty('memberIds', 'An event needs at least one participant.');
  });
});
