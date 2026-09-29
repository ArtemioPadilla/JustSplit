// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * B19b: the currency combobox chunk (~45 kB gz, plan B19) is fetched by
 * `React.lazy` only when a `CurrencySelector` first RENDERS, which on a signed-in
 * page is after auth and the first data have arrived. `useWarmCurrencyCombobox`,
 * called by the islands that will render one, fetches the chunk in the browser's
 * idle time instead (`requestIdleCallback`, `setTimeout` where it is missing), so
 * it is usually there when the selector appears. Warming is a dynamic `import()`:
 * the page's STATIC graph does not change (`src/tests/lazy-boundaries.test.ts`,
 * `scripts/check-budgets.mjs`).
 *
 * The module under test is imported fresh per test (`vi.resetModules`) because
 * "already warmed" is module state. The combobox module is a stub whose factory
 * counts evaluations: an evaluation IS the loader having been called.
 */
const loads = vi.hoisted(() => ({ count: 0 }));

type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;
let idleQueue: Map<number, IdleCallback>;
let nextHandle: number;

function installIdleCallback() {
  idleQueue = new Map();
  nextHandle = 1;
  Object.assign(window, {
    requestIdleCallback: (cb: IdleCallback) => {
      const handle = nextHandle++;
      idleQueue.set(handle, cb);
      return handle;
    },
    cancelIdleCallback: (handle: number) => void idleQueue.delete(handle),
  });
}
const runIdle = async () => {
  await act(async () => {
    for (const [handle, cb] of [...idleQueue]) {
      idleQueue.delete(handle);
      cb({ didTimeout: false, timeRemaining: () => 50 });
    }
  });
};
const flushImports = () => act(async () => void (await new Promise((r) => setTimeout(r, 0))));

// `doMock` after `resetModules`, not a top-level `vi.mock`: vitest caches a mock factory's result across
// `resetModules`, so only the first test would see the factory run.
async function fresh() {
  vi.resetModules();
  vi.doMock('@/components/features/currency/CurrencyCombobox', () => {
    loads.count += 1;
    return { default: () => null };
  });
  return import('./CurrencySelector');
}

function Probe({ hook }: { hook: () => void }) {
  hook();
  return null;
}

beforeEach(() => {
  loads.count = 0;
  installIdleCallback();
});
afterEach(() => {
  delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
  delete (window as { cancelIdleCallback?: unknown }).cancelIdleCallback;
  Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
  vi.useRealTimers();
});

describe('warming the currency combobox on idle (B19b)', () => {
  it('does not load the chunk when the hook mounts, only when the browser is idle', async () => {
    const { useWarmCurrencyCombobox } = await fresh();
    render(<Probe hook={useWarmCurrencyCombobox} />);
    await flushImports();
    expect(loads.count).toBe(0);
    expect(idleQueue.size).toBe(1);

    await runIdle();
    await flushImports();
    expect(loads.count).toBe(1);
  });

  it('asks for an idle slot with a timeout, so a busy page still warms it', async () => {
    const seen: unknown[] = [];
    Object.assign(window, {
      requestIdleCallback: (_cb: IdleCallback, options?: unknown) => {
        seen.push(options);
        return 1;
      },
    });
    const { warmCurrencyCombobox } = await fresh();
    warmCurrencyCombobox();
    expect(seen).toEqual([{ timeout: expect.any(Number) }]);
  });

  it('falls back to setTimeout where requestIdleCallback does not exist', async () => {
    delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
    vi.useFakeTimers();
    const { warmCurrencyCombobox } = await fresh();
    warmCurrencyCombobox();
    expect(loads.count).toBe(0);

    await vi.advanceTimersByTimeAsync(5000);
    vi.useRealTimers();
    await flushImports();
    expect(loads.count).toBe(1);
  });

  it('cancels when the component unmounts before the browser is idle', async () => {
    const { useWarmCurrencyCombobox } = await fresh();
    const { unmount } = render(<Probe hook={useWarmCurrencyCombobox} />);
    expect(idleQueue.size).toBe(1);
    unmount();
    expect(idleQueue.size).toBe(0);
    await runIdle();
    await flushImports();
    expect(loads.count).toBe(0);
  });

  it('loads once however many selectors and islands ask', async () => {
    const { useWarmCurrencyCombobox, warmCurrencyCombobox } = await fresh();
    render(
      <>
        <Probe hook={useWarmCurrencyCombobox} />
        <Probe hook={useWarmCurrencyCombobox} />
      </>,
    );
    warmCurrencyCombobox();
    await runIdle();
    await flushImports();
    // A later request after it has warmed schedules nothing.
    warmCurrencyCombobox();
    expect(idleQueue.size).toBe(0);
    expect(loads.count).toBe(1);
  });

  it('respects Save-Data: no speculative download', async () => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    const { useWarmCurrencyCombobox } = await fresh();
    render(<Probe hook={useWarmCurrencyCombobox} />);
    expect(idleQueue.size).toBe(0);
    await flushImports();
    expect(loads.count).toBe(0);
  });

  it('a selector rendered afterwards still mounts the real combobox (React.lazy shares the chunk)', async () => {
    const { CurrencySelector, warmCurrencyCombobox } = await fresh();
    warmCurrencyCombobox();
    await runIdle();
    await flushImports();
    expect(loads.count).toBe(1);

    const { findByLabelText } = render(<CurrencySelector value="USD" onChange={() => {}} id="warm-check" />);
    expect(await findByLabelText('Currency')).toBeInTheDocument();
    expect(loads.count).toBe(1);
  });
});
