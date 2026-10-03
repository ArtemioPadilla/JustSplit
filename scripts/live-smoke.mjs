#!/usr/bin/env node
/**
 * Live end-to-end smoke (plan A7): a production build of the app, driven in a
 * real Chromium against `supabase start`, on every PR.
 *
 * Why it exists: the defects that made the app unusable (a missing
 * `QueryProvider`, NULL-column reads, a hydration mismatch) never showed up in
 * the mocked unit suites, and `check:a11y` runs signed OUT, so it never sees a
 * signed-in page state. This does what a human's manual run did.
 *
 * Like `check:a11y` (and `test:rls`), it is deliberately NOT part of `npm run
 * check`: it needs Docker, a running local stack and a browser. It has its own
 * CI step in the "RLS & contract (supabase start)" job, which already has the
 * stack (`npm run db:start && npm run db:migrate` first; see SETUP.md).
 *
 * What it does, in order:
 *  1. Reads the stack's keys from `supabase status` (never committed, no CI
 *     secret) and builds the site with them into a throwaway directory, so the
 *     `dist/` that `npm run check` built without Supabase is left alone.
 *     `LIVE_SMOKE_DIST=<dir>` reuses an existing build (local iteration only).
 *  2. Serves it with the shared static server, with the build's `_headers`
 *     (the production CSP: a violation is a console error that fails the run), Pages'
 *     canonical redirects and its 404.html fallback (the dynamic `/expenses/<id>`
 *     routes only exist through it).
 *  3. Seeds users and rows through the service role (scripts/lib/live-stack.mjs),
 *     and removes them again at the end; ids are per-run, so a run that died
 *     halfway can never collide with the next one.
 *  4. Signs in through the REAL `/auth/signin/` form as Ana, Beto and Cami, and
 *     walks the critical flows, asserting real database state through the
 *     service role wherever the UI could lie.
 *  5. Runs axe and a 375px overflow check on every signed-in page state, in
 *     light, dark and 375px. These contexts reuse Ana's real session through
 *     Playwright's storageState instead of signing in three more times (the
 *     sign-in path itself is exercised above).
 *  Throughout, any console.error, uncaught error or React hydration error
 *  fails the run (scripts/lib/console-policy.mjs: a one-entry allowlist).
 *
 * Screen-reader layers (plan B19d), on top of axe:
 *  - Announcements: every page records what its live regions announce
 *    (scripts/lib/live-announcements.mjs, injected with addInitScript). The flows
 *    assert the expected announcements ("saved" once, politely; the offline banner
 *    once), and any double announcement, same sentence from two regions or assertive
 *    non-error fails the run, naming the flow, the text and the regions.
 *  - Accessibility tree: every signed-in page state is also checked against the
 *    invariants of scripts/lib/aria-invariants.mjs over Chromium's accessibility tree
 *    (one main and one h1, named controls and dialogs, distinct navigation labels,
 *    nothing focused inside aria-hidden).
 *  Neither replaces a manual NVDA / VoiceOver / TalkBack pass (plan B18).
 */
import { rmSync } from 'node:fs';
import { CONFIGS } from './lib/a11y-configs.mjs';
import { launchChromium } from './lib/browser.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { buildDist, cleanup, createAdmin, PASSWORD, readStack, seed } from './lib/live-stack.mjs';
import {
  ariaTreeViolations,
  axeViolations,
  bodyText,
  isolateExternalRequests,
  overflowOf,
  settle,
  waitForText,
  watchAnnouncements,
  watchConsole,
} from './lib/live-audit.mjs';
import { announcementsMatching, classifyAnnouncements, DOUBLE_ANNOUNCEMENT_WINDOW_MS } from './lib/live-announcements.mjs';

const BASE = (process.env.ASTRO_BASE || '/').replace(/\/$/, '');
const TIMEOUT = 15_000;

