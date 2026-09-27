import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Plan B1 graft manifest. create-inceptor-app emits only Inceptor's core
 * subset; everything else this codebase depends on was copied from the Inceptor
 * checkout by hand. This test pins that list so a future re-graft (or a
 * careless cleanup) cannot silently drop a file the plan relies on.
 * Add to the list when you graft; remove only with the plan issue that retires the file.
 */
const ROOT = resolve(__dirname, '../../');

export const SCAFFOLD_MANIFEST = [
  '.env.example',
  '.github/workflows/deploy.yml',
  '.lighthouserc.json',
  '.npmrc',
  'astro.config.mjs',
  'components.json',
  'eslint.config.mjs',
  'lighthouse-budgets.json',
  'public/icons/pwa-192.png',
  'public/icons/pwa-512.png',
  'public/icons/pwa-maskable-512.png',
  'public/robots.txt',
  'scripts/check-ts-pragmas.mjs',
  'site.config.mjs',
  'src/components/common/FeedbackFAB.astro',
  'src/components/common/SiteFooter.astro',
  'src/components/common/SiteHeader.astro',
  'src/components/common/ThemeToggle.astro',
  'src/components/islands/ErrorBoundary.tsx',
  'src/components/islands/HydrationCanary.tsx',
  'src/components/islands/InstallButton.tsx',
  'src/components/islands/OfflineBanner.tsx',
  'src/components/islands/QueryProvider.tsx',
  'src/components/islands/UpdateToast.tsx',
  'src/components/ui/action-bar.tsx',
  'src/components/ui/avatar.tsx',
  'src/components/ui/calendar.tsx',
  'src/components/ui/charts/index.ts',
  'src/components/ui/checkbox.tsx',
  'src/components/ui/combobox.tsx',
  'src/components/ui/data-table.tsx',
  'src/components/ui/date-picker.tsx',
  'src/components/ui/download-trigger.tsx',
  'src/components/ui/editable.tsx',
  'src/components/ui/empty-state.tsx',
  'src/components/ui/error-state.tsx',
  'src/components/ui/field-type/display.tsx',
  'src/components/ui/file-upload.tsx',
  'src/components/ui/hover-card.tsx',
  'src/components/ui/number-field.tsx',
  'src/components/ui/password-input.tsx',
  'src/components/ui/popover.tsx',
  'src/components/ui/progress-bar.tsx',
  'src/components/ui/property-filter.tsx',
  'src/components/ui/radio-group.tsx',
  'src/components/ui/sheet.tsx',
  'src/components/ui/switch.tsx',
  'src/components/ui/tabs.tsx',
  'src/components/ui/use-data-table-url-state.ts',
  'src/env.d.ts',
  'src/i18n/index.ts',
  'src/lib/analytics.ts',
  'src/lib/api.ts',
  'src/lib/disposer.ts',
  'src/lib/field-type.ts',
  'src/lib/flags.ts',
  'src/lib/format-date.ts',
  'src/lib/href.ts',
  'src/lib/json-ld.ts',
  'src/lib/pwa-register.ts',
  'src/lib/queryClient.ts',
  'src/lib/report-issue.ts',
  'src/lib/route-guard.tsx',
  'src/lib/sentry.ts',
  'src/lib/site-meta.ts',
  'src/lib/use-client-preference.ts',
  'src/lib/use-listing.ts',
  'src/pages/404.astro',
  'src/pages/llms-full.txt.ts',
  'src/pages/llms.txt.ts',
  'src/pages/showcase.astro',
  'src/stores/install.ts',
  'src/stores/online.ts',
  'src/stores/theme.ts',
  'src/styles/global.css',
  'src/tests/forbidden-imports.test.ts',
  'src/tests/site-meta.test.ts',
  'src/types/vite-pwa.d.ts',
  'vitest.config.ts',
  'vitest.setup.ts',
] as const;

describe('scaffold manifest (plan B1)', () => {
  it.each(SCAFFOLD_MANIFEST)('%s exists', (path) => {
    expect(existsSync(resolve(ROOT, path)), `missing ${path}`).toBe(true);
  });

  it('lists a meaningful number of files', () => {
    expect(SCAFFOLD_MANIFEST.length).toBeGreaterThan(60);
  });
});
