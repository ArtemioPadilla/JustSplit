// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { atom } from 'nanostores';

/**
 * Ported/adapted from the legacy Next tree's
 * `src/components/CurrencyExchangeTicker/index.tsx` (plan B16) onto Tailwind
 * v4 + shadcn tokens + `fetchExchangeRate` (this issue's shared cache
 * helper) instead of the module-level `exchangeRateCache` singleton. Four
 * behavior contracts named in the issue: renders pairs for the preferred
 * base, marks fallback pairs, OMITS the `rate: 1` fallback-less placeholder
 * (never implies false parity), and clears its refresh interval on unmount.
 */
const $preferredCurrency = atom('USD');

vi.mock('@/stores/preferences', () => ({ $preferredCurrency }));

const fetchExchangeRate = vi.fn();
vi.mock('@/lib/currency/rates', () => ({ fetchExchangeRate: (...args: [string, string]) => fetchExchangeRate(...args) }));

// Imported AFTER the mocks are registered so the component picks them up.
const { default: CurrencyExchangeTicker } = await import('./CurrencyExchangeTicker');

function rateFor(map: Record<string, { rate: number; isFallback: boolean }>) {
  return async (_from: string, to: string) => map[to] ?? { rate: 1, isFallback: true };
}

beforeEach(() => {
  $preferredCurrency.set('USD');
  fetchExchangeRate.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CurrencyExchangeTicker', () => {
  it('renders a pair for every other supported currency, based on the preferred currency', async () => {
    fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: false }, MXN: { rate: 17, isFallback: false } }));

    render(<CurrencyExchangeTicker />);

    expect(await screen.findByText('USD/EUR')).toBeInTheDocument();
    expect(screen.getByText('USD/MXN')).toBeInTheDocument();
    // The base is never listed against itself.
    expect(screen.queryByText('USD/USD')).not.toBeInTheDocument();
  });

  it('marks a fallback rate and shows the approximate-rates note', async () => {
    fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: true } }));

    render(<CurrencyExchangeTicker />);

    await screen.findByText('USD/EUR');
    expect(screen.getByText(/some rates are approximate/i)).toBeInTheDocument();
    // A text alternative for the visible marker, not just a bare "*".
    expect(screen.getAllByText(/approximate/i).length).toBeGreaterThan(0);
  });

  // Plan A7 (live smoke, dark theme with the rates API down): amber-100 text on an amber-400/20 tint sat on `bg-primary`, which
  // is a LIGHT blue in dark mode — contrast 1.83:1 (axe color-contrast, serious). The note uses the ticker's own foreground
  // token, which is what every other line on this `bg-primary` surface uses in both themes. jsdom has no computed colours, so
  // this pins the tokens; the live smoke measures the contrast (it audits this state in light, dark and 375px).
  it('draws the approximate-rates note in the ticker\'s own foreground token, not a fixed amber', async () => {
    fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: true } }));

    render(<CurrencyExchangeTicker />);

    await screen.findByText('USD/EUR');
    const note = screen.getByText(/some rates are approximate/i);
    expect(note.className).toMatch(/(^|\s)text-primary-foreground(\s|$)/);
    expect(note.className).not.toMatch(/amber/);
  });

  it('omits a pair whose rate is the fallback-less 1:1 placeholder (never implies false parity)', async () => {
    fetchExchangeRate.mockImplementation(
      rateFor({
        EUR: { rate: 0.9, isFallback: false },
        // No FALLBACK_RATES entry for this pair — getExchangeRate's real
        // contract returns { rate: 1, isFallback: true } here.
        RUB: { rate: 1, isFallback: true },
      }),
    );

    render(<CurrencyExchangeTicker />);

    await screen.findByText('USD/EUR');
    expect(screen.queryByText('USD/RUB')).not.toBeInTheDocument();
  });

  it('refreshes on a 30-minute interval and clears it on unmount', async () => {
    vi.useFakeTimers();
    fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: false } }));

    const { unmount } = render(<CurrencyExchangeTicker />);
    await vi.waitFor(() => expect(fetchExchangeRate).toHaveBeenCalled());
    const callsAfterMount = fetchExchangeRate.mock.calls.length;

    await vi.advanceTimersByTimeAsync(30 * 60 * 1000);
    expect(fetchExchangeRate.mock.calls.length).toBeGreaterThan(callsAfterMount);
    const callsAfterOneRefresh = fetchExchangeRate.mock.calls.length;

    unmount();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(fetchExchangeRate.mock.calls.length).toBe(callsAfterOneRefresh);
  });

  it(
    'a visible pause/play toggle button pauses and resumes the auto-scroll (WCAG 2.2.2)',
    async () => {
      const user = userEvent.setup();
      fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: false } }));

      render(<CurrencyExchangeTicker />);
      await screen.findByText('USD/EUR');

      const toggle = screen.getByRole('button', { name: /pause exchange-rate scrolling/i });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      // Nothing keyboard/touch users can reach pauses the scroll before the
      // toggle exists — the `<ul>`'s CSS-only animation carries a
      // `data-paused` attribute the toggle controls (global.css keys
      // `animation-play-state: paused` off it).
      const track = document.querySelector('.ticker-track');
      expect(track).not.toHaveAttribute('data-paused');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'true');
      expect(track).toHaveAttribute('data-paused', 'true');

      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-pressed', 'false');
      expect(track).not.toHaveAttribute('data-paused');
    },
    15000,
  );

  it('the scrollable viewport is keyboard-focusable and labelled (axe scrollable-region-focusable)', async () => {
    fetchExchangeRate.mockImplementation(rateFor({ EUR: { rate: 0.9, isFallback: false } }));

    render(<CurrencyExchangeTicker />);
    await screen.findByText('USD/EUR');

    const viewport = document.querySelector('.ticker-viewport');
    expect(viewport).toHaveAttribute('tabindex', '0');
    expect(viewport).toHaveAttribute('aria-label');
  });
});
