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
 *  2. Serves it with the shared static server, with GitHub Pages' 404.html
 *     fallback (the dynamic `/expenses/<id>` routes only exist through it).
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
 *  fails the run (scripts/lib/console-policy.mjs: a two-entry allowlist).
 */
import { rmSync } from 'node:fs';
import { CONFIGS } from './lib/a11y-configs.mjs';
import { launchChromium } from './lib/browser.mjs';
import { startStaticServer } from './lib/static-server.mjs';
import { buildDist, cleanup, createAdmin, PASSWORD, readStack, seed } from './lib/live-stack.mjs';
import {
  axeViolations,
  bodyText,
  isolateExternalRequests,
  overflowOf,
  settle,
  waitForText,
  watchConsole,
} from './lib/live-audit.mjs';

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

/** One flow. A failure is recorded (with where the page was) and the run continues with the next one. */
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
    contexts.push(context);
    return context;
  }

  /** Real sign-in through /auth/signin/, exactly as a person does it. */
  async function signIn(user) {
    const context = await newContext(user.name);
    const page = await context.newPage();
    await page.goto(url('/auth/signin/'), { waitUntil: 'networkidle' });
    await page.locator('#login-email').fill(user.email);
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
      await openRecord();
      // By name, as before: toasts used to be role=dialog too (Base UI), so a bare getByRole('dialog') was ambiguous; since B19b they are role=status/alert, and the name still pins the right dialog.
      const dialog = a.getByRole('dialog', { name: 'Record payment' });
      // Escape from the currency combobox (popup closed) must still dismiss the dialog.
      await dialog.getByRole('combobox', { name: 'Payment currency' }).focus();
      await a.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
      await openRecord();
      await dialog.getByLabel('Amount').fill('10.00');
      await dialog.getByRole('button', { name: 'Save payment' }).click();
      await dialog.waitFor({ state: 'hidden' });
      await waitForText(a, /You owe Beto Smoke\s+USD 20\.00/);

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
      await a.getByRole('dialog', { name: 'Undo this payment?' }).getByRole('button', { name: 'Undo payment', exact: true }).click();
      await eventually(
        'the settlement to be gone',
        async () => (await admin.from('settlements').select('id').eq('from_user_id', ana.id).eq('to_user_id', beto.id)).data,
        (rows) => rows.length === 0,
      );
      await a.getByRole('tab', { name: 'Pending' }).click();
      await waitForText(a, /You owe Beto Smoke\s+USD 30\.00/);
      await goto(b, '/settlements');
      await waitForText(b, /Ana Smoke owes you\s+USD 30\.00/);
    });

    // ── 3. Create an expense; see it in the list and in the detail view ──────
    await flow('expenses: create, list, detail', a, async () => {
      await goto(a, '/expenses/new');
      await a.locator('#expense-form-description').fill('Smoke lunch');
      await a.locator('#expense-form-amount').fill('60');
      await a.getByRole('checkbox', { name: 'Beto Smoke' }).check();
      await a.getByRole('button', { name: 'Save expense' }).click();
      await a.waitForURL((u) => /\/expenses\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const id = idFrom(a, '/expenses');

      const saved = await eventually('the expense row', () => row('expenses', id), Boolean);
      assert(Number(saved.amount) === 60 && saved.currency === 'USD', `wrong expense ${JSON.stringify(saved)}`);
      assert(saved.paid_by === ana.id && saved.created_by === ana.id, 'the payer must be the signed-in user');
      assert(saved.member_ids.includes(beto.id) && saved.member_ids.includes(ana.id), 'both people must be on the expense');
      assert(saved.splits.reduce((sum, split) => sum + Number(split.amount), 0) === 60, 'the splits must add up to the amount');
      await waitForText(a, /Smoke lunch[\s\S]*USD 60\.00[\s\S]*Split among \(2\)[\s\S]*USD 30\.00/);

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
      await a.getByRole('button', { name: 'Create event' }).click();
      await a.waitForURL((u) => /\/events\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const eventId = idFrom(a, '/events');
      const event = await eventually('the event row', () => row('events', eventId), Boolean);
      assert(event.name === 'Smoke weekend' && event.created_by === ana.id, `wrong event ${JSON.stringify(event)}`);
      assert(event.member_ids.includes(ana.id) && event.member_ids.includes(beto.id), 'the friend must be a member');
      assert(event.group_id === null && event.description === null && event.end_date === null, 'optional columns stay NULL');
      await waitForText(a, /Smoke weekend/);

      await settle(a);
      await a.getByRole('link', { name: 'Add expense' }).click();
      await a.waitForURL((u) => u.pathname.endsWith('/expenses/new') && u.search.includes(eventId));
      await settle(a);
      await a.locator('#expense-form-description').fill('Smoke dinner');
      await a.locator('#expense-form-amount').fill('90');
      await a.getByRole('button', { name: 'Save expense' }).click();
      await a.waitForURL((u) => /\/expenses\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
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
      await a.getByRole('button', { name: 'Create group' }).click();
      await a.waitForURL((u) => /\/groups\/[0-9a-f-]{36}\/?$/.test(u.pathname), { timeout: 20_000 });
      const group = await eventually('the group row', () => row('expense_groups', idFrom(a, '/groups')), Boolean);
      assert(group.name === 'Smoke group' && group.created_by === ana.id, `wrong group ${JSON.stringify(group)}`);
      assert(group.member_ids.includes(beto.id) && group.admin_ids.length === 1 && group.admin_ids[0] === ana.id, 'creator is the only admin');
      await waitForText(a, /Smoke group[\s\S]*Members \(2\)/);
    });

    // ── 6. Friend request: Ana sends, Cami accepts ───────────────────────────
    await flow('friends: send a request and accept it as the second user', a, async () => {
      await goto(a, '/friends');
      await a.locator('#add-friend-email').fill(cami.email);
      await a.getByRole('button', { name: 'Send request' }).click();
      const pending = await eventually(
        'the pending friendship',
        async () => (await admin.from('friendships').select('*').contains('users', [ana.id, cami.id])).data,
        (rows) => rows.length === 1,
      );
      assert(pending[0].status === 'pending' && pending[0].requested_by === ana.id, `wrong friendship ${JSON.stringify(pending[0])}`);

      await goto(c, '/friends');
      await waitForText(c, /Friend requests\s+[A-Z]{2}\s+Ana Smoke/);
      await c.getByRole('button', { name: 'Accept' }).click();
      await eventually(
        'the accepted friendship',
        async () => (await admin.from('friendships').select('status').eq('id', pending[0].id).maybeSingle()).data?.status,
        (status) => status === 'accepted',
      );

      await goto(a, '/friends');
      await waitForText(a, /Friends \(\d\)[\s\S]*Cami Smoke/);
    });

    // ── 7. Profile: edit the name ────────────────────────────────────────────
    await flow('profile: edit the name', a, async () => {
      await goto(a, '/profile');
      await a.locator('#profile-display-name').fill('Ana Renamed');
      await a.getByRole('button', { name: 'Save changes' }).click();
      await eventually(
        'the renamed profile',
        async () => (await admin.from('profiles').select('name').eq('id', ana.id).maybeSingle()).data?.name,
        (name) => name === 'Ana Renamed',
      );
      await goto(a, '/profile');
      assert((await a.locator('#profile-display-name').inputValue()) === 'Ana Renamed', 'the new name must survive a reload');
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
          try {
            if (state.before) await state.before(page);
            await goto(page, state.path);
            await waitForText(page, state.ready);
            if (state.prepare) await state.prepare(page);
            if (state.after) await waitForText(page, state.after);
            const violations = await axeViolations(page, { transition: state.transition });
            for (const violation of violations) fail(`axe ${label}`, violation);
            const overflow = config.checkOverflow ? await overflowOf(page) : null;
            if (overflow) fail(`overflow ${label}`, overflow);
            if (violations.length === 0 && !overflow) clean++;
          } catch (error) {
            fail(`audit ${label}`, String(error.message ?? error).split('\n')[0]);
          }
        }
        log(`audit ${config.name}: ${clean}/${STATES.length} page states clean`);
      }),
    );
    log(`audit took ${((Date.now() - auditT0) / 1000).toFixed(0)}s`);
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
