/**
 * The Cloudflare Pages `_headers` file for JustSplit (plan B20a, ADR 0016), as
 * plain functions so the Astro build integration (`pages-headers.config.mjs`),
 * the static server the smokes use, `scripts/check-dist.mjs` and the unit tests
 * share one implementation.
 *
 * The CSP is ENFORCED, and `script-src` is `'self'` plus the sha256 of every
 * executable inline script found in the finished `dist/` HTML, computed at build
 * time so the hashes cannot drift from the markup (theme script, the view
 * transition guard, Astro's island bootstrap, the app-nav script, the telemetry
 * capture, the redirect stubs...). JSON-LD blocks are data, not executed, and need
 * no hash. No `'unsafe-inline'` and no `'unsafe-eval'` for scripts.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Inline script hashes
// ---------------------------------------------------------------------------

/** `<script type>` values the browser executes (or, for an import map, that CSP governs like code). */
const EXECUTABLE_TYPES = new Set(['', 'module', 'importmap', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript']);

const SCRIPT = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;

/** `'sha256-...'` of a script body, exactly as the browser hashes the element's text. */
const hashOf = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

/** Sorted, de-duplicated CSP hash sources for the executable inline scripts of one document. */
export function inlineScriptHashes(html) {
  const hashes = new Set();
  for (const [, attributes, body] of html.matchAll(SCRIPT)) {
    if (/\ssrc\s*=/i.test(` ${attributes}`)) continue; // external: covered by 'self'
    const type = /\stype\s*=\s*["']?([^"'\s>]*)/i.exec(` ${attributes}`)?.[1]?.toLowerCase() ?? '';
    if (!EXECUTABLE_TYPES.has(type)) continue; // application/ld+json, application/json: data
    if (body.length === 0) continue;
    hashes.add(hashOf(body));
  }
  return [...hashes].sort();
}

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return htmlFiles(path);
    return name.endsWith('.html') ? [path] : [];
  });
}

/** The union of `inlineScriptHashes` over every `.html` file under `dir`. */
export function collectInlineScriptHashes(dir) {
  const all = new Set();
  for (const file of htmlFiles(dir)) for (const hash of inlineScriptHashes(readFileSync(file, 'utf8'))) all.add(hash);
  return [...all].sort();
}

// ---------------------------------------------------------------------------
// CSP
// ---------------------------------------------------------------------------

/**
 * The Supabase project's origins for `connect-src` / `img-src`, from
 * `PUBLIC_SUPABASE_URL`: https -> https + wss (hosted), http -> http + ws (the
 * local stack the live smoke builds against). null when no project is
 * configured (the guarded, disabled build). Anything else throws: the value ends
 * up in a response header, so it is parsed, never pasted.
 */
export function supabaseOrigins(url) {
  if (url === undefined || url === '') return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`PUBLIC_SUPABASE_URL is not a URL: ${JSON.stringify(url)}`);
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`PUBLIC_SUPABASE_URL must be an http(s) URL, got ${parsed.protocol}`);
  }
  // `new URL` percent-encodes or rejects the characters that could end a CSP source.
  if (!/^[a-z0-9.:[\]-]+$/i.test(parsed.host)) throw new Error(`PUBLIC_SUPABASE_URL has an unexpected host: ${JSON.stringify(parsed.host)}`);
  return { http: parsed.origin, ws: `${parsed.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsed.host}` };
}

/**
 * The enforced Content-Security-Policy. Why each source:
 *  - style-src 'unsafe-inline': server-rendered `style="..."` attributes (React
 *    SSR) and Astro's inlined <style> blocks are blocked without it, and a style
 *    cannot run script. Google Fonts serves the stylesheet from googleapis.com.
 *  - font-src fonts.gstatic.com: the font files themselves.
 *  - img-src: data: (CSS/SVG), blob: (previews of a picked photo or receipt), the
 *    Supabase project (signed Storage URLs) and Google avatars (OAuth photoURL).
 *    `profiles.avatarUrl` is user-writable and may hold any https URL: other hosts
 *    no longer load (the initials fallback shows), which also closes a tracking
 *    pixel against everyone who views that profile.
 *  - connect-src: the project over https (REST/Auth/Storage) and wss (Realtime),
 *    and the exchange-rate API (ADR 0007).
 */
