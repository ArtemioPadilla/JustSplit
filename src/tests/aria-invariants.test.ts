// @vitest-environment jsdom
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * Plan B19d, layer 3: invariants over Chromium's accessibility tree
 * (`page.ariaSnapshotJSON()`), run by the live smoke on every signed-in page
 * state and by `check:a11y` on every static page. The judgement is a pure
 * function over the snapshot (`scripts/lib/aria-invariants.mjs`), unit-tested
 * here against fixture trees that each break exactly one rule; no golden snapshot
 * is compared, so a copy or layout change never fails it, only a structural defect.
 *
 * Behavior contracts:
 *  - exactly one `main` landmark and one level-1 heading;
 *  - every button, link and form field has a non-empty accessible name;
 *  - two or more `navigation` landmarks each carry a label and the labels differ;
 *  - every dialog has a name;
 *  - nothing that has focus sits inside an `aria-hidden` (or inert) subtree;
 *  - a modal dialog legitimately hides the page behind it, so with one open the
 *    page-structure rules (main, h1, navigation) relax to "at most one".
 */
type Node = string | { role: string; name?: string; level?: number; text?: string; children?: Node[]; [k: string]: unknown };
interface Violation {
  invariant: string;
  message: string;
}
interface FocusFacts {
  description: string;
  hiddenBy: string | null;
}
interface Module {
  checkAriaInvariants: (tree: Node | Node[], facts?: { focus?: FocusFacts | null }) => Violation[];
  readFocusFacts: (win?: Window) => FocusFacts | null;
  INVARIANTS: string[];
}
const load = async () =>
  (await import(/* @vite-ignore */ pathToFileURL(resolve(__dirname, '../../scripts/lib/aria-invariants.mjs')).href)) as Module;

const page = (...extra: Node[]): Node[] => [
  { role: 'link', name: 'Skip to main content', url: '#main' },
  { role: 'banner', children: [{ role: 'navigation', name: 'Main', children: [{ role: 'link', name: 'Home' }] }] },
  {
    role: 'main',
    children: [
      { role: 'heading', name: 'Expenses', level: 1 },
      { role: 'heading', name: 'Recent', level: 2 },
      'Some static text',
      { role: 'textbox', name: 'Description' },
      { role: 'button', name: 'Save expense' },
      ...extra,
    ],
  },
  { role: 'contentinfo', children: [{ role: 'navigation', name: 'Footer', children: [{ role: 'link', name: 'About' }] }] },
];

const names = (violations: Violation[]) => violations.map((v) => v.invariant);

describe('a well-formed page', () => {
  it('has no violations', async () => {
    const { checkAriaInvariants } = await load();
    expect(checkAriaInvariants(page())).toEqual([]);
  });

  it('accepts a single root node as well as a list, and strings among the children', async () => {
    const { checkAriaInvariants } = await load();
    expect(checkAriaInvariants({ role: 'main', children: ['x', { role: 'heading', name: 'T', level: 1 }] })).toEqual([]);
  });

  it('lists every invariant it checks', async () => {
    const { INVARIANTS } = await load();
    expect(INVARIANTS).toEqual(['one-main', 'one-h1', 'named-controls', 'distinct-navigation', 'named-dialogs', 'focus-visible-to-at']);
  });
});

describe('landmarks and the page heading', () => {
  it('fails a page with no main landmark, and with two', async () => {
    const { checkAriaInvariants } = await load();
    const none = page().filter((node) => typeof node === 'string' || node.role !== 'main');
    expect(names(checkAriaInvariants(none))).toContain('one-main');
    const two = [...page(), { role: 'main', children: [] }];
    const found = checkAriaInvariants(two);
    expect(names(found)).toContain('one-main');
    expect(found.find((v) => v.invariant === 'one-main')!.message).toMatch(/2 main landmarks/);
  });

  it('fails a page with no h1, with two, and does not count an h2', async () => {
    const { checkAriaInvariants } = await load();
    const h2Only: Node[] = [{ role: 'main', children: [{ role: 'heading', name: 'T', level: 2 }] }];
    expect(names(checkAriaInvariants(h2Only))).toEqual(['one-h1']);
    const two: Node[] = [
      {
        role: 'main',
        children: [
          { role: 'heading', name: 'A', level: 1 },
          { role: 'heading', name: 'B', level: 1 },
        ],
      },
    ];
    const found = checkAriaInvariants(two);
    expect(names(found)).toEqual(['one-h1']);
    expect(found[0]!.message).toMatch(/2 level-1 headings/);
    expect(found[0]!.message).toContain('"A"');
    expect(found[0]!.message).toContain('"B"');
  });

  it('with a modal dialog open the page behind it may be absent, but never doubled', async () => {
    const { checkAriaInvariants } = await load();
    const modal: Node[] = [
      { role: 'dialog', name: 'Record payment', children: [{ role: 'heading', name: 'Record payment', level: 2 }, { role: 'button', name: 'Cancel' }] },
    ];
    expect(checkAriaInvariants(modal)).toEqual([]);
    expect(names(checkAriaInvariants([...page(), ...modal, { role: 'main', children: [] }]))).toContain('one-main');
  });
});

