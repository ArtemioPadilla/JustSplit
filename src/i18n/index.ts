import { en } from './en';
import { es } from './es';

/**
 * The English dictionary is the structural source of truth — adding a key
 * to `en.ts` widens this type. Other locales must satisfy it (see `es.ts`).
 *
 * ## Runtime locale detection for islands and non-Astro code
 *
 * Astro components can read the locale from `Astro.currentLocale` or derive it
 * from `Astro.url.pathname` via `detectLocale()`. **Islands (React, etc.) run
 * outside the Astro request context**, so they must receive the locale as a
 * prop, attribute, or store:
 *
 * 1. **Prop** (preferred for single-island use): pass `lang` as a string prop
 *    from the Astro parent and forward it into the island.
 *
 *    ```astro
 *    <MyIsland lang={detectLocale(Astro.url.pathname)} client:visible />
 *    ```
 *
 * 2. **Nano Store** (preferred when multiple islands share state): write
 *    `localeStore.set(detectLocale(pathname))` in a script tag in BaseLayout;
 *    islands subscribe with `useStore(localeStore)`. Never use React Context
 *    for cross-island state — Astro partial hydration breaks it.
 *
 * 3. **Data attribute** (simple, zero-JS): read `document.documentElement.lang`
 *    inside a client-side effect. BaseLayout always sets `<html lang={lang}>`.
 *    Fine for non-critical, display-only use.
 *
 * Worker/postMessage boundaries: locale must be passed as a plain string (not
 * wrapped in an object with an interface — use `Locale` exported from here,
 * which is a string-literal union derived from `dictionaries`).
 */
export type Dictionary = typeof en;

export const dictionaries: Record<'en' | 'es', Dictionary> = { en, es };
export type Locale = keyof typeof dictionaries;

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALES: readonly Locale[] = ['en', 'es'] as const;

/**
 * Detect locale from a URL pathname. Returns `'en'` when no `/<locale>/` prefix
 * matches — that mirrors `prefixDefaultLocale: false` in astro.config.mjs.
 */
export function detectLocale(pathname: string): Locale {
  const match = pathname.match(/^\/(en|es)(?:\/|$)/);
  return (match?.[1] as Locale) ?? DEFAULT_LOCALE;
}

/**
 * Translate a dot-path key against the chosen locale's dictionary, falling back
 * to English if the key is missing in the target locale (typical i18n behavior:
 * never render an empty string).
 */
export function t(locale: Locale, key: string): string {
  const lookup = (dict: Dictionary): string | undefined => {
    const parts = key.split('.');
    let cur: unknown = dict;
    for (const part of parts) {
      if (cur && typeof cur === 'object' && part in cur) {
        cur = (cur as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
    return typeof cur === 'string' ? cur : undefined;
  };
  return lookup(dictionaries[locale]) ?? lookup(dictionaries[DEFAULT_LOCALE]) ?? key;
}

/**
 * Produce the equivalent URL for a different locale, used by the language
 * switcher. `/about` ↔ `/es/about`; `/es/about` → `/about` with locale=`en`.
 */
export function localizedPath(pathname: string, target: Locale): string {
  const stripped = pathname.replace(/^\/(en|es)(?=\/|$)/, '') || '/';
  if (target === DEFAULT_LOCALE) return stripped;
  return stripped === '/' ? `/${target}` : `/${target}${stripped}`;
}

/**
 * Collect every leaf-node dot-path from a nested object. Used by parity tests
 * to enumerate all translation keys and verify no locale is missing one.
 *
 * @example
 * collectLeafKeys({ nav: { home: 'Home' } }) // → ['nav.home']
 */
export function collectLeafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj !== 'object' || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    collectLeafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}
