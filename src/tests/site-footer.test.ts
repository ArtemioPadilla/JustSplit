import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B6b: app pages replace the header's Home/About/Help with the six app
 * sections, so About and Help (which a signed-in user still needs, Help most
 * of all) move to the footer that every page carries. Plain links, no JS.
 */
const src = readFileSync(resolve(__dirname, '..', 'components/common/SiteFooter.astro'), 'utf8');

describe('SiteFooter.astro (plan B6b)', () => {
  it('links About and Help through withBase', () => {
    expect(src).toMatch(/withBase\(['"]\/about\/?['"]\)/);
    expect(src).toMatch(/withBase\(['"]\/help\/?['"]\)/);
  });
});
