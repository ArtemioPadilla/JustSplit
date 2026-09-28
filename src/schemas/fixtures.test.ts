import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ExpenseGroupSchema } from './group';
import { EventSchema } from './event';
import { ExpenseSchema } from './expense';

/**
 * Plan B3 synthetic fixtures round-trip test: every fixture under
 * `src/tests/fixtures/*.synthetic.json` parses through its read schema
 * without throwing, and every top-level key it declares — known or unknown
 * to the schema — survives the parse (spec D9: an older build must never
 * reject a row a newer build wrote). `supabase/seed.sql` (plan B2) is a
 * hand-written fixture, not generated from these — plan B5a follow-up once
 * the adapter's rehydration exists to round-trip against `supabase start`.
 */
const FIXTURES_DIR = resolve(__dirname, '../tests/fixtures');

function loadFixture(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, name), 'utf-8'));
}

describe('synthetic fixtures round-trip (plan B3)', () => {
  it('group.couple.synthetic.json parses and keeps kind/settings/concepts', () => {
    const fixture = loadFixture('group.couple.synthetic.json');
    const parsed = ExpenseGroupSchema.parse(fixture);
    expect(parsed).toEqual(fixture);
    expect(parsed.kind).toBe('couple');
    expect(parsed.concepts).toHaveLength(1);
  });

  it('group.unknown-kind.synthetic.json parses despite an unrecognized kind', () => {
    const fixture = loadFixture('group.unknown-kind.synthetic.json');
    const parsed = ExpenseGroupSchema.parse(fixture);
    expect(parsed).toEqual(fixture);
    expect(parsed.kind).toBe('polycule');
  });

  it('event.trip.synthetic.json parses and keeps kind/settings.budget', () => {
    const fixture = loadFixture('event.trip.synthetic.json');
    const parsed = EventSchema.parse(fixture);
    expect(parsed).toEqual(fixture);
    expect(parsed.kind).toBe('trip');
  });

  it('expense.with-conceptId.synthetic.json parses despite a non-taxonomy category', () => {
    const fixture = loadFixture('expense.with-conceptId.synthetic.json');
    const parsed = ExpenseSchema.parse(fixture);
    expect(parsed).toEqual(fixture);
    expect(parsed.conceptId).toBe('fixture-concept-rent');
    expect(parsed.category).toBe('not-a-taxonomy-key');
  });
});
