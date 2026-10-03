/**
 * Layer 2 of the screen-reader checks (plan B19d): what the live smoke
 * (`scripts/live-smoke.mjs`) treats as a defect in what the page ANNOUNCES.
 *
 * A screen reader speaks the text that appears in a live region (`aria-live`,
 * `role=status|alert|log`, `<output>`). Two failure modes are invisible to axe
 * and to every unit test that looks at one component: the same sentence being
 * spoken twice (a toast plus an inline status, a banner plus a per-control
 * notice, a re-render that re-inserts the node), and an assertive interruption
 * for something that is not an error.
 *
 * Two halves, like `console-policy.mjs`:
 *  - `installLiveRegionObserver(win)`: injected into every page with
 *    `addInitScript` (so it must stay self-contained: no imports, no module-level
 *    helpers, it is serialised with `Function.prototype.toString`). Records
 *    every text ADDED to a live region.
 *  - `classifyAnnouncements(entries)`: pure; turns a log into violations. It has
 *    its own Vitest suite (`src/tests/live-announcements.test.ts`).
 *
 * What it models, honestly: the DOM mutations a browser exposes to assistive
 * technology as live-region events. It cannot know what NVDA, JAWS, VoiceOver or
 * TalkBack then choose to speak (they de-duplicate, queue and drop differently),
 * so "no double announcement here" means "the page itself never asks twice", not
 * "no screen reader ever says it twice".
 */

export const DOUBLE_ANNOUNCEMENT_WINDOW_MS = 1500;

/**
 * Injected into the page. Appends one entry per announcement to
 * `win.__liveAnnouncements` and hands it to `win.__liveAnnounce(entry)` when the
 * caller exposed one (Playwright's `exposeBinding`: the Node side keeps the log
 * across the full page loads this static MPA does on every navigation).
 *
 * @param {Window} [win]
 * @returns {{ log: object[], disconnect: () => void }}
 */
