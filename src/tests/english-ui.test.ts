import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The app ships in English (BaseLayout's `lang` defaults to 'en'; the spec's
 * Spanish copy is Track D, not this tree). A Spanish literal in an island or
 * a feature component is a stray: B19b found "Restablecer datos locales" on
 * the reset button, and FeedbackFAB falling back to its Spanish dictionary
 * whenever a caller (or the client script) had no locale.
 *
 * The guard is deliberately narrow so it stays trustworthy: it scans the
 * non-test React components for Spanish-only characters (inverted
 * punctuation, ñ, accented vowels) and for the known Spanish UI words, and
 * pins FeedbackFAB's defaults. `src/i18n/es.ts` is a real locale and is not
 * scanned; a component that needs Spanish reads it through the dictionary.
 */
const SRC = resolve(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Drops comments so an ADR-style "Restablecer" in a docblock is not a UI string. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

const SPANISH = /[¿¡ñáéíóú]|\b(Restablecer|Guardar|Cancelar|Eliminar|Cargando|Bienvenid[oa]|Contraseña|Configuración)\b/;

describe('the English UI carries no stray Spanish (B19b)', () => {
  const components = walk(join(SRC, 'components')).filter(
    (f) => f.endsWith('.tsx') && !/\.(test|behavior\.test)\.tsx$/.test(f),
  );

  it('scans a meaningful number of component files', () => {
    expect(components.length).toBeGreaterThan(50);
  });

  it.each(components.map((f) => [relative(SRC, f), f]))('%s has no Spanish UI string', (_name, file) => {
    const literal = stripComments(readFileSync(file, 'utf8')).match(SPANISH);
    expect(literal?.[0] ?? null).toBeNull();
  });

  it('FeedbackFAB falls back to English, not to its Spanish dictionary', () => {
    const fab = readFileSync(join(SRC, 'components/common/FeedbackFAB.astro'), 'utf8');
    expect(fab).toMatch(/lang = 'en'\s*\}\s*=\s*Astro\.props/);
    expect(fab).toMatch(/modal\.dataset\.lang \|\| 'en'/);
    // The client script's label fallbacks (used when a data attribute is missing).
    expect(fab).not.toMatch(/dataset\.lCopy \|\| 'Copiar/);
    expect(fab).not.toMatch(/dataset\.lCopied \|\| '¡Copiado/);
  });
});
