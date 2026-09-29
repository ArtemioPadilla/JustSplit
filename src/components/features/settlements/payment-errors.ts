import { SettlementPartyNotAllowedError } from '@/lib/data/repos/settlements';

/**
 * What the "Record payment" dialog says when saving fails. The raw error text
 * (a database or adapter message) is never shown: a denial and a failure need
 * different sentences because only the second is worth retrying.
 */
export const PAYMENT_DENIED_MESSAGE =
  "You can't record this payment. Only the two people involved can, and they must be friends or share the event.";

export const PAYMENT_FAILED_MESSAGE = "We couldn't record this payment. Check your connection and try again.";

/** What Postgres/PostgREST say for a row-level-security or privilege denial (SQLSTATE 42501). */
const DENIAL_PATTERN = /row-level security|permission denied|\b42501\b/i;

/**
 * True for the repo's own "you are neither party" refusal and for an RLS
 * denial surfaced by the adapter. A client-side hint only: RLS is the
 * authority, this just picks the sentence.
 */
export function isPaymentDenied(error: unknown): boolean {
  if (error instanceof SettlementPartyNotAllowedError) return true;
  return error instanceof Error && DENIAL_PATTERN.test(error.message);
}

export function paymentFailureMessage(error: unknown): string {
  return isPaymentDenied(error) ? PAYMENT_DENIED_MESSAGE : PAYMENT_FAILED_MESSAGE;
}
