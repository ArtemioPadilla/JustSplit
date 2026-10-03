// @vitest-environment jsdom
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Plan B19d, layer 2: the live-region announcement observer that the live smoke
 * injects with `addInitScript`, and the pure classifier that turns its log into
 * failures (`scripts/lib/live-announcements.mjs`). Like `console-policy.mjs`, the
 * judgement lives in a pure module so it is unit-tested here, not only by the run.
 *
 * Behavior contracts:
 *  - the observer records every text ADDED to an `[aria-live]`, `role=status|alert|log`
 *    or `<output>` region (timestamp, politeness, region identity, normalized text),
 *    and nothing else: a re-render that leaves the text as it was, a removal, a region
 *    that is `aria-live="off"` and plain content are all silent;
 *  - the classifier fails a double announcement: the same normalized text twice within
 *    1.5 s, the same sentence from two different regions, and an assertive announcement
 *    for something that is not an error;
 *  - the function it injects is self-contained (it is serialised into the page).
 */
interface Entry {
  at: number;
  doc?: string;
  politeness: 'polite' | 'assertive';
  region: string;
  regionKey: number;
  text: string;
  inserted?: boolean;
}
interface Violation {
  kind: 'repeat' | 'two-regions' | 'assertive-non-error';
  text: string;
  regions: string[];
  message: string;
}
interface Module {
  installLiveRegionObserver: (win?: Window) => { log: Entry[]; disconnect: () => void };
  classifyAnnouncements: (entries: Entry[], options?: { windowMs?: number }) => Violation[];
  normalizeAnnouncement: (text: string) => string;
  isErrorText: (text: string) => boolean;
  announcementsMatching: (entries: Entry[], pattern: RegExp, filter?: { politeness?: string; doc?: string }) => Entry[];
  DOUBLE_ANNOUNCEMENT_WINDOW_MS: number;
}
const load = async () =>
  (await import(/* @vite-ignore */ pathToFileURL(resolve(__dirname, '../../scripts/lib/live-announcements.mjs')).href)) as Module;

const entry = (over: Partial<Entry> & { text: string }): Entry => ({
  at: 1000,
  doc: 'd1',
  politeness: 'polite',
  region: 'div[role=status]',
  regionKey: 1,
  ...over,
});

