#!/usr/bin/env node
/**
 * Renders every app icon from the two vector sources (plan B20b):
 *
 *   public/icons/logo-source.svg    the "any" icon (rounded navy tile)
 *   public/icons/logo-maskable.svg  full bleed, mark scaled into the safe zone
 *
 * Output (all under public/):
 *   favicon.svg                      copy of logo-source.svg
 *   favicon.ico                      16/32/48 px PNG images in an ICO container
 *   apple-touch-icon.png   180       from the maskable source, no alpha channel
 *   icons/pwa-192.png, pwa-512.png   from the "any" source
 *   icons/pwa-maskable-512.png       from the maskable source
 *
 * `npm run icons` regenerates them; the output is committed, so a build never
 * needs a browser. Each size is rasterised straight from the vector at that
 * size (never scaled down from a bigger bitmap), so the 16 px favicon is
 * drawn by the vector renderer, not blurred by a resample.
 *
 * Chromium rasterises (the preinstalled one, see scripts/lib/browser.mjs), and
 * the PNGs are re-encoded here with node:zlib only: Chromium's screenshots are
 * lightly compressed, and a fully opaque icon (the apple-touch one, which iOS
 * wants without alpha) is stored as RGB, colour type 2. The icons are flat
 * colour, so an adaptive filter plus level-9 deflate shrinks them well. No
 * dependency is added.
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync, inflateSync } from 'node:zlib';
import { launchChromium } from './lib/browser.mjs';

const PUBLIC = new URL('../public/', import.meta.url).pathname;
const SOURCE = join(PUBLIC, 'icons/logo-source.svg');
const MASKABLE = join(PUBLIC, 'icons/logo-maskable.svg');

const PNG_SIGNATURE = Buffer.from('89504e470d0a1a0a', 'hex');

/** The PNG row predictor for filter types 0-4 (the Paeth one is type 4). */
function predict(filter, left, up, upLeft) {
  switch (filter) {
    case 0:
      return 0;
    case 1:
      return left;
    case 2:
      return up;
    case 3:
      return (left + up) >> 1;
    case 4: {
      const p = left + up - upLeft;
      const pa = Math.abs(p - left);
      const pb = Math.abs(p - up);
      const pc = Math.abs(p - upLeft);
      return pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
    }
    default:
      throw new Error(`bad PNG filter ${filter}`);
  }
}

/**
 * Decodes an 8-bit, non-interlaced PNG to RGBA pixels. Chromium emits RGBA (type 6)
 * where the artwork has transparency and plain RGB (type 2) when it is fully opaque.
 */
function decodePng(png) {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('not a PNG');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const channels = png[25] === 6 ? 4 : png[25] === 2 ? 3 : 0;
  if (png[24] !== 8 || !channels || png[28] !== 0) {
    throw new Error(`expected 8-bit RGB(A) non-interlaced, got depth ${png[24]} type ${png[25]} interlace ${png[28]}`);
  }
  const idat = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    if (png.toString('latin1', at + 4, at + 8) === 'IDAT') idat.push(png.subarray(at + 8, at + 8 + length));
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const scan = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? scan[y * stride + x - channels] : 0;
      const up = y > 0 ? scan[(y - 1) * stride + x] : 0;
      const upLeft = x >= channels && y > 0 ? scan[(y - 1) * stride + x - channels] : 0;
      scan[y * stride + x] = (line[x] + predict(filter, left, up, upLeft)) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < width * height; i++) scan.copy(pixels, i * 4, i * channels, (i + 1) * channels);
  return { width, height, pixels };
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'latin1');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

const isOpaque = (pixels) => pixels.every((value, i) => i % 4 !== 3 || value === 255);

/**
 * Encodes pixels as RGB (colour type 2) when every pixel is opaque, else RGBA (type 6),
 * using the best of the five filters per row.
 */
function encodePng({ width, height, pixels }) {
  const channels = isOpaque(pixels) ? 3 : 4;
  const stride = width * channels;
  const out = Buffer.alloc(height * (stride + 1));
  let previous = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(stride);
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) line[x * channels + c] = pixels[(y * width + x) * 4 + c];
    }
    let best = null;
    for (let filter = 0; filter <= 4; filter++) {
      const candidate = Buffer.alloc(stride + 1);
      candidate[0] = filter;
      let cost = 0;
      for (let x = 0; x < stride; x++) {
        const left = x >= channels ? line[x - channels] : 0;
        const upLeft = x >= channels ? previous[x - channels] : 0;
        const value = (line[x] - predict(filter, left, previous[x], upLeft)) & 255;
        candidate[x + 1] = value;
        cost += value < 128 ? value : 256 - value; // the usual "minimum sum of absolute differences" heuristic
      }
      if (!best || cost < best.cost) best = { cost, candidate };
    }
    best.candidate.copy(out, y * (stride + 1));
    previous = line;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = channels === 4 ? 6 : 2;
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** An ICO container whose images are PNGs (supported since Windows Vista and by every browser). */
function encodeIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);
  let offset = header.length + images.length * 16;
  const directory = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16);
    entry[0] = size; // 0 would mean 256; every size here is smaller
    entry[1] = size;
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  return Buffer.concat([header, ...directory, ...images.map(({ png }) => png)]);
}

async function main() {
  const svgs = { source: readFileSync(SOURCE, 'utf8'), maskable: readFileSync(MASKABLE, 'utf8') };
  const browser = await launchChromium();
  try {
    const page = await browser.newPage({ deviceScaleFactor: 1 });
    /** Rasterises one SVG at size x size, transparent where the artwork is. */
    const rasterise = async (svg, size) => {
      await page.setViewportSize({ width: size, height: size });
      const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
      await page.setContent(
        `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style><img width="${size}" height="${size}" src="${src}">`,
      );
      await page.waitForFunction(() => document.images[0].complete && document.images[0].naturalWidth > 0);
      return decodePng(await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } }));
    };

    const write = (path, bytes) => {
      writeFileSync(join(PUBLIC, path), bytes);
      console.log(`${path.padEnd(28)} ${String(bytes.length).padStart(6)} bytes`);
    };

    copyFileSync(SOURCE, join(PUBLIC, 'favicon.svg'));

    write('icons/pwa-192.png', encodePng(await rasterise(svgs.source, 192)));
    write('icons/pwa-512.png', encodePng(await rasterise(svgs.source, 512)));
    write('icons/pwa-maskable-512.png', encodePng(await rasterise(svgs.maskable, 512)));

    // iOS paints transparency black and applies its own rounding, so the apple-touch
    // icon is the full-bleed variant. Refuse to write it if any pixel is not opaque.
    const apple = await rasterise(svgs.maskable, 180);
    if (!isOpaque(apple.pixels)) throw new Error('apple-touch-icon has a non-opaque pixel; the maskable source must be full bleed');
    write('apple-touch-icon.png', encodePng(apple));

    const ico = [];
    for (const size of [16, 32, 48]) ico.push({ size, png: encodePng(await rasterise(svgs.source, size)) });
    write('favicon.ico', encodeIco(ico));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