export function buildCsp({ hashes, supabaseUrl }) {
  const supabase = supabaseOrigins(supabaseUrl);
  const directives = [
    ["default-src", ["'self'"]],
    ['script-src', ["'self'", ...hashes]],
    ['style-src', ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com']],
    ['font-src', ["'self'", 'https://fonts.gstatic.com']],
    ['img-src', ["'self'", 'data:', 'blob:', ...(supabase ? [supabase.http] : []), 'https://*.googleusercontent.com']],
    ['connect-src', ["'self'", ...(supabase ? [supabase.http, supabase.ws] : []), 'https://open.er-api.com']],
    ['worker-src', ["'self'"]],
    ['manifest-src', ["'self'"]],
    ['base-uri', ["'self'"]],
    ['form-action', ["'self'"]],
    ['object-src', ["'none'"]],
    ['frame-ancestors', ["'none'"]],
  ];
  return directives.map(([name, sources]) => `${name} ${sources.join(' ')}`).join('; ');
}

// ---------------------------------------------------------------------------
// The file
// ---------------------------------------------------------------------------

/**
 * Camera is off too: the avatar and receipt pickers are plain file inputs
 * (`accept="image/*"`, no `capture`, no getUserMedia), so nothing needs it.
 * Only features every current browser recognises are listed: an unknown name
 * logs a console error, which the live smoke treats as a failure.
 */
const PERMISSIONS_POLICY = [
  'accelerometer',
  'autoplay',
  'browsing-topics',
  'camera',
  'display-capture',
  'encrypted-media',
  'geolocation',
  'gyroscope',
  'magnetometer',
  'microphone',
  'midi',
  'payment',
  'usb',
  'xr-spatial-tracking',
]
  .map((feature) => `${feature}=()`)
  .join(', ');

/**
 * The `_headers` text. Cloudflare Pages joins a header set by several matching
 * rules with a comma, so Cache-Control is set once on `/*` and detached (`!`) in
 * the one rule that needs a different value.
 *
 * HSTS has no `preload`: eligibility requires the apex (`cybere.co`) to send it
 * with includeSubDomains, which would commit every subdomain of the zone, and
 * preload is slow to undo. That is the zone owner's call, not this app's.
 */
export function buildHeadersFile({ hashes, supabaseUrl }) {
  return [
    '# Generated by pages-headers.config.mjs at build time (plan B20a). Do not edit.',
    '/*',
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    `  Permissions-Policy: ${PERMISSIONS_POLICY}`,
    '  X-Frame-Options: DENY',
    `  Content-Security-Policy: ${buildCsp({ hashes, supabaseUrl })}`,
    '  Cache-Control: no-cache',
    '/_astro/*',
    '  ! Cache-Control',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Parsing and matching (what Cloudflare Pages does; used by the static server)
// ---------------------------------------------------------------------------

/** `[{ pattern, set: [[name, value]], unset: [name] }]` in file order. */
export function parseHeadersFile(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), set: [], unset: [] });
      continue;
    }
    const rule = rules[rules.length - 1];
    if (!rule) continue;
    const body = line.trim();
    if (body.startsWith('!')) {
      rule.unset.push(body.slice(1).trim());
      continue;
    }
    const at = body.indexOf(':');
    if (at > 0) rule.set.push([body.slice(0, at).trim(), body.slice(at + 1).trim()]);
  }
  return rules;
}

/** `*` is a splat (anything, slashes included), `:name` one path segment; anchored. */
function patternToRegExp(pattern) {
  const source = pattern
    .split(/(\*|:[A-Za-z_]\w*)/)
    .map((part) => (part === '*' ? '.*' : /^:[A-Za-z_]\w*$/.test(part) ? '[^/]+' : part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')))
    .join('');
  return new RegExp(`^${source}$`);
}

/** The headers (lower-case names) Pages would add to a response for `pathname`. */
export function headersFor(rules, pathname) {
  const out = {};
  for (const rule of rules) {
    if (!patternToRegExp(rule.pattern).test(pathname)) continue;
    for (const name of rule.unset) delete out[name.toLowerCase()];
    for (const [name, value] of rule.set) {
      const key = name.toLowerCase();
      out[key] = key in out ? `${out[key]}, ${value}` : value;
    }
  }
  return out;
}
