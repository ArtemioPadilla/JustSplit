import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plan A7: the live smoke fails on any `console.error`, `pageerror` or React
 * hydration error. The allowlist is minimal and explicit: each entry names one
 * known source of noise by message AND resource, so the same message from a
 * different resource still fails.
 */
interface Entry {
  type: string;
  text: string;
  resourceUrl?: string;
  pageUrl?: string;
}
interface Policy {
  CONSOLE_ALLOWLIST: { id: string; reason: string }[];
  classifyConsoleEntry: (entry: Entry) => { kind: string; message: string } | null;
}
const load = async () =>
  (await import(/* @vite-ignore */ pathToFileURL(resolve(__dirname, '../../scripts/lib/console-policy.mjs')).href)) as Policy;

const PAGE = 'http://127.0.0.1:4321/expenses/nope';

describe('classifyConsoleEntry (plan A7)', () => {
  it('lets ordinary logging through', async () => {
    const { classifyConsoleEntry } = await load();
    for (const type of ['log', 'info', 'debug', 'warning']) {
      expect(classifyConsoleEntry({ type, text: 'something happened', pageUrl: PAGE })).toBeNull();
    }
  });

  it('fails a console.error and a pageerror', async () => {
    const { classifyConsoleEntry } = await load();
    expect(classifyConsoleEntry({ type: 'error', text: 'boom', pageUrl: PAGE })).toMatchObject({ kind: 'console-error' });
    expect(classifyConsoleEntry({ type: 'pageerror', text: 'TypeError: x is null', pageUrl: PAGE })).toMatchObject({
      kind: 'pageerror',
    });
  });

  it('names React hydration errors, whatever channel they arrive on', async () => {
    const { classifyConsoleEntry } = await load();
    for (const [type, text] of [
      ['error', 'Minified React error #418; visit https://react.dev/errors/418'],
      ['pageerror', 'Minified React error #423'],
      ['error', 'Hydration failed because the server rendered HTML didn’t match the client.'],
      ['warning', 'A tree hydrated but some attributes of the server rendered HTML didn’t match the client'],
      ['error', 'Warning: Text content did not match. Server: "a" Client: "b"'],
    ] as const) {
      expect(classifyConsoleEntry({ type, text, pageUrl: PAGE })).toMatchObject({ kind: 'hydration' });
    }
  });

  it('allows the Google Fonts TLS error, and only from a Google Fonts resource', async () => {
    const { classifyConsoleEntry } = await load();
    const text = 'Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID';
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: 'https://fonts.googleapis.com/css2?family=Fraunces', pageUrl: PAGE })).toBeNull();
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: 'https://fonts.gstatic.com/s/x.woff2', pageUrl: PAGE })).toBeNull();
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: 'http://127.0.0.1:54321/rest/v1/expenses', pageUrl: PAGE })).toMatchObject({
      kind: 'console-error',
    });
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: 'https://open.er-api.com/v6/latest/USD', pageUrl: PAGE })).not.toBeNull();
  });

  it('allows the shell’s intentional 404 status only for the page document itself', async () => {
    const { classifyConsoleEntry } = await load();
    const text = 'Failed to load resource: the server responded with a status of 404 (Not Found)';
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: PAGE, pageUrl: PAGE })).toBeNull();
    // a missing asset or API call is a real defect
    expect(classifyConsoleEntry({ type: 'error', text, resourceUrl: 'http://127.0.0.1:4321/_astro/missing.js', pageUrl: PAGE })).toMatchObject({
      kind: 'console-error',
    });
    expect(classifyConsoleEntry({ type: 'error', text, pageUrl: PAGE })).not.toBeNull();
  });

  it('never allowlists a hydration error, even from an allowlisted resource', async () => {
    const { classifyConsoleEntry } = await load();
    expect(
      classifyConsoleEntry({ type: 'error', text: 'Minified React error #418', resourceUrl: 'https://fonts.googleapis.com/x', pageUrl: PAGE }),
    ).toMatchObject({ kind: 'hydration' });
  });

  it('keeps the allowlist to two documented entries', async () => {
    const { CONSOLE_ALLOWLIST } = await load();
    expect(CONSOLE_ALLOWLIST).toHaveLength(2);
    for (const entry of CONSOLE_ALLOWLIST) {
      expect(entry.id).toMatch(/^[a-z0-9-]+$/);
      expect(entry.reason.length).toBeGreaterThan(20);
    }
  });
});
