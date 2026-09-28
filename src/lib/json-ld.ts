/**
 * jsonLd — safe inline JSON-LD serializer for Astro layouts.
 *
 * WHY: Naively using `JSON.stringify` to embed a JSON-LD object in a
 * `<script type="application/ld+json">` tag is an XSS vector. The HTML
 * parser treats `</script>` as the end of the script element even inside a
 * JSON string, so a crafted value like `{"name": "</script><script>alert(1)"}
 * can break out of the block and inject arbitrary HTML.
 *
 * FIX: Escape the three characters that are meaningful to the HTML parser
 * inside raw text elements (`<`, `>`, `&`) as their Unicode escape sequences.
 * This is the same approach used by React's server renderer, Google's
 * Closure Library, and the W3C's JSON-LD serialization spec.
 *
 * The output is valid JSON — JSON parsers treat `<` as `<` — and is
 * safe to embed verbatim in `<script type="application/ld+json">` tags.
 *
 * ADOPTION NOTE: BaseLayout.astro currently uses `JSON.stringify` directly
 * for its `jsonLd` prop. Replace that call with `jsonLd(obj)` to harden it.
 * (The adoption is outside this file's boundary — flagged in the batch-d PR
 * notes for a follow-up commit.)
 *
 * USAGE (in an Astro layout):
 *   import { jsonLd } from '@/lib/json-ld';
 *
 *   <script type="application/ld+json" set:html={jsonLd({
 *     "@context": "https://schema.org",
 *     "@type": "WebSite",
 *     "name": siteTitle,
 *   })} />
 */

/**
 * Serialize `obj` to a JSON string safe for inline embedding in an HTML
 * `<script type="application/ld+json">` element.
 *
 * Escapes `<`, `>`, and `&` using Unicode escape sequences so the HTML parser
 * cannot misinterpret the content as markup.
 *
 * @param obj  Any JSON-serializable value.
 * @param space  Optional indentation (forwarded to JSON.stringify). Omit for
 *               production (smaller bytes); pass `2` for debug readability.
 */
export function jsonLd(obj: unknown, space?: string | number): string {
  const raw = JSON.stringify(obj, null, space);
  // Replace characters that terminate or interfere with HTML raw text elements.
  // JSON.stringify never produces undefined for a non-undefined obj, but we
  // guard anyway to keep the return type consistently string.
  if (raw === undefined) return 'null';
  return raw
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
