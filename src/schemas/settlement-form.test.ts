import { describe, expect, it } from 'vitest';
import { RecordPaymentFormSchema, paymentAmountToNumber } from './settlement-form';

/**
 * The "Record payment" dialog's own react-hook-form + zod schema (plan B14b).
 * `amount` stays a string (validated against a 2-decimal pattern, like the
 * expense form) and is converted once, after validation, with
 * `paymentAmountToNumber`.
 */
const valid = { amount: '30.00', currency: 'USD', date: '2026-09-29' };

describe('RecordPaymentFormSchema', () => {
  it('accepts a whole-cent amount, an ISO currency code and a calendar date', () => {
    expect(RecordPaymentFormSchema.safeParse(valid).success).toBe(true);
    expect(RecordPaymentFormSchema.safeParse({ ...valid, amount: '7' }).success).toBe(true);
    expect(RecordPaymentFormSchema.safeParse({ ...valid, amount: '0.5' }).success).toBe(true);
  });

  it('rejects an empty amount, zero, a negative, more than 2 decimals and text', () => {
    for (const amount of ['', '0', '0.00', '-5', '10.999', 'abc', '1e3']) {
      expect(RecordPaymentFormSchema.safeParse({ ...valid, amount }).success, `amount ${JSON.stringify(amount)}`).toBe(false);
    }
  });

  it('says what is wrong in plain words', () => {
    const empty = RecordPaymentFormSchema.safeParse({ ...valid, amount: '' });
    const many = RecordPaymentFormSchema.safeParse({ ...valid, amount: '1.234' });
    const zero = RecordPaymentFormSchema.safeParse({ ...valid, amount: '0' });
    expect(empty.success || empty.error.issues[0]?.message).toBe('Enter an amount.');
    expect(many.success || many.error.issues[0]?.message).toBe('Enter an amount with up to 2 decimals.');
    expect(zero.success || zero.error.issues[0]?.message).toBe('The amount must be more than 0.');
  });

  it('rejects a currency that is not a three-letter uppercase code', () => {
    for (const currency of ['', 'us', 'usd', 'USDD']) {
      expect(RecordPaymentFormSchema.safeParse({ ...valid, currency }).success, `currency ${JSON.stringify(currency)}`).toBe(false);
    }
  });

  it('rejects a date that is not a real calendar date', () => {
    for (const date of ['', '29/09/2026', '2026-13-01', '2026-02-30']) {
      expect(RecordPaymentFormSchema.safeParse({ ...valid, date }).success, `date ${JSON.stringify(date)}`).toBe(false);
    }
  });

  it('trims the amount before checking it', () => {
    const parsed = RecordPaymentFormSchema.parse({ ...valid, amount: ' 12.5 ' });
    expect(parsed.amount).toBe('12.5');
  });
});

describe('paymentAmountToNumber', () => {
  it('turns a validated amount into a number rounded to whole cents', () => {
    expect(paymentAmountToNumber('30.00')).toBe(30);
    expect(paymentAmountToNumber('12.5')).toBe(12.5);
    expect(paymentAmountToNumber('0.07')).toBe(0.07);
  });
});