describe('accessible names', () => {
  it.each(['button', 'link', 'textbox', 'searchbox', 'combobox', 'checkbox', 'radio', 'switch', 'spinbutton', 'slider', 'tab', 'menuitem'])(
    'fails a %s with no name, and says where it is',
    async (role) => {
      const { checkAriaInvariants } = await load();
      const found = checkAriaInvariants(page({ role, children: [] }));
      const unnamed = found.filter((v) => v.invariant === 'named-controls');
      expect(unnamed).toHaveLength(1);
      expect(unnamed[0]!.message).toContain(role);
      expect(unnamed[0]!.message).toContain('main');
    },
  );

  it('treats an empty or whitespace name as no name', async () => {
    const { checkAriaInvariants } = await load();
    expect(names(checkAriaInvariants(page({ role: 'button', name: '' })))).toEqual(['named-controls']);
    expect(names(checkAriaInvariants(page({ role: 'link', name: '   ' })))).toEqual(['named-controls']);
  });

  it('does not ask for a name from roles that do not need one', async () => {
    const { checkAriaInvariants } = await load();
    expect(checkAriaInvariants(page({ role: 'paragraph', text: 'x' }, { role: 'list', children: [{ role: 'listitem', text: 'x' }] }))).toEqual([]);
  });

  it('finds an unnamed control deep inside a dialog', async () => {
    const { checkAriaInvariants } = await load();
    const tree = page({ role: 'dialog', name: 'Edit', children: [{ role: 'form', children: [{ role: 'button' }] }] });
    const found = checkAriaInvariants(tree).filter((v) => v.invariant === 'named-controls');
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('dialog "Edit" > form > button');
  });
});

describe('navigation landmarks', () => {
  it('lets a single unlabeled navigation be', async () => {
    const { checkAriaInvariants } = await load();
    const one: Node[] = [{ role: 'main', children: [{ role: 'heading', name: 'T', level: 1 }, { role: 'navigation', children: [] }] }];
    expect(checkAriaInvariants(one)).toEqual([]);
  });

  it('fails two navigations when either has no label', async () => {
    const { checkAriaInvariants } = await load();
    const tree = page({ role: 'navigation', children: [] });
    const found = checkAriaInvariants(tree).filter((v) => v.invariant === 'distinct-navigation');
    expect(found.length).toBeGreaterThan(0);
    expect(found[0]!.message).toMatch(/label/);
  });

  it('fails two navigations with the same label', async () => {
    const { checkAriaInvariants } = await load();
    const tree = page({ role: 'navigation', name: 'Main', children: [] });
    const found = checkAriaInvariants(tree).filter((v) => v.invariant === 'distinct-navigation');
    expect(found).toHaveLength(1);
    expect(found[0]!.message).toContain('"Main"');
  });
});

describe('dialogs', () => {
  it.each(['dialog', 'alertdialog'])('fails a %s with no name', async (role) => {
    const { checkAriaInvariants } = await load();
    const found = checkAriaInvariants([{ role, children: [{ role: 'button', name: 'OK' }] }]);
    expect(names(found)).toEqual(['named-dialogs']);
  });

  it('accepts a named dialog', async () => {
    const { checkAriaInvariants } = await load();
    expect(checkAriaInvariants([{ role: 'alertdialog', name: 'Delete this expense?', children: [{ role: 'button', name: 'Delete' }] }])).toEqual([]);
  });
});

describe('focus inside aria-hidden', () => {
  it('fails when the focused element sits in an aria-hidden subtree', async () => {
    const { checkAriaInvariants } = await load();
    const found = checkAriaInvariants(page(), { focus: { description: 'button "Dismiss"', hiddenBy: 'div[aria-hidden="true"]' } });
    expect(names(found)).toEqual(['focus-visible-to-at']);
    expect(found[0]!.message).toContain('button "Dismiss"');
    expect(found[0]!.message).toContain('aria-hidden');
  });

  it('is fine when focus is visible to assistive technology, or nothing has focus', async () => {
    const { checkAriaInvariants } = await load();
    expect(checkAriaInvariants(page(), { focus: { description: 'button "Save"', hiddenBy: null } })).toEqual([]);
    expect(checkAriaInvariants(page(), { focus: null })).toEqual([]);
    expect(checkAriaInvariants(page())).toEqual([]);
  });
});

describe('readFocusFacts (runs in the page)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('reports nothing when the document body has focus', async () => {
    const { readFocusFacts } = await load();
    expect(readFocusFacts(window)).toBeNull();
  });

  it('describes a focused control that nothing hides', async () => {
    const { readFocusFacts } = await load();
    document.body.innerHTML = '<main><button id="go">Save</button></main>';
    document.getElementById('go')!.focus();
    expect(readFocusFacts(window)).toMatchObject({ hiddenBy: null, description: expect.stringContaining('Save') });
  });

  it('names the aria-hidden ancestor of a focused control', async () => {
    const { readFocusFacts } = await load();
    document.body.innerHTML = '<div id="toast" aria-hidden="true"><button id="x" aria-label="Dismiss notification">x</button></div>';
    document.getElementById('x')!.focus();
    const facts = readFocusFacts(window)!;
    expect(facts.hiddenBy).toContain('aria-hidden');
    expect(facts.hiddenBy).toContain('toast');
    expect(facts.description).toContain('Dismiss notification');
  });

  it('names an inert ancestor too', async () => {
    const { readFocusFacts } = await load();
    document.body.innerHTML = '<div inert><input id="i" aria-label="Amount" /></div>';
    const input = document.getElementById('i') as HTMLInputElement;
    input.focus();
    // jsdom does not implement inert focus-blocking; the ancestor walk is what is under test.
    Object.defineProperty(document, 'activeElement', { configurable: true, get: () => input });
    try {
      expect(readFocusFacts(window)!.hiddenBy).toContain('inert');
    } finally {
      Reflect.deleteProperty(document, 'activeElement');
    }
  });

  it('is self-contained, as page.evaluate serialises it', async () => {
    const { readFocusFacts } = await load();
    const standalone = (0, eval)(`(${readFocusFacts.toString()})`) as Module['readFocusFacts'];
    document.body.innerHTML = '<div aria-hidden="true"><a id="l" href="#x">Link</a></div>';
    document.getElementById('l')!.focus();
    expect(standalone(window)!.hiddenBy).toContain('aria-hidden');
  });
});
