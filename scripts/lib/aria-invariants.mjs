/**
 * Layer 3 of the screen-reader checks (plan B19d): structural invariants over
 * Chromium's accessibility tree, as Playwright reports it
 * (`page.ariaSnapshotJSON()`: `{ role, name?, level?, text?, children? }` nodes
 * and plain strings for static text; `page.accessibility.snapshot()` no longer
 * exists in Playwright 1.5x).
 *
 * Deliberately NOT a golden snapshot: copy, layout and order change all the time
 * and a snapshot diff would train people to accept it. These are the rules whose
 * violation is a person getting stuck, whatever the page looks like:
 *
 *  - one `main` landmark and one level-1 heading (skip links and landmark
 *    navigation, the page's title);
 *  - every button, link and form field has an accessible name;
 *  - several `navigation` landmarks are each labelled, with different labels;
 *  - every dialog has a name;
 *  - nothing that has focus is inside an `aria-hidden` or inert subtree (the
 *    focused element would be announced as nothing, or not at all).
 *
 * `checkAriaInvariants` is pure and has its own Vitest suite
 * (`src/tests/aria-invariants.test.ts`). `readFocusFacts` is the one fact the
 * snapshot cannot carry (hidden nodes are not in it), read from the DOM with
 * `page.evaluate`; it is self-contained for that reason.
 *
 * What it cannot see: whether a name is a GOOD name ("Button 3" passes), reading
 * order, or anything about how a particular screen reader renders the tree.
 */

export const INVARIANTS = [
  'one-main',
  'one-h1',
  'named-controls',
  'distinct-navigation',
  'named-dialogs',
  'focus-visible-to-at',
];

/** Roles that are a control a person operates, and so must be nameable. */
const NAMED_ROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'spinbutton',
  'slider',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
]);

const DIALOG_ROLES = new Set(['dialog', 'alertdialog']);

const hasName = (node) => typeof node.name === 'string' && node.name.trim() !== '';
const isNode = (node) => node !== null && typeof node === 'object' && typeof node.role === 'string';
const label = (node) => (hasName(node) ? `${node.role} "${node.name.trim()}"` : node.role);

/** Every node with the chain of ancestors that leads to it. */
function walk(tree) {
  const found = [];
  const visit = (node, ancestors) => {
    if (!isNode(node)) return;
    found.push({ node, path: [...ancestors, label(node)].join(' > ') });
    for (const child of node.children ?? []) visit(child, [...ancestors, label(node)]);
  };
  for (const root of Array.isArray(tree) ? tree : [tree]) visit(root, []);
  return found;
}

/**
 * @param {object | Array<object | string>} tree  `page.ariaSnapshotJSON()` output
 * @param {{ focus?: { description: string, hiddenBy: string | null } | null }} [facts]  from `readFocusFacts`
 * @returns {{ invariant: string, message: string }[]}
 */
export function checkAriaInvariants(tree, { focus = null } = {}) {
  const nodes = walk(tree);
  const violations = [];
  const fail = (invariant, message) => violations.push({ invariant, message });

  // A modal dialog hides the page behind it from assistive technology on purpose, so with one open
  // the page's own landmarks may be gone: "at most one" instead of "exactly one".
  const modalOpen = nodes.some(({ node }) => DIALOG_ROLES.has(node.role));
  const minimum = modalOpen ? 0 : 1;

  const mains = nodes.filter(({ node }) => node.role === 'main');
  if (mains.length < minimum || mains.length > 1) {
    fail('one-main', `${mains.length} main landmarks (expected ${modalOpen ? 'at most one while a dialog is open' : 'exactly one'})`);
  }

  const h1s = nodes.filter(({ node }) => node.role === 'heading' && node.level === 1);
  if (h1s.length < minimum || h1s.length > 1) {
    const which = h1s.map(({ node }) => `"${(node.name ?? '').trim()}"`).join(', ');
    fail('one-h1', `${h1s.length} level-1 headings (expected ${modalOpen ? 'at most one while a dialog is open' : 'exactly one'})${which ? `: ${which}` : ''}`);
  }

  for (const { node, path } of nodes) {
    if (NAMED_ROLES.has(node.role) && !hasName(node)) fail('named-controls', `${node.role} has no accessible name (${path})`);
  }

  const navigations = nodes.filter(({ node }) => node.role === 'navigation');
  if (navigations.length > 1) {
    for (const { path, node } of navigations) {
      if (!hasName(node)) fail('distinct-navigation', `navigation has no label while the page has ${navigations.length} (${path}): give each a distinct label`);
    }
    const seen = new Map();
    for (const { node } of navigations) {
      if (!hasName(node)) continue;
      const name = node.name.trim();
      seen.set(name, (seen.get(name) ?? 0) + 1);
    }
    for (const [name, count] of seen) {
      if (count > 1) fail('distinct-navigation', `${count} navigation landmarks share the label "${name}": give each a distinct label`);
    }
  }

  for (const { node, path } of nodes) {
    if (DIALOG_ROLES.has(node.role) && !hasName(node)) fail('named-dialogs', `${node.role} has no accessible name (${path})`);
  }

  if (focus && focus.hiddenBy) {
    fail('focus-visible-to-at', `focus is on ${focus.description}, inside ${focus.hiddenBy}: assistive technology cannot reach what has focus`);
  }

  return violations;
}

/**
 * Runs in the page (`page.evaluate(readFocusFacts)`), so it stays self-contained.
 * Null when nothing but the document has focus.
 *
 * @param {Window} [win]
 * @returns {{ description: string, hiddenBy: string | null } | null}
 */
export function readFocusFacts(win = window) {
  const doc = win.document;
  const el = doc.activeElement;
  if (!el || el === doc.body || el === doc.documentElement) return null;

  const describeElement = (node) => {
    let out = node.localName;
    if (node.id && !/^(_r_|:r)/.test(node.id)) out += `#${node.id}`;
    return out;
  };
  const nameOf = (node) => {
    const labelled = node.getAttribute('aria-labelledby');
    const fromLabelledBy = labelled
      ? labelled
          .split(/\s+/)
          .map((id) => doc.getElementById(id)?.textContent ?? '')
          .join(' ')
      : '';
    const raw =
      node.getAttribute('aria-label') ||
      fromLabelledBy ||
      node.textContent ||
      node.getAttribute('placeholder') ||
      node.getAttribute('title') ||
      '';
    return raw.replace(/\s+/g, ' ').trim().slice(0, 60);
  };

  const name = nameOf(el);
  const description = `${el.getAttribute('role') || el.localName}${name ? ` "${name}"` : ''}`;

  for (let node = el; node; node = node.parentElement) {
    if (node.getAttribute('aria-hidden') === 'true') return { description, hiddenBy: `${describeElement(node)}[aria-hidden="true"]` };
    if (node.hasAttribute('inert')) return { description, hiddenBy: `${describeElement(node)}[inert]` };
  }
  return { description, hiddenBy: null };
}
