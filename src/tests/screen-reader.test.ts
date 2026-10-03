// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { readAll, speakFocused, spokenWith, trackAnnouncements } from './screen-reader';

/**
 * The layer-1 helpers themselves (plan B19d): the virtual screen reader runs under
 * this repo's Vitest + jsdom + React 19 + Testing Library stack, reads a document
 * end to end, finds the element that has focus, and the announcement observer sees
 * live-region text. If the package ever stops working with that stack, this is the
 * test that says so, before the surface suites do.
 */
afterEach(() => {
  document.body.innerHTML = '';
});

describe('screen-reader helpers', () => {
  it('reads a document once from top to bottom', async () => {
    document.body.innerHTML = '<main><h1>Expenses</h1><button type="button">Save</button></main>';
    const phrases = await readAll();
    expect(spokenWith(phrases, 'heading', 'Expenses', 'level 1')).toBe(true);
    expect(spokenWith(phrases, 'button', 'Save')).toBe(true);
    expect(phrases.at(-1)).toMatch(/end of document/);
  });

  it('speaks the focused element with its name, role, state and description', async () => {
    document.body.innerHTML =
      '<label for="e">Email</label><input id="e" aria-invalid="true" aria-describedby="m"><p id="m">Enter a valid email address.</p>';
    document.getElementById('e')!.focus();
    const phrase = await speakFocused();
    expect(phrase).toContain('Email');
    expect(phrase).toContain('Enter a valid email address.');
    expect(phrase).toContain('invalid');
  });

  it('says so when the focused element is hidden from assistive technology', async () => {
    document.body.innerHTML = '<div aria-hidden="true"><button id="b">Hidden</button></div><button>Visible</button>';
    document.getElementById('b')!.focus();
    await expect(speakFocused()).rejects.toThrow(/not in the accessibility tree/);
  });

  it('sees text added to a live region, once', async () => {
    const announcements = await trackAnnouncements();
    try {
      document.body.innerHTML = '<div role="status" id="s"></div>';
      await announcements.settled();
      document.getElementById('s')!.textContent = 'Saved';
      const log = await announcements.settled();
      expect(log.map((entry) => entry.text)).toEqual(['Saved']);
      expect(announcements.problems()).toEqual([]);
    } finally {
      announcements.stop();
    }
  });
});