const failures = [];
const fail = (where, message) => failures.push(`${where}: ${message}`);
const log = (message) => console.log(`live-smoke ${message}`);
const seen = new Set();
const consoleSink = (kind, message, where) => {
  const key = `${kind}|${message}|${where}`;
  if (seen.has(key)) return;
  seen.add(key);
  fail(where, `${kind}: ${message.slice(0, 300)}`);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Plan B19d: every live-region announcement of every page of every context, tagged with the context's label.
const announcements = [];
const reportedAnnouncements = new Set();
/** Fails the run for each double announcement or assertive non-error among `entries`, once per message. */
function reportAnnouncementProblems(where, entries) {
  for (const violation of classifyAnnouncements(entries)) {
    if (reportedAnnouncements.has(violation.message)) continue;
    reportedAnnouncements.add(violation.message);
    fail(where, `announcement: ${violation.message}`);
  }
}
/** What `who` (a context label) was told since `since` (a timestamp), by text. */
const heard = (who, since, pattern, filter) =>
  announcementsMatching(announcements.filter((entry) => entry.label === who && entry.at >= since), pattern, filter);
/**
 * Waits for `pattern` to be announced to `who`, lets a late duplicate show up (the double-announcement
 * window), then insists on exactly one announcement of the right politeness. Hidden-region announcements
 * are named in the failure: that is a page speaking behind an open modal, i.e. to nobody.
 */
async function expectAnnouncedOnce(who, since, pattern, what, { politeness = 'polite' } = {}) {
  const end = Date.now() + 10_000;
  let found = heard(who, since, pattern);
  while (found.length === 0) {
    if (Date.now() > end) {
      const hidden = heard(who, since, pattern, { hidden: true });
      throw new Error(
        `${what}: ${pattern} was never announced to ${who}` +
          (hidden.length ? ` (${hidden.length} went into a region hidden from assistive technology: ${hidden[0].region})` : ''),
      );
    }
    await sleep(100);
    found = heard(who, since, pattern);
  }
  const settled = found[0].at + DOUBLE_ANNOUNCEMENT_WINDOW_MS + 300 - Date.now();
  if (settled > 0) await sleep(settled);
  found = heard(who, since, pattern);
  assert(
    found.length === 1,
    `${what}: ${pattern} was announced ${found.length} times to ${who} (${found.map((e) => `${e.politeness} ${e.region}`).join('; ')})`,
  );
  assert(found[0].politeness === politeness, `${what}: announced ${found[0].politeness}, expected ${politeness} (${found[0].region})`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** Polls `read` until `ok(value)`: the UI can report success a moment before a write is visible to the service role. */
async function eventually(what, read, ok, timeout = 10_000) {
  const end = Date.now() + timeout;
  for (;;) {
    const value = await read();
    if (ok(value)) return value;
    if (Date.now() > end) throw new Error(`${what}: last saw ${JSON.stringify(value)}`);
    await sleep(250);
  }
}

/**
 * One flow. A failure is recorded (with where the page was) and the run continues with the next one.
 * Whatever the flow announced, in any of the contexts, is then held to the double-announcement rules.
 */
async function flow(name, page, run) {
  const t0 = Date.now();
  try {
    await run();
    log(`ok   ${name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  } catch (error) {
    let where = '';
    try {
      where = ` [at ${page.url()}: ${(await bodyText(page)).replace(/\s+/g, ' ').slice(0, 200)}]`;
    } catch {
      // the page is gone; the message alone will do
    }
    fail(`flow "${name}"`, `${String(error.message ?? error).split('\n')[0]}${where}`);
    log(`FAIL ${name}`);
  }
  reportAnnouncementProblems(`flow "${name}"`, announcements.filter((entry) => entry.at >= t0));
}

async function main() {
  const stack = readStack();
  const admin = createAdmin(stack);
  const distDir = process.env.LIVE_SMOKE_DIST ?? buildDist(stack);
  const builtHere = !process.env.LIVE_SMOKE_DIST;
  log(`build ready (${builtHere ? 'built now' : 'LIVE_SMOKE_DIST'})`);

  const server = await startStaticServer({ dist: distDir, base: BASE, notFoundShell: true });
  const origin = `http://127.0.0.1:${server.address().port}${BASE}`;
  const url = (path) => `${origin}${path}`;

  const browser = await launchChromium();
  const created = [];
  const contexts = [];

  /** A context that follows the smoke's rules: no service worker, isolated network, console policy. */
  async function newContext(label, options = {}) {
    // en-US: date and number formats in assertions must not depend on the runner's locale.
    const context = await browser.newContext({ locale: 'en-US', serviceWorkers: 'block', ...options });
    context.setDefaultTimeout(TIMEOUT);
    context.setDefaultNavigationTimeout(30_000);
    await isolateExternalRequests(context);
    watchConsole(context, label, consoleSink);
    await watchAnnouncements(context, label, announcements);
    contexts.push(context);
    return context;
  }

  /** Real sign-in through /auth/signin/, exactly as a person does it. */
  async function signIn(user) {
    const context = await newContext(user.name);
    const page = await context.newPage();
    await page.goto(url('/auth/signin/'), { waitUntil: 'networkidle' });
    await page.locator('#login-email').fill(user.email);
    // The smoke builds with PUBLIC_AUTH_GOOGLE unset, so it covers the email-only default
    // (plan B20a): the form must not offer, or hint at, a disabled provider.
    assert((await page.getByText(/google/i).count()) === 0, '/auth/signin/ shows Google while PUBLIC_AUTH_GOOGLE is unset');
    await page.locator('#login-password').fill(PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('/auth/'), { timeout: 20_000 });
    return { context, page };
  }

  try {
    const data = await seed(admin, created);
    const { ana, beto, cami } = data.users;
    log(`seeded run ${data.tag}`);

    const [A, B, C] = await Promise.all([signIn(ana), signIn(beto), signIn(cami)]);
    log('signed in as Ana, Beto and Cami through /auth/signin/');
    const a = A.page;
    const b = B.page;
    const c = C.page;

    const goto = async (page, path) => {
      await page.goto(url(path), { waitUntil: 'load' });
      await settle(page);
    };
    const idFrom = (page, prefix) => {
      const match = new RegExp(`^${BASE}${prefix}/([0-9a-f-]{36})/?$`).exec(new URL(page.url()).pathname);
      assert(match, `expected a ${prefix}/<uuid> URL, got ${page.url()}`);
      return match[1];
    };
    const row = async (table, id) => (await admin.from(table).select('*').eq('id', id).maybeSingle()).data;
    // The suggested-payments amount as one party reads it.
    const pendingAmount = async (page) => {
      const text = await page.locator('ul[aria-label="Suggested payments"] li').first().innerText();
      return /USD ([\d.]+)/.exec(text)?.[1];
    };

    // ── 1. Dashboard loads with real numbers ─────────────────────────────────
    await flow('dashboard shows the seeded numbers', a, async () => {
      await goto(a, '/');
      await waitForText(a, /Financial summary\s+\$140\.00\s+Total spent\s+1\s+Person to settle up with/);
      await waitForText(a, /Balance overview\s+You owe Beto Smoke \$30\.00/);
      await waitForText(a, /Seed groceries\s+Paid by Beto Smoke\s+\$100\.00/);
      await waitForText(a, /Seed fuel\s+Paid by Ana Smoke\s+\$40\.00/);
    });

    // ── 2. /settlements: partial payment, same pairwise balance for both, undo ─
    await flow('settlements: record a partial payment, both parties agree, undo', a, async () => {
      await goto(a, '/settlements');
      await waitForText(a, /You owe Beto Smoke\s+USD 30\.00/);

      const openRecord = () => a.getByRole('button', { name: 'Record payment from you to Beto Smoke' }).click();
      const tOpen = Date.now();
      await openRecord();
      // By name, as before: toasts used to be role=dialog too (Base UI), so a bare getByRole('dialog') was ambiguous; since B19b they are role=status/alert, and the name still pins the right dialog.
      const dialog = a.getByRole('dialog', { name: 'Record payment' });
      // Escape from the currency combobox (popup closed) must still dismiss the dialog.
      await dialog.getByRole('combobox', { name: 'Payment currency' }).focus();
      await a.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await openRecord();
      await dialog.getByLabel('Amount').fill('10.00');
      // A dialog is announced by focus moving into it, not by a live region on top of that.
      assert(heard(ana.name, tOpen, /record payment|mark that you paid/i).length === 0, 'opening the payment dialog was announced through a live region');
      const tSave = Date.now();
      await dialog.getByRole('button', { name: 'Save payment' }).click();
      await dialog.waitFor({ state: 'hidden' });
      await waitForText(a, /You owe Beto Smoke\s+USD 20\.00/);
      await expectAnnouncedOnce(ana.name, tSave, /^Payment recorded$/, 'record payment');

      const payments = await eventually(
        'the settlement row',
        async () => (await admin.from('settlements').select('*').eq('from_user_id', ana.id).eq('to_user_id', beto.id)).data,
        (rows) => rows.length === 1,
      );
      assert(Number(payments[0].amount) === 10 && payments[0].currency === 'USD', `wrong settlement ${JSON.stringify(payments[0])}`);
      assert(payments[0].created_by === ana.id, 'the payment must be attributed to the person who recorded it');

      // The other party reads the SAME pairwise number (ADR 0014 s5).
      await goto(b, '/settlements');
      await waitForText(b, /Ana Smoke owes you\s+USD 20\.00/);
      const [fromAna, fromBeto] = [await pendingAmount(a), await pendingAmount(b)];
      assert(fromAna === '20.00' && fromBeto === '20.00', `parties disagree: Ana sees ${fromAna}, Beto sees ${fromBeto}`);
      await b.getByRole('tab', { name: 'Balances' }).click();
      await waitForText(b, /Owe you[\s\S]*Ana Smoke[\s\S]*USD 20\.00/);

      // Undo (creator only) restores the ledger exactly.
      await a.getByRole('tab', { name: 'History' }).click();
      await waitForText(a, /Payment history[\s\S]*You → Beto Smoke[\s\S]*USD 10\.00/);
      await a.getByRole('button', { name: 'Undo payment from you to Beto Smoke, USD 10.00' }).click();
      const tUndo = Date.now();
      await a.getByRole('dialog', { name: 'Undo this payment?' }).getByRole('button', { name: 'Undo payment', exact: true }).click();
      await eventually(
        'the settlement to be gone',
        async () => (await admin.from('settlements').select('id').eq('from_user_id', ana.id).eq('to_user_id', beto.id)).data,
        (rows) => rows.length === 0,
      );
      await a.getByRole('tab', { name: 'Pending' }).click();
      await waitForText(a, /You owe Beto Smoke\s+USD 30\.00/);
      await expectAnnouncedOnce(ana.name, tUndo, /^Payment undone$/, 'undo payment');
      await goto(b, '/settlements');
      await waitForText(b, /Ana Smoke owes you\s+USD 30\.00/);
    });

    // ── 3. Create an expense; see it in the list and in the detail view ──────
    await flow('expenses: create, list, detail', a, async () => {
      const tForm = Date.now();
      await goto(a, '/expenses/new');
      // A form that loads clean says nothing about validation: the splitter used to announce "Select at least
      // one participant." while the friends were still loading.
      await waitForText(a, /Split method/);
      await sleep(DOUBLE_ANNOUNCEMENT_WINDOW_MS);
      const early = heard(ana.name, tForm, /select at least one participant/i);
      assert(early.length === 0, `loading /expenses/new announced a validation message nobody caused: "${early[0]?.text}"`);
      await a.locator('#expense-form-description').fill('Smoke lunch');
      await a.locator('#expense-form-amount').fill('60');
      await a.getByRole('checkbox', { name: 'Beto Smoke' }).check();
      const tSave = Date.now();
      await a.getByRole('button', { name: 'Save expense' }).click();
      await a.waitForURL((u) => /\/expenses\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const id = idFrom(a, '/expenses');

      const saved = await eventually('the expense row', () => row('expenses', id), Boolean);
      assert(Number(saved.amount) === 60 && saved.currency === 'USD', `wrong expense ${JSON.stringify(saved)}`);
      assert(saved.paid_by === ana.id && saved.created_by === ana.id, 'the payer must be the signed-in user');
      assert(saved.member_ids.includes(beto.id) && saved.member_ids.includes(ana.id), 'both people must be on the expense');
      assert(saved.splits.reduce((sum, split) => sum + Number(split.amount), 0) === 60, 'the splits must add up to the amount');
      await waitForText(a, /Smoke lunch[\s\S]*USD 60\.00[\s\S]*Split among \(2\)[\s\S]*USD 30\.00/);
      // The save toast is queued before the navigation and spoken by the next page: one polite "saved".
      await expectAnnouncedOnce(ana.name, tSave, /^Expense saved$/, 'save expense');

      await goto(a, '/expenses/list');
      await waitForText(a, /Smoke lunch\s+[\d/]+\s+USD 60\.00\s+Ana Smoke/);
      await a.getByRole('link', { name: /Smoke lunch/ }).click();
      await a.waitForURL((u) => u.pathname.includes(id));
      await settle(a);
      await waitForText(a, /Smoke lunch[\s\S]*Paid by\s+Ana Smoke/);
    });

    // ── 4. Create an event with a friend, then add an expense to it ──────────
    await flow('events: create with a friend, add an expense', a, async () => {
      await goto(a, '/events/new');
      await a.getByLabel('Event name').fill('Smoke weekend');
      await a.getByRole('checkbox', { name: 'Beto Smoke' }).check();
      const tEvent = Date.now();
      await a.getByRole('button', { name: 'Create event' }).click();
      await a.waitForURL((u) => /\/events\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const eventId = idFrom(a, '/events');
      const event = await eventually('the event row', () => row('events', eventId), Boolean);
      assert(event.name === 'Smoke weekend' && event.created_by === ana.id, `wrong event ${JSON.stringify(event)}`);
      assert(event.member_ids.includes(ana.id) && event.member_ids.includes(beto.id), 'the friend must be a member');
      assert(event.group_id === null && event.description === null && event.end_date === null, 'optional columns stay NULL');
      await waitForText(a, /Smoke weekend/);
      await expectAnnouncedOnce(ana.name, tEvent, /^Event created$/, 'create event');

      await settle(a);
      await a.getByRole('link', { name: 'Add expense' }).click();
      // With or without the trailing slash: the static server redirects `/x` to `/x/` like Cloudflare Pages.
      await a.waitForURL((u) => /\/expenses\/new\/?$/.test(u.pathname) && u.search.includes(eventId));
      await settle(a);
      await a.locator('#expense-form-description').fill('Smoke dinner');
      await a.locator('#expense-form-amount').fill('90');
      const tDinner = Date.now();
      await a.getByRole('button', { name: 'Save expense' }).click();
      await a.waitForURL((u) => /\/expenses\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      await expectAnnouncedOnce(ana.name, tDinner, /^Expense saved$/, 'save an expense into an event');
      const expense = await eventually('the event expense row', () => row('expenses', idFrom(a, '/expenses')), Boolean);
      assert(expense.event_id === eventId && Number(expense.amount) === 90, `the expense must belong to the event: ${JSON.stringify(expense)}`);

      await goto(a, `/events/${eventId}`);
      await waitForText(a, /Smoke dinner[\s\S]*USD 90\.00/);
      await waitForText(a, /Total\s+USD 90\.00/);
    });

    // ── 5. Create a group ────────────────────────────────────────────────────
    await flow('groups: create', a, async () => {
      await goto(a, '/groups/new');
      await a.locator('#group-form-name').fill('Smoke group');
      await a.getByRole('checkbox', { name: 'Beto Smoke' }).check();
      const tGroup = Date.now();
      await a.getByRole('button', { name: 'Create group' }).click();
      await a.waitForURL((u) => /\/groups\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const group = await eventually('the group row', () => row('expense_groups', idFrom(a, '/groups')), Boolean);
      assert(group.name === 'Smoke group' && group.created_by === ana.id, `wrong group ${JSON.stringify(group)}`);
      assert(group.member_ids.includes(beto.id) && group.admin_ids.length === 1 && group.admin_ids[0] === ana.id, 'creator is the only admin');
      await waitForText(a, /Smoke group[\s\S]*Members \(2\)/);
      await expectAnnouncedOnce(ana.name, tGroup, /^Group created$/, 'create group');
    });

    // ── 6. Friend request: Ana sends, Cami accepts ───────────────────────────
    await flow('friends: send a request and accept it as the second user', a, async () => {
      await goto(a, '/friends');
      await a.locator('#add-friend-email').fill(cami.email);
      const tSend = Date.now();
      await a.getByRole('button', { name: 'Send request' }).click();
      const pending = await eventually(
        'the pending friendship',
        async () => (await admin.from('friendships').select('*').contains('users', [ana.id, cami.id])).data,
        (rows) => rows.length === 1,
      );
      assert(pending[0].status === 'pending' && pending[0].requested_by === ana.id, `wrong friendship ${JSON.stringify(pending[0])}`);
      await expectAnnouncedOnce(ana.name, tSend, /^Friend request sent$/, 'send a friend request');

      await goto(c, '/friends');
      await waitForText(c, /Friend requests\s+[A-Z]{2}\s+Ana Smoke/);
      const tAccept = Date.now();
      await c.getByRole('button', { name: 'Accept' }).click();
      await eventually(
        'the accepted friendship',
        async () => (await admin.from('friendships').select('status').eq('id', pending[0].id).maybeSingle()).data?.status,
        (status) => status === 'accepted',
      );

      await expectAnnouncedOnce(cami.name, tAccept, /^Friend request accepted$/, 'accept a friend request');

      await goto(a, '/friends');
      await waitForText(a, /Friends \(\d\)[\s\S]*Cami Smoke/);
    });

    // ── 7. Profile: edit the name ────────────────────────────────────────────
    await flow('profile: edit the name', a, async () => {
      await goto(a, '/profile');
      await a.locator('#profile-display-name').fill('Ana Renamed');
      const tProfile = Date.now();
      await a.getByRole('button', { name: 'Save changes' }).click();
      // Before anything navigates away: the toast is immediate, and a reload right after the database shows the
      // new name could land before the page has said so.
      await expectAnnouncedOnce(ana.name, tProfile, /^Profile updated$/, 'save the profile');
      await eventually(
        'the renamed profile',
        async () => (await admin.from('profiles').select('name').eq('id', ana.id).maybeSingle()).data?.name,
        (name) => name === 'Ana Renamed',
      );
      await goto(a, '/profile');
      assert((await a.locator('#profile-display-name').inputValue()) === 'Ana Renamed', 'the new name must survive a reload');
    });

    // ── 8. Offline (plan B19c, ADR 0015): writes are blocked and explained, then come back ─
    // Playwright's `setOffline` flips `navigator.onLine` and fires the `offline` event, like DevTools. The page and
    // the service role are the two witnesses: the page says why, the database proves nothing was written. (Service
    // workers stay blocked in this smoke, which is fine here: this is about the controls, `check:offline` owns the shell.)
    const OFFLINE_SENTENCE = "You're offline. Changes can't be saved until you reconnect.";
    // A blocked control is aria-disabled (never a bare `disabled`) and described by the visible sentence.
    const assertBlocked = async (control, where) => {
      assert((await control.getAttribute('aria-disabled')) === 'true', `${where}: not aria-disabled while offline`);
      assert((await control.getAttribute('disabled')) === null, `${where}: a bare disabled hides the reason from a screen reader`);
      const describedBy = await control.getAttribute('aria-describedby');
      assert(describedBy, `${where}: not described by anything`);
      const description = await control.page().locator(`[id="${describedBy}"]`).textContent();
      assert(description?.trim() === OFFLINE_SENTENCE, `${where}: described by ${JSON.stringify(description)}`);
    };
    const assertWritable = async (control, where) => {
      assert((await control.getAttribute('aria-disabled')) === null, `${where}: still aria-disabled after reconnecting`);
      assert((await control.getAttribute('aria-describedby')) === null, `${where}: still described by the offline sentence after reconnecting`);
    };
    // Plan B19d: going offline is announced ONCE per page, by the layout's banner (polite); the per-control
    // sentence is not a live region (ADR 0015), so N blocked controls never mean N announcements; and
    // reconnecting is announced once, symmetrically ("You're back online."), without repeating the outage.
    const OFFLINE_BANNER = /You're offline — using cached data/;
    const goOffline = async () => {
      const tOffline = Date.now();
      await A.context.setOffline(true);
      // The event reaches the page a moment later; the sentence is what a person sees.
      await a.getByText(OFFLINE_SENTENCE, { exact: true }).first().waitFor();
      await expectAnnouncedOnce(ana.name, tOffline, OFFLINE_BANNER, 'going offline');
      const sentence = heard(ana.name, tOffline, /Changes can't be saved/);
      assert(sentence.length <= 1, `the offline sentence was announced ${sentence.length} times (${sentence.map((e) => e.region).join('; ')}); once per page at most, never once per control`);
    };
    const goOnline = async () => {
      const tOnline = Date.now();
      await A.context.setOffline(false);
      await a.getByText(OFFLINE_SENTENCE, { exact: true }).first().waitFor({ state: 'hidden' });
      await expectAnnouncedOnce(ana.name, tOnline, /^You're back online\.$/, 'reconnecting');
      const again = heard(ana.name, tOnline, /offline/i);
      assert(again.length === 0, `reconnecting announced the outage again (${again.map((e) => `"${e.text}" in ${e.region}`).join('; ')})`);
    };

    await flow('offline: a form is blocked with the sentence, keeps what was typed, and works again on reconnect', a, async () => {
      await goto(a, '/expenses/new');
      await a.locator('#expense-form-description').fill('Offline lunch');
      await a.locator('#expense-form-amount').fill('25');
      const save = a.getByRole('button', { name: 'Save expense' });
      await assertWritable(save, 'online Save expense');

      try {
        // Inside the try: a failure here must still put the network back for the flows after it.
        await goOffline();
        await assertBlocked(save, 'Save expense');
        // `force`: Playwright treats aria-disabled as "not enabled" and would wait; a person can still click it.
        await save.click({ force: true });
        await a.locator('#expense-form-description').press('Enter');
        await sleep(500);
        assert(new URL(a.url()).pathname.endsWith('/expenses/new/') || new URL(a.url()).pathname.endsWith('/expenses/new'), `left the form: ${a.url()}`);
        assert((await a.locator('#expense-form-description').inputValue()) === 'Offline lunch', 'the description was lost');
        assert((await a.locator('#expense-form-amount').inputValue()) === '25', 'the amount was lost');
        const rows = (await admin.from('expenses').select('id').eq('description', 'Offline lunch')).data;
        assert(rows.length === 0, 'an expense was written while offline');
      } finally {
        await goOnline();
      }
      await assertWritable(save, 'Save expense after reconnecting');
    });

    await flow('offline: a dialog is blocked with the sentence, keeps what was typed, and works again on reconnect', a, async () => {
      await goto(a, '/settlements');
      await waitForText(a, /Suggested payments[\s\S]*Record payment/);
      const dialog = a.getByRole('dialog', { name: 'Record payment' });
      // The earlier flows moved the balance, so take the first suggestion whoever it is with.
      const trigger = a.getByRole('button', { name: /^Record payment from / }).first();
      await trigger.click();
      await dialog.getByLabel('Amount').fill('7.00');
      const save = dialog.getByRole('button', { name: 'Save payment' });

      try {
        await goOffline();
        await assertBlocked(save, 'Save payment');
        await save.click({ force: true });
        await sleep(500);
        assert(await dialog.isVisible(), 'the dialog closed');
        assert((await dialog.getByLabel('Amount').inputValue()) === '7.00', 'the typed amount was lost');
        const rows = (await admin.from('settlements').select('id').eq('from_user_id', ana.id).eq('to_user_id', beto.id).eq('amount', 7)).data;
        assert(rows.length === 0, 'a payment was written while offline');

        // Closed, the trigger itself is blocked too, and opens nothing.
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await dialog.waitFor({ state: 'hidden' });
        await assertBlocked(trigger, 'the Record payment trigger');
        await trigger.click({ force: true });
        await sleep(300);
        assert(!(await dialog.isVisible()), 'a blocked trigger opened the dialog');
      } finally {
        await goOnline();
      }
      await assertWritable(trigger, 'the Record payment trigger after reconnecting');
      await trigger.click();
      await dialog.waitFor();
      await assertWritable(dialog.getByRole('button', { name: 'Save payment' }), 'Save payment after reconnecting');
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await dialog.waitFor({ state: 'hidden' });
    });

    // ── Signed-in axe + overflow, in light, dark and 375px ───────────────────
    // A payment on the ledger gives History a row (and an Undo button) to scan.
    await admin.from('settlements').insert({
      id: crypto.randomUUID(), from_user_id: ana.id, to_user_id: beto.id, amount: 5, currency: 'USD',
      date: new Date().toISOString().slice(0, 10), member_ids: [ana.id, beto.id], created_by: ana.id,
    });

    const openTab = (name) => async (page) => {
      await page.getByRole('tab', { name }).click();
    };
    const STATES = [
      { name: 'dashboard', path: '/', ready: /Balance overview/ },
      { name: 'expenses list', path: '/expenses/list', ready: /Seed groceries/ },
      { name: 'events list', path: '/events/list', ready: /Seed trip/ },
      { name: 'groups list', path: '/groups/list', ready: /Casa \(smoke\)/ },
      { name: 'friends', path: '/friends', ready: /Dani Smoke/ },
      { name: 'new expense', path: '/expenses/new', ready: /Split method/ },
      { name: 'new event', path: '/events/new', ready: /Participants/ },
      { name: 'new group', path: '/groups/new', ready: /Create group/ },
      { name: 'expense detail', path: `/expenses/${data.groceriesId}`, ready: /Split among/ },
      { name: 'expense edit', path: `/expenses/edit/${data.groceriesId}`, ready: /Save changes/ },
      { name: 'event detail', path: `/events/${data.eventId}`, ready: /Event timeline/ },
      { name: 'event edit', path: `/events/edit/${data.eventId}`, ready: /Save changes/ },
      { name: 'group detail', path: `/groups/${data.groupId}`, ready: /Members \(2\)/ },
      { name: 'friend detail', path: `/friends/${beto.id}`, ready: /Shared expenses/ },
      { name: 'settlements: Pending', path: '/settlements', ready: /Suggested payments[\s\S]*USD \d+\.\d\d\s*Record payment/ },
      { name: 'settlements: Balances', path: '/settlements', ready: /Suggested payments/, prepare: openTab('Balances'), after: /Balances[\s\S]*You owe/ },
      { name: 'settlements: History', path: '/settlements', ready: /Suggested payments/, prepare: openTab('History'), after: /Payment history[\s\S]*USD 5\.00/ },
      {
        name: 'settlements: record dialog open',
        path: '/settlements',
        ready: /Suggested payments[\s\S]*USD \d+\.\d\d\s*Record payment/,
        transition: true,
        prepare: async (page) => {
          await page.getByRole('button', { name: /^Record payment from / }).first().click();
          await page.getByRole('dialog', { name: 'Record payment' }).waitFor();
        },
      },
      { name: 'settlements: event scope', path: `/settlements?event=${data.eventId}`, ready: /Suggested payments/ },
      { name: 'profile', path: '/profile', ready: /Change password/ },
      { name: 'unknown expense id', path: '/expenses/nope', ready: /Page not found/ },
      {
        // The ticker's fallback state (the rates API is down or answers badly): its banner has its own colours.
        name: 'dashboard: exchange rates unavailable',
        path: '/',
        ready: /Some rates are approximate/,
        before: async (page) => {
          await page.route('https://open.er-api.com/**', (route) =>
            route.fulfill({ contentType: 'application/json', body: JSON.stringify({ result: 'error' }) }),
          );
          await page.addInitScript(() => localStorage.removeItem('justsplit:rates'));
        },
      },
    ];

    const storageState = await A.context.storageState();
    const auditT0 = Date.now();
    await Promise.all(
      CONFIGS.map(async (config) => {
        const context = await newContext(`audit ${config.name}`, { ...config.contextOptions, storageState });
        const page = await context.newPage();
        let clean = 0;
        for (const state of STATES) {
          const label = `${state.name} [${config.name}]`;
          const tState = Date.now();
          try {
            if (state.before) await state.before(page);
            await goto(page, state.path);
            await waitForText(page, state.ready);
            if (state.prepare) await state.prepare(page);
            if (state.after) await waitForText(page, state.after);
            const violations = await axeViolations(page, { transition: state.transition });
            for (const violation of violations) fail(`axe ${label}`, violation);
            // Plan B19d, layer 3: the structural invariants over Chromium's accessibility tree.
            const treeViolations = await ariaTreeViolations(page);
            for (const violation of treeViolations) fail(`a11y tree ${label}`, violation);
            const overflow = config.checkOverflow ? await overflowOf(page) : null;
            if (overflow) fail(`overflow ${label}`, overflow);
            // And what the page announced while it loaded and settled: no doubles, no assertive non-errors.
            reportAnnouncementProblems(`announcements ${label}`, announcements.filter((entry) => entry.label === `audit ${config.name}` && entry.at >= tState));
            if (violations.length === 0 && treeViolations.length === 0 && !overflow) clean++;
          } catch (error) {
            fail(`audit ${label}`, String(error.message ?? error).split('\n')[0]);
          }
        }
        log(`audit ${config.name}: ${clean}/${STATES.length} page states clean`);
      }),
    );
    log(`audit took ${((Date.now() - auditT0) / 1000).toFixed(0)}s`);
    // Anything announced outside a flow or a page state (the sign-ins) gets the same rules.
    reportAnnouncementProblems('announcements (whole run)', announcements);
    const hiddenOnes = announcements.filter((entry) => entry.hidden);
    log(`${announcements.length} announcements recorded, ${hiddenOnes.length} into regions hidden from assistive technology`);
    if (process.env.LIVE_SMOKE_VERBOSE) {
      for (const entry of announcements) log(`  ${entry.label} ${entry.politeness}${entry.hidden ? ' HIDDEN' : ''} ${entry.region}: ${entry.text.slice(0, 80)}`);
    }
  } finally {
    for (const context of contexts) await context.close().catch(() => {});
    await browser.close();
    server.close();
    await cleanup(admin, created).catch((error) => fail('cleanup', String(error.message ?? error)));
    if (builtHere) rmSync(distDir, { recursive: true, force: true });
  }
}

const started = Date.now();
main()
  .catch((error) => fail('live smoke crashed', String(error?.stack ?? error)))
  .finally(() => {
    const seconds = ((Date.now() - started) / 1000).toFixed(0);
    if (failures.length > 0) {
      console.error(`test:live failed after ${seconds}s:\n  - ${failures.join('\n  - ')}`);
      process.exit(1);
    }
    console.log(`test:live ok in ${seconds}s`);
  });