describe('observeLiveRegions: what counts as an announcement', () => {
  let stop: (() => void) | undefined;
  afterEach(() => {
    stop?.();
    stop = undefined;
    document.body.innerHTML = '';
  });

  /** Mutation records are delivered as a microtask. */
  const flush = () => new Promise<void>((done) => setTimeout(done, 0));
  const start = async () => {
    const { installLiveRegionObserver } = await load();
    const observer = installLiveRegionObserver(window);
    stop = observer.disconnect;
    return observer.log;
  };

  it('records text added to a polite status region, with its politeness, region and normalized text', async () => {
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    document.body.append(region);
    await flush();
    expect(log).toEqual([]);

    region.append('  Expense   saved\n');
    await flush();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ politeness: 'polite', text: 'Expense saved', region: expect.stringContaining('role=status') });
    expect(typeof log[0]!.at).toBe('number');
  });

  it.each([
    ['role=alert', { role: 'alert' }, 'assertive'],
    ['aria-live=assertive', { 'aria-live': 'assertive' }, 'assertive'],
    ['aria-live=polite', { 'aria-live': 'polite' }, 'polite'],
    ['role=log', { role: 'log' }, 'polite'],
    ['role=status', { role: 'status' }, 'polite'],
    ['an explicit aria-live on an alert wins', { role: 'alert', 'aria-live': 'polite' }, 'polite'],
  ])('derives the politeness of %s', async (_name, attrs, politeness) => {
    const log = await start();
    const region = document.createElement('div');
    for (const [key, value] of Object.entries(attrs)) region.setAttribute(key, value);
    document.body.append(region);
    await flush();
    region.textContent = 'Something happened';
    await flush();
    expect(log.map((e) => e.politeness)).toEqual([politeness]);
  });

  it('treats <output> as a polite live region', async () => {
    const log = await start();
    const output = document.createElement('output');
    document.body.append(output);
    await flush();
    output.textContent = 'Total: 12.00';
    await flush();
    expect(log).toMatchObject([{ politeness: 'polite', text: 'Total: 12.00' }]);
  });

  it('ignores plain content, aria-live="off" and removals', async () => {
    const log = await start();
    const plain = document.createElement('p');
    const off = document.createElement('div');
    off.setAttribute('aria-live', 'off');
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    document.body.append(plain, off, status);
    await flush();
    plain.textContent = 'Not live';
    off.textContent = 'Muted';
    status.textContent = 'Heard';
    await flush();
    expect(log.map((e) => e.text)).toEqual(['Heard']);

    status.textContent = '';
    await flush();
    expect(log.map((e) => e.text)).toEqual(['Heard']);
  });

  it('ignores a re-render that leaves the text as it was', async () => {
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    document.body.append(region);
    await flush();
    region.innerHTML = '<span>Saved</span>';
    await flush();
    expect(log).toHaveLength(1);

    // React replacing the node with an identical one, and a text node rewritten with the same data.
    region.innerHTML = '<span>Saved</span>';
    await flush();
    (region.firstChild!.firstChild as Text).data = 'Saved';
    await flush();
    expect(log).toHaveLength(1);
  });

  it('records a changed text once, as the new text', async () => {
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    region.textContent = '';
    document.body.append(region);
    await flush();
    region.textContent = 'Saving';
    await flush();
    region.textContent = 'Saved';
    await flush();
    expect(log.map((e) => e.text)).toEqual(['Saving', 'Saved']);
  });

  it('reports only what was added to a non-atomic region, the whole text for an atomic one', async () => {
    const log = await start();
    const list = document.createElement('div');
    list.setAttribute('aria-live', 'polite');
    const atomic = document.createElement('div');
    atomic.setAttribute('aria-live', 'polite');
    atomic.setAttribute('aria-atomic', 'true');
    document.body.append(list, atomic);
    await flush();
    list.append(Object.assign(document.createElement('p'), { textContent: 'First' }));
    atomic.append(Object.assign(document.createElement('p'), { textContent: 'First' }));
    await flush();
    log.length = 0;

    list.append(Object.assign(document.createElement('p'), { textContent: 'Second' }));
    atomic.append(Object.assign(document.createElement('p'), { textContent: 'Second' }));
    await flush();
    expect(log.map((e) => e.text).sort()).toEqual(['First Second', 'Second']);
  });

  it('attributes a nested region to the innermost live region and skips aria-hidden text', async () => {
    const log = await start();
    const viewport = document.createElement('div');
    viewport.setAttribute('aria-live', 'polite');
    document.body.append(viewport);
    await flush();
    viewport.innerHTML = '<div role="status"><span>Saved</span><span aria-hidden="true">x</span><span hidden>secret</span></div>';
    await flush();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ text: 'Saved' });
  });

  it('flags a live region that was inserted already holding its text', async () => {
    const log = await start();
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div role="status">You are offline</div>';
    document.body.append(wrapper);
    await flush();
    expect(log).toMatchObject([{ text: 'You are offline', inserted: true }]);
  });

  it('does not flag a region inserted inside a live region that was already there (a toast in the toast viewport)', async () => {
    const log = await start();
    const viewport = document.createElement('div');
    viewport.setAttribute('aria-live', 'polite');
    document.body.append(viewport);
    await flush();
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status');
    toast.textContent = 'Expense saved';
    viewport.append(toast);
    await flush();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ text: 'Expense saved' });
    expect(log[0]!.inserted).toBe(false);
  });

  it('counts text once when several mutations in one batch add overlapping subtrees', async () => {
    const log = await start();
    // Like a React root: the container goes into the document, then the tree goes into the container, in one task.
    const container = document.createElement('div');
    document.body.append(container);
    const form = document.createElement('form');
    form.innerHTML = '<p role="status">Balanced — split evenly among 2 participants.</p>';
    container.append(form);
    await flush();
    expect(log).toHaveLength(1);
    expect(log[0]!.text).toBe('Balanced — split evenly among 2 participants.');
  });

  it('counts text once when a node and then something inside it are added to a standing region', async () => {
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    document.body.append(region);
    await flush();
    const wrapper = document.createElement('div');
    region.append(wrapper);
    const note = document.createElement('p');
    note.textContent = 'Saved';
    wrapper.append(note);
    await flush();
    expect(log.map((e) => e.text)).toEqual(['Saved']);
  });

  it('does not flag content added to a region that was already there', async () => {
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    document.body.append(region);
    await flush();
    region.innerHTML = '<p>You are offline</p>';
    await flush();
    expect(log).toHaveLength(1);
    expect(log[0]!.inserted).toBeFalsy();
  });

  it('hands every entry to window.__liveAnnounce (the Playwright binding) and keeps its own log', async () => {
    const calls: Entry[] = [];
    (window as unknown as { __liveAnnounce: (e: Entry) => void }).__liveAnnounce = (e) => void calls.push(e);
    const log = await start();
    const region = document.createElement('div');
    region.setAttribute('role', 'alert');
    document.body.append(region);
    await flush();
    region.textContent = 'Could not save';
    await flush();
    delete (window as unknown as { __liveAnnounce?: unknown }).__liveAnnounce;
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(log[0]);
    expect((window as unknown as { __liveAnnouncements: Entry[] }).__liveAnnouncements).toBe(log);
  });

  it('is self-contained: its source runs on its own, as it does after addInitScript serialises it', async () => {
    const { installLiveRegionObserver } = await load();
    const standalone = (0, eval)(`(${installLiveRegionObserver.toString()})`) as Module['installLiveRegionObserver'];
    const observer = standalone(window);
    stop = observer.disconnect;
    const region = document.createElement('div');
    region.setAttribute('role', 'status');
    document.body.append(region);
    await flush();
    region.textContent = 'Hello';
    await flush();
    expect(observer.log.map((e) => e.text)).toEqual(['Hello']);
  });
});

