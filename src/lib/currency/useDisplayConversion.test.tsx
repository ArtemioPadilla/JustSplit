// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { $profile } from '@/stores/session';
import { useDisplayConversion } from './useDisplayConversion';

/**
 * Plan B8b: `useDisplayConversion` resolves rates for every distinct
 * expense currency against `$preferredCurrency` through `fetchExchangeRate`
 * (B16's coalesced-per-base helper) and hands the B8a selectors a
 * SYNCHRONOUS `convert`. Behavior contracts:
 *   1. `ready` stays false (no converted numbers) until every distinct
 *      currency's rate has resolved, then flips true and `convert` uses the
 *      resolved rate.
 *   2. `approximate` is true if any resolved rate was a fallback (honesty
 *      marker parity with the ticker).
 *   3. `refresh()` re-invokes `fetchExchangeRate` for a fresh rate (the
 *      dashboard header's "Refresh rates" button, paired with
 *      `clearRateCache`).
 */
const { fetchExchangeRate } = vi.hoisted(() => ({ fetchExchangeRate: vi.fn() }));
vi.mock('./rates', () => ({ fetchExchangeRate }));

function Harness({ currencies }: { currencies: string[] }) {
  const { convert, ready, approximate, refresh } = useDisplayConversion(currencies);
  return (
    <div>
      <span data-testid="ready">{String(ready)}</span>
      <span data-testid="approximate">{String(approximate)}</span>
      <span data-testid="converted">{ready ? convert(10, 'EUR') : 'n/a'}</span>
      <span data-testid="converted-usd">{convert(10, 'USD')}</span>
      <button onClick={refresh}>refresh</button>
    </div>
  );
}

beforeEach(() => {
  $profile.set(null); // $preferredCurrency falls back to DEFAULT_CURRENCY ('USD')
  fetchExchangeRate.mockReset();
});

afterEach(() => {
  $profile.set(null);
});

describe('useDisplayConversion', () => {
  it('is not ready and shows no converted amount before rates resolve', async () => {
    let resolve!: (v: { rate: number; isFallback: boolean }) => void;
    fetchExchangeRate.mockReturnValue(new Promise((r) => (resolve = r)));

    render(<Harness currencies={['USD', 'EUR']} />);

    expect(screen.getByTestId('ready')).toHaveTextContent('false');
    expect(screen.getByTestId('converted')).toHaveTextContent('n/a');

    resolve({ rate: 0.9, isFallback: false });
    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
  });

  it('resolves each distinct non-target currency once and exposes a synchronous convert', async () => {
    fetchExchangeRate.mockResolvedValue({ rate: 0.5, isFallback: false });

    render(<Harness currencies={['USD', 'EUR', 'EUR']} />);

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(fetchExchangeRate).toHaveBeenCalledTimes(1);
    expect(fetchExchangeRate).toHaveBeenCalledWith('EUR', 'USD');
    expect(screen.getByTestId('converted')).toHaveTextContent('5');
  });

  it('convert returns the amount unchanged for the target currency, no fetch needed', async () => {
    fetchExchangeRate.mockResolvedValue({ rate: 0.5, isFallback: false });
    render(<Harness currencies={['USD']} />);

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('converted-usd')).toHaveTextContent('10');
    expect(fetchExchangeRate).not.toHaveBeenCalled();
  });

  it('approximate is true when any resolved rate was a fallback', async () => {
    fetchExchangeRate.mockResolvedValue({ rate: 0.5, isFallback: true });
    render(<Harness currencies={['USD', 'EUR']} />);

    await waitFor(() => expect(screen.getByTestId('ready')).toHaveTextContent('true'));
    expect(screen.getByTestId('approximate')).toHaveTextContent('true');
  });

  it('refresh() re-invokes fetchExchangeRate for a fresh rate', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    fetchExchangeRate.mockResolvedValue({ rate: 0.5, isFallback: false });
    render(<Harness currencies={['USD', 'EUR']} />);

    await waitFor(() => expect(fetchExchangeRate).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'refresh' }));
    await waitFor(() => expect(fetchExchangeRate).toHaveBeenCalledTimes(2));
  });

  it('does not throw on an unmount before the fetch resolves (cancelled flag)', async () => {
    let resolve!: (v: { rate: number; isFallback: boolean }) => void;
    fetchExchangeRate.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<Harness currencies={['USD', 'EUR']} />);
    unmount();
    resolve({ rate: 0.5, isFallback: false });
    await Promise.resolve();
    await Promise.resolve();
  });
});