export function installLiveRegionObserver(win = window) {
  const doc = win.document;
  const log = (win.__liveAnnouncements = []);
  // One id per document: the classifier never compares announcements across page loads.
  const docId = Math.random().toString(36).slice(2, 10);
  const LIVE = '[aria-live],[role="status"],[role="alert"],[role="log"],output';

  const keys = new WeakMap();
  const lastText = new WeakMap();
  let nextKey = 1;

  const normalize = (text) => text.replace(/\s+/g, ' ').trim();

  /** 'polite' | 'assertive' | 'off', or null when the element is not a live region at all. */
  const politenessOf = (el) => {
    const live = el.getAttribute('aria-live');
    if (live === 'off' || live === 'polite' || live === 'assertive') return live;
    const role = el.getAttribute('role');
    if (role === 'alert') return 'assertive';
    if (role === 'status' || role === 'log') return 'polite';
    if (el.localName === 'output') return 'polite';
    return null;
  };

  /** The nearest live region around (or at) a node; an `aria-live="off"` one mutes everything inside it. */
  const regionOf = (node) => {
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el) {
      const politeness = politenessOf(el);
      if (politeness !== null) return politeness === 'off' ? null : el;
      el = el.parentElement;
    }
    return null;
  };

  const hiddenFromAT = (el) => {
    if (el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true') return true;
    const style = win.getComputedStyle ? win.getComputedStyle(el) : null;
    return Boolean(style && (style.display === 'none' || style.visibility === 'hidden'));
  };

  /** The text a screen reader would read: not what is hidden from it. Block boundaries become spaces. */
  const textOf = (node) => {
    if (node.nodeType === 3) return node.data;
    if (node.nodeType !== 1 || hiddenFromAT(node)) return '';
    let out = '';
    for (const child of node.childNodes) out += ` ${textOf(child)} `;
    return out;
  };

  const describe = (el) => {
    const parts = [el.localName];
    const role = el.getAttribute('role');
    const live = el.getAttribute('aria-live');
    const label = el.getAttribute('aria-label');
    if (role) parts.push(`[role=${role}]`);
    if (live) parts.push(`[aria-live=${live}]`);
    if (label) parts.push(`[aria-label="${label}"]`);
    // React's generated ids (`_r_0_`, `:r0:`) change on every render: they would only be noise.
    if (el.id && !/^(_r_|:r)/.test(el.id)) parts.push(`#${el.id}`);
    return parts.join('');
  };

  const keyOf = (el) => {
    if (!keys.has(el)) keys.set(el, nextKey++);
    return keys.get(el);
  };

  // Regions already on the page when the observer starts are known, with whatever they hold.
  for (const el of doc.querySelectorAll(LIVE)) {
    if (politenessOf(el) !== 'off') lastText.set(el, normalize(textOf(el)));
  }

  const onMutations = (records) => {
    /** @type {Map<Element, { added: string[], created: boolean }>} */
    const touched = new Map();
    const touch = (region, text, created) => {
      const info = touched.get(region) ?? { added: [], created: false };
      if (text) info.added.push(text);
      if (created) info.created = true;
      touched.set(region, info);
    };

    for (const record of records) {
      if (record.type === 'characterData') {
        const region = regionOf(record.target);
        if (region) touch(region, record.target.data, false);
        continue;
      }
      if (record.type !== 'childList') continue;
      const around = regionOf(record.target);
      if (around) touch(around, '', false);
      for (const added of record.addedNodes) {
        if (added.nodeType !== 1 && added.nodeType !== 3) continue;
        const region = regionOf(added);
        if (region) {
          touch(region, textOf(added), region === added);
        } else if (added.nodeType === 1) {
          // A subtree with live regions in it, inserted where there was none.
          for (const inner of added.querySelectorAll(LIVE)) {
            const innerRegion = regionOf(inner);
            if (innerRegion) touch(innerRegion, textOf(inner), innerRegion === inner);
          }
        }
      }
    }

    for (const [region, info] of touched) {
      const known = lastText.has(region);
      const before = lastText.get(region) ?? '';
      const after = normalize(textOf(region));
      lastText.set(region, after);
      // A re-render that leaves the text as it was, or a region that emptied, says nothing.
      if (after === before || after === '') continue;
      const added = normalize(info.added.join(' '));
      // Text that was added to a NESTED region is that region's announcement; the region around it only
      // changed as a consequence (a toast root inside the toast viewport) and is not a second one.
      if (added === '') continue;
      const atomic = region.getAttribute('aria-atomic') === 'true';
      const entry = {
        at: Date.now(),
        doc: docId,
        politeness: politenessOf(region),
        region: describe(region),
        regionKey: keyOf(region),
        text: atomic || !added ? after : added,
        // A live region that arrives already holding its text, with nothing live around it, is the pattern
        // assistive technology announces least reliably; informational, the classifier does not fail on it.
        inserted: !known && info.created && !(region.parentElement && regionOf(region.parentElement)),
      };
      log.push(entry);
      if (typeof win.__liveAnnounce === 'function') {
        try {
          const sent = win.__liveAnnounce(entry);
          if (sent && typeof sent.catch === 'function') sent.catch(() => {});
        } catch {
          // The Node side going away must never break the page.
        }
      }
    }
  };

  const observer = new win.MutationObserver(onMutations);
  observer.observe(doc, { childList: true, subtree: true, characterData: true });
  return { log, disconnect: () => observer.disconnect() };
}

/** Lower-case, whitespace folded, curly quotes straightened, trailing punctuation dropped. */
export function normalizeAnnouncement(text) {
  return String(text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/[.!?…:;,\s]+$/u, '');
}