describe('classifyAnnouncements: double announcements fail', () => {
  it('lets a single polite announcement through', async () => {
    const { classifyAnnouncements } = await load();
    expect(classifyAnnouncements([entry({ text: 'Expense saved' })])).toEqual([]);
  });

  it('fails the same normalized text twice within 1.5 s, in one region', async () => {
    const { classifyAnnouncements } = await load();
    const found = classifyAnnouncements([
      entry({ text: 'Expense saved', at: 1000 }),
      entry({ text: '  expense   SAVED. ', at: 2400 }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'repeat', text: 'Expense saved' });
    expect(found[0]!.message).toMatch(/twice within 1\.5 ?s/);
    expect(found[0]!.message).toContain('Expense saved');
    expect(found[0]!.message).toContain('div[role=status]');
  });

  it('allows the same text again once the window has passed', async () => {
    const { classifyAnnouncements, DOUBLE_ANNOUNCEMENT_WINDOW_MS } = await load();
    expect(DOUBLE_ANNOUNCEMENT_WINDOW_MS).toBe(1500);
    expect(classifyAnnouncements([entry({ text: 'Saved', at: 0 }), entry({ text: 'Saved', at: 1501 })])).toEqual([]);
  });

  it('fails the same sentence from two different regions, naming both', async () => {
    const { classifyAnnouncements } = await load();
    const found = classifyAnnouncements([
      entry({ text: "You're offline.", at: 1000, region: 'div[role=region][aria-label="Notifications"]', regionKey: 1 }),
      entry({ text: "You're offline", at: 1200, region: 'p[role=status]', regionKey: 2 }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'two-regions' });
    expect(found[0]!.regions).toEqual(['div[role=region][aria-label="Notifications"]', 'p[role=status]']);
    expect(found[0]!.message).toContain('Notifications');
    expect(found[0]!.message).toContain('p[role=status]');
  });

  it('does not mix up different documents, or different texts', async () => {
    const { classifyAnnouncements } = await load();
    expect(
      classifyAnnouncements([
        entry({ text: 'Saved', at: 1000, doc: 'page-1' }),
        entry({ text: 'Saved', at: 1100, doc: 'page-2', regionKey: 9 }),
        entry({ text: 'Deleted', at: 1200, doc: 'page-1' }),
      ]),
    ).toEqual([]);
  });

  it('fails an assertive announcement that is not an error', async () => {
    const { classifyAnnouncements } = await load();
    const found = classifyAnnouncements([entry({ text: 'Expense saved', politeness: 'assertive', region: 'div[role=alert]' })]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ kind: 'assertive-non-error', text: 'Expense saved' });
    expect(found[0]!.message).toContain('div[role=alert]');
  });

  it.each([
    'Could not save this expense. Please try again.',
    'Incorrect email or password.',
    'Expense saved, but 1 receipt couldn’t be uploaded.',
    'Something went wrong',
    'Amount must be greater than zero.',
    'Failed to load',
  ])('lets an assertive announcement through when it is an error: %s', async (text) => {
    const { classifyAnnouncements } = await load();
    expect(classifyAnnouncements([entry({ text, politeness: 'assertive' })])).toEqual([]);
  });

  it('does not call a polite error a problem (politeness is only judged one way)', async () => {
    const { classifyAnnouncements } = await load();
    expect(classifyAnnouncements([entry({ text: 'Could not save', politeness: 'polite' })])).toEqual([]);
  });

  it('ignores empty announcements', async () => {
    const { classifyAnnouncements } = await load();
    expect(classifyAnnouncements([entry({ text: '' }), entry({ text: '   ', at: 1001 })])).toEqual([]);
  });

  it('reports each distinct problem once, not once per extra copy', async () => {
    const { classifyAnnouncements } = await load();
    const found = classifyAnnouncements([
      entry({ text: 'Saved', at: 1000 }),
      entry({ text: 'Saved', at: 1100 }),
      entry({ text: 'Saved', at: 1200 }),
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toMatch(/3 times|three times/);
  });

  it('honours a custom window', async () => {
    const { classifyAnnouncements } = await load();
    const two = [entry({ text: 'Saved', at: 0 }), entry({ text: 'Saved', at: 400 })];
    expect(classifyAnnouncements(two, { windowMs: 300 })).toEqual([]);
    expect(classifyAnnouncements(two, { windowMs: 500 })).toHaveLength(1);
  });
});

describe('helpers', () => {
  it('normalizeAnnouncement folds case, whitespace and trailing punctuation, and keeps the words', async () => {
    const { normalizeAnnouncement } = await load();
    expect(normalizeAnnouncement('  You’re   OFFLINE. \n')).toBe(normalizeAnnouncement("you're offline"));
    expect(normalizeAnnouncement('Saved!')).toBe('saved');
    expect(normalizeAnnouncement('Saved')).not.toBe(normalizeAnnouncement('Deleted'));
  });

  it('isErrorText recognises the product’s error sentences and not its confirmations', async () => {
    const { isErrorText } = await load();
    for (const text of ['Could not save this expense.', 'Incorrect email or password.', "You're offline. Changes can't be saved until you reconnect."]) {
      expect(isErrorText(text)).toBe(true);
    }
    for (const text of ['Expense saved', 'Receipt removed', 'Payment recorded', 'Update available']) {
      expect(isErrorText(text)).toBe(false);
    }
  });

  it('announcementsMatching filters a log by pattern, politeness and document', async () => {
    const { announcementsMatching } = await load();
    const log = [
      entry({ text: 'Expense saved', doc: 'a' }),
      entry({ text: 'Could not save', politeness: 'assertive', doc: 'a' }),
      entry({ text: 'Expense saved', doc: 'b' }),
    ];
    expect(announcementsMatching(log, /saved/i)).toHaveLength(2);
    expect(announcementsMatching(log, /saved/i, { doc: 'b' })).toHaveLength(1);
    expect(announcementsMatching(log, /./, { politeness: 'assertive' })).toHaveLength(1);
  });
});
