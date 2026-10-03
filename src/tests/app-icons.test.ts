import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Plan B20b: every app icon is a render of the vector trace of the JustSplit
 * logo (`public/icons/logo-source.svg`, plus `logo-maskable.svg` for the
 * full-bleed variants), written by `npm run icons` (`scripts/render-icons.mjs`).
 * These tests read the committed files back: real pixel sizes from the PNG
 * headers, the ICO directory, and the SVGs being vector.
 */
const ROOT = resolve(__dirname, '../../');
const pub = (path: string) => resolve(ROOT, 'public', path);
const read = (path: string) => readFileSync(pub(path));

/** IHDR is always the first chunk: width/height at bytes 16..24, bit depth 24, colour type 25. */
function png(path: string) {
  const bytes = read(path);
  expect(bytes.subarray(0, 8).toString('hex'), `${path} is not a PNG`).toBe('89504e470d0a1a0a');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), colorType: bytes[25] };
}

const RASTER_ICONS: [path: string, size: number][] = [
  ['apple-touch-icon.png', 180],
  ['icons/pwa-192.png', 192],
  ['icons/pwa-512.png', 512],
  ['icons/pwa-maskable-512.png', 512],
];

describe('raster icons (B20b)', () => {
  it.each(RASTER_ICONS)('%s is %i x %i px', (path, size) => {
    expect(png(path)).toMatchObject({ width: size, height: size });
  });

  it('apple-touch-icon.png has no alpha channel (iOS ignores alpha and paints it black)', () => {
    // PNG colour type 2 = truecolour, no alpha; 6 = truecolour + alpha.
    expect(png('apple-touch-icon.png').colorType).toBe(2);
  });

  it('keeps the PNGs small', () => {
    for (const [path] of RASTER_ICONS) expect(statSync(pub(path)).size, path).toBeLessThan(20_000);
  });
});

describe('favicon.ico (B20b)', () => {
  const ico = read('favicon.ico');
  const isIco = ico.length >= 6 && ico.readUInt16LE(0) === 0 && ico.readUInt16LE(2) === 1;
  // Parsed only for a real ICO: the file used to be a lone PNG with an .ico name,
  // and a header read of that must fail an assertion, not crash the suite.
  const entries = !isIco
    ? []
    : Array.from({ length: ico.readUInt16LE(4) }, (_, i) => {
        const at = 6 + i * 16;
        return {
          width: ico[at] || 256,
          height: ico[at + 1] || 256,
          size: ico.readUInt32LE(at + 8),
          offset: ico.readUInt32LE(at + 12),
        };
      });

  it('is an ICO container (reserved 0, type 1), not a PNG with an .ico name', () => {
    expect(isIco).toBe(true);
  });

  it('lists 16, 32 and 48 px images', () => {
    expect(entries.map((e) => `${e.width}x${e.height}`)).toEqual(['16x16', '32x32', '48x48']);
  });

  it('embeds a PNG of the listed size for every entry', () => {
    expect(entries).not.toHaveLength(0);
    for (const entry of entries) {
      const image = ico.subarray(entry.offset, entry.offset + entry.size);
      expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([entry.width, entry.height]);
    }
  });
});

describe('vector sources (B20b)', () => {
  const NAVY = '#0f3769';

  it('favicon.svg is a vector under 2 kB, with no embedded raster', () => {
    const svg = read('favicon.svg').toString('utf8');
    expect(svg).toMatch(/^<svg\b/);
    expect(svg).not.toMatch(/<image\b/i);
    expect(svg).not.toMatch(/base64|data:/i);
    expect(statSync(pub('favicon.svg')).size).toBeLessThan(2048);
  });

  it.each(['icons/logo-source.svg', 'icons/logo-maskable.svg'])('%s is clean vector artwork in the logo colours', (path) => {
    const svg = read(path).toString('utf8');
    expect(svg).toMatch(/^<svg\b/); // no XML prolog, no comment before the root
    expect(svg).toContain('viewBox="0 0 342 342"');
    expect(svg).not.toMatch(/<image\b|base64|inkscape|sodipodi|<metadata|<!--/i);
    for (const colour of [NAVY, '#409cff', '#48c27b']) expect(svg, colour).toContain(colour);
    expect(statSync(pub(path)).size).toBeLessThan(2048);
  });

  it('the favicon is the "any" icon, and the maskable source is the full-bleed variant', () => {
    expect(read('favicon.svg').toString('utf8')).toBe(read('icons/logo-source.svg').toString('utf8'));
    // Full bleed: the navy fills the whole canvas with no rounded corners (`rx`) on the outer rect.
    expect(read('icons/logo-maskable.svg').toString('utf8')).toMatch(/<rect width="342" height="342" fill="#0f3769"\/>/);
  });
});

describe('render script (B20b)', () => {
  it('is wired as `npm run icons`', () => {
    const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts.icons).toBe('node scripts/render-icons.mjs');
    expect(existsSync(resolve(ROOT, 'scripts/render-icons.mjs'))).toBe(true);
  });
});

describe('manifest icons (B20b)', () => {
  it('lists the 192/512 any icons, the maskable 512 and the vector source as `any`', async () => {
    const mod = (await import(pathToFileURL(resolve(ROOT, 'pwa.config.mjs')).href)) as {
      pwaOptions: (base: string) => {
        includeAssets: string[];
        manifest: { icons: { src: string; sizes: string; type: string; purpose?: string }[] };
      };
    };
    const { manifest, includeAssets } = mod.pwaOptions('/');
    expect(manifest.icons).toEqual([
      { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/logo-source.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ]);
    // Every manifest icon is a real file under public/, and is precached.
    for (const icon of manifest.icons) {
      expect(existsSync(pub(icon.src.slice(1))), icon.src).toBe(true);
      expect(includeAssets, icon.src).toContain(icon.src.slice(1));
    }
  });

  it('does not name the old 342 px raster as the icon source', () => {
    expect(readFileSync(resolve(ROOT, 'pwa.config.mjs'), 'utf8')).not.toMatch(/342px|logo-square\.png/);
  });
});
