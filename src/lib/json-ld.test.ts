import { describe, expect, it } from 'vitest';
import { jsonLd } from './json-ld';

describe('jsonLd', () => {
  it('serializes a plain object to JSON', () => {
    const result = jsonLd({ '@type': 'WebSite', name: 'Inceptor' });
    const parsed = JSON.parse(result);
    expect(parsed['@type']).toBe('WebSite');
    expect(parsed.name).toBe('Inceptor');
  });

  it('escapes < to prevent </script> injection', () => {
    const payload = { name: '</script><script>alert(1)</script>' };
    const result = jsonLd(payload);
    // The raw string </script> must not appear in the output
    expect(result).not.toContain('</script>');
    // The escaped form must be present
    expect(result).toContain('\\u003c/script\\u003e');
  });

  it('escapes > in values', () => {
    const result = jsonLd({ x: 'a>b' });
    expect(result).toContain('\\u003e');
    expect(result).not.toContain('>');
  });

  it('escapes & in values', () => {
    const result = jsonLd({ q: 'foo&bar' });
    expect(result).toContain('\\u0026');
    expect(result).not.toContain('&');
  });

  it('produces valid JSON (parseable after escaping)', () => {
    const obj = { name: 'a</b>&c', url: 'https://example.com?a=1&b=2' };
    const result = jsonLd(obj);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    // JSON.parse unescapes Unicode sequences, so we get the original values back
    expect(parsed.name).toBe('a</b>&c');
    expect(parsed.url).toBe('https://example.com?a=1&b=2');
  });

  it('handles an XSS-shaped payload — complete injection attempt', () => {
    const xss = {
      name: '</script><img src=x onerror=alert(1)>',
      description: '<script>document.cookie</script>',
    };
    const result = jsonLd(xss);
    // No raw HTML-dangerous characters in the output
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toMatch(/<img/i);
    expect(result).not.toContain('</script>');
    // Still valid JSON
    const parsed = JSON.parse(result);
    expect(parsed.name).toBe(xss.name);
    expect(parsed.description).toBe(xss.description);
  });

  it('accepts null', () => {
    expect(jsonLd(null)).toBe('null');
  });

  it('accepts arrays', () => {
    const result = jsonLd([1, 2, 3]);
    expect(JSON.parse(result)).toEqual([1, 2, 3]);
  });

  it('respects the space parameter for pretty-printing', () => {
    const result = jsonLd({ a: 1 }, 2);
    expect(result).toContain('\n');
  });

  it('does not escape forward slashes (valid in JSON, safe in HTML)', () => {
    const result = jsonLd({ url: 'https://example.com/path' });
    expect(result).toContain('https://example.com/path');
  });
});
