import { describe, expect, it } from 'vitest';
import { SettlementPartyNotAllowedError } from '@/lib/data/repos/settlements';
import { PAYMENT_DENIED_MESSAGE, PAYMENT_FAILED_MESSAGE, isPaymentDenied, paymentFailureMessage } from './payment-errors';

/**
 * A denied `settlements` insert (RLS) reaches the island as an `Error` whose
 * message carries the database's wording. The island never shows it: it shows
 * a plain sentence, and tells a denial (nothing to retry) from a failure
 * (retry may work).
 */
describe('isPaymentDenied', () => {
  it('recognises the repo\'s own "you are not a party" refusal', () => {
    expect(isPaymentDenied(new SettlementPartyNotAllowedError())).toBe(true);
  });

  it('recognises a row-level-security or permission denial from the adapter', () => {
    expect(
      isPaymentDenied(new Error('RelationalSupabaseAdapter: setDocument(settlements/s1) failed: new row violates row-level security policy for table "settlements"')),
    ).toBe(true);
    expect(isPaymentDenied(new Error('permission denied for table settlements'))).toBe(true);
    expect(isPaymentDenied(new Error('failed with code 42501'))).toBe(true);
  });

  it('does not call a network or validation failure a denial', () => {
    expect(isPaymentDenied(new Error('Failed to fetch'))).toBe(false);
    expect(isPaymentDenied(new Error('amount must be a whole number of cents'))).toBe(false);
    expect(isPaymentDenied('nope')).toBe(false);
    expect(isPaymentDenied(undefined)).toBe(false);
  });
});

describe('paymentFailureMessage', () => {
  it('is the plain denial sentence for a denial, and never carries the raw error text', () => {
    const message = paymentFailureMessage(new Error('new row violates row-level security policy for table "settlements"'));
    expect(message).toBe(PAYMENT_DENIED_MESSAGE);
    expect(message).not.toMatch(/row-level|violates|settlements/i);
  });

  it('is a retry sentence for any other failure', () => {
    expect(paymentFailureMessage(new Error('Failed to fetch'))).toBe(PAYMENT_FAILED_MESSAGE);
  });

  it('uses the agreed copy', () => {
    expect(PAYMENT_DENIED_MESSAGE).toBe(
      "You can't record this payment. Only the two people involved can, and they must be friends or share the event.",
    );
    expect(PAYMENT_FAILED_MESSAGE).toBe("We couldn't record this payment. Check your connection and try again.");
  });
});
