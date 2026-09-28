import { describe, expect, it } from 'vitest';
import { buildSplits, validateSplit } from './expenseSplitter';

/**
 * Plan B10, spec D10: the expense form's split logic. `validateSplit` is
 * the pure validator the form gates submit on — it must never let an
 * inconsistent split (shares that don't sum to the amount / 100%) reach
 * `buildSplits` (a thin wrapper over `expenseCalculator#materializeSplits`,
 * the ONLY writer of `splits[].amount`, per that module's own doc comment —
 * this file must never re-implement its rounding).
 */
describe('validateSplit', () => {
  it('equal: valid whenever at least one participant is selected', () => {
    expect(validateSplit('equal', 100, ['u1', 'u2'], {})).toMatchObject({ valid: true, remaining: 0 });
  });

  it('equal: invalid with zero participants', () => {
    const result = validateSplit('equal', 100, [], {});
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/participant/i);
  });

  it('exact: valid when shares sum exactly to the amount', () => {
    const result = validateSplit('exact', 100, ['u1', 'u2'], { u1: 60, u2: 40 });
    expect(result).toMatchObject({ valid: true, remaining: 0 });
  });

  it('exact: reports a positive remaining when shares fall short, with a clear message', () => {
    const result = validateSplit('exact', 100, ['u1', 'u2'], { u1: 60, u2: 30 });
    expect(result.valid).toBe(false);
    expect(result.remaining).toBeCloseTo(10);
    expect(result.message).toMatch(/10\.00/);
  });

  it('exact: reports a negative-style "over" message when shares exceed the amount', () => {
    const result = validateSplit('exact', 100, ['u1', 'u2'], { u1: 60, u2: 60 });
    expect(result.valid).toBe(false);
    expect(result.remaining).toBeCloseTo(-20);
    expect(result.message).toMatch(/over/i);
  });

  it('exact: floating-point noise within half a cent still validates', () => {
    const result = validateSplit('exact', 10, ['u1', 'u2', 'u3'], { u1: 3.33, u2: 3.33, u3: 3.34 });
    expect(result.valid).toBe(true);
  });

  it('percentage: valid when shares sum to exactly 100', () => {
    const result = validateSplit('percentage', 100, ['u1', 'u2'], { u1: 70, u2: 30 });
    expect(result).toMatchObject({ valid: true, remaining: 0 });
  });

  it('percentage: invalid and reports the remaining percentage', () => {
    const result = validateSplit('percentage', 100, ['u1', 'u2'], { u1: 70, u2: 20 });
    expect(result.valid).toBe(false);
    expect(result.remaining).toBeCloseTo(10);
    expect(result.message).toMatch(/10\.0%/);
  });

  it('exact/percentage: a participant missing from shares counts as zero, not a crash', () => {
    const result = validateSplit('exact', 100, ['u1', 'u2'], { u1: 100 });
    expect(result.valid).toBe(true);
  });
});

describe('buildSplits', () => {
  it('equal: delegates to materializeSplits (rounding remainder on the payer)', () => {
    const splits = buildSplits('equal', 10, ['u1', 'u2', 'u3'], 'u1', {});
    expect(splits.find((s) => s.userId === 'u1')?.amount).toBeCloseTo(3.34);
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(10);
  });

  it('exact: uses the given per-participant shares as the amounts, restricted to participantIds', () => {
    const splits = buildSplits('exact', 100, ['u1', 'u2'], 'u1', { u1: 60, u2: 40, ghost: 999 });
    expect(splits).toEqual(
      expect.arrayContaining([
        { userId: 'u1', amount: 60 },
        { userId: 'u2', amount: 40 },
      ]),
    );
    expect(splits.find((s) => s.userId === 'ghost')).toBeUndefined();
  });

  it('percentage: materializes amounts from percentages, remainder on the payer', () => {
    const splits = buildSplits('percentage', 10, ['u1', 'u2', 'u3'], 'u1', { u1: 34, u2: 33, u3: 33 });
    expect(splits.reduce((sum, s) => sum + s.amount, 0)).toBeCloseTo(10);
    expect(splits.find((s) => s.userId === 'u1')?.percentage).toBe(34);
  });
});