// The product's own error vocabulary (its toasts, form errors and `OFFLINE_WRITE_MESSAGE`). A heuristic on
// purpose: an assertive announcement that reads like none of these is worth a human look, and the unit
// tests pin both the sentences it must accept and the confirmations it must not.
const ERROR_WORDS =
  /\b(error|errors|fail|fails|failed|failure|couldn['’]?t|could not|can['’]?t|cannot|can not|unable|invalid|incorrect|wrong|denied|not allowed|not found|expired|try again|must|required|offline|not saved|didn['’]?t|did not|doesn['’]?t|does not|won['’]?t)\b/i;

export function isErrorText(text) {
  return ERROR_WORDS.test(String(text ?? ''));
}

/**
 * @typedef {{ at: number, doc?: string, politeness: 'polite' | 'assertive', region: string, regionKey?: number, text: string, inserted?: boolean }} Announcement
 * @typedef {{ kind: 'repeat' | 'two-regions' | 'assertive-non-error', text: string, regions: string[], message: string }} Violation
 */

const seconds = (ms) => `${(ms / 1000).toString().replace(/\.0$/, '')} s`;

/**
 * @param {Announcement[]} entries
 * @param {{ windowMs?: number }} [options]
 * @returns {Violation[]}
 */
export function classifyAnnouncements(entries, { windowMs = DOUBLE_ANNOUNCEMENT_WINDOW_MS } = {}) {
  const spoken = entries
    .map((entry) => ({ ...entry, norm: normalizeAnnouncement(entry.text) }))
    .filter((entry) => entry.norm !== '')
    .sort((a, b) => a.at - b.at);
  /** @type {Violation[]} */
  const violations = [];

  for (const entry of spoken) {
    if (entry.politeness === 'assertive' && !isErrorText(entry.text)) {
      violations.push({
        kind: 'assertive-non-error',
        text: entry.text,
        regions: [entry.region],
        message: `assertive announcement that is not an error: "${entry.text}" (${entry.region}); only errors may interrupt`,
      });
    }
  }

  // Group by document and text, then split each group into bursts (each gap within the window).
  const groups = new Map();
  for (const entry of spoken) {
    const key = `${entry.doc ?? ''}\u0000${entry.norm}`;
    groups.set(key, [...(groups.get(key) ?? []), entry]);
  }
  for (const group of groups.values()) {
    let burst = [group[0]];
    const flush = () => {
      if (burst.length > 1) violations.push(describeBurst(burst, windowMs));
    };
    for (const entry of group.slice(1)) {
      if (entry.at - burst[burst.length - 1].at <= windowMs) {
        burst.push(entry);
      } else {
        flush();
        burst = [entry];
      }
    }
    flush();
  }
  return violations;
}

function describeBurst(burst, windowMs) {
  const text = burst[0].text.trim();
  const regionKeys = new Set(burst.map((entry) => entry.regionKey ?? entry.region));
  const regions = [...new Set(burst.map((entry) => entry.region))];
  const times = burst.length === 2 ? 'twice' : `${burst.length} times`;
  if (regionKeys.size > 1) {
    return {
      kind: 'two-regions',
      text,
      regions,
      message: `"${text}" announced by ${regionKeys.size} different live regions within ${seconds(windowMs)}: ${regions.join(' and ')}`,
    };
  }
  return {
    kind: 'repeat',
    text,
    regions,
    message: `"${text}" announced ${times} within ${seconds(windowMs)} by ${regions[0]}`,
  };
}

/**
 * The announcements whose text matches `pattern`, optionally of one politeness
 * and/or one document: how a flow asserts "exactly one polite 'saved'".
 *
 * @param {Announcement[]} entries
 * @param {RegExp} pattern
 * @param {{ politeness?: string, doc?: string }} [filter]
 */
export function announcementsMatching(entries, pattern, { politeness, doc } = {}) {
  return entries.filter(
    (entry) =>
      pattern.test(entry.text) &&
      (politeness === undefined || entry.politeness === politeness) &&
      (doc === undefined || entry.doc === doc),
  );
}
