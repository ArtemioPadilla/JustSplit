// ESLint flat config (ESLint 9+). See docs/PRINCIPLES.md for the rule rationale.
// WHY these three plugins:
//   @typescript-eslint — catches unsound TypeScript patterns not covered by tsc
//   react-hooks       — exhaustive-deps is the top source of subtle island bugs
//   jsx-a11y          — prevents accessibility regressions before axe-core CI
//
// Conventions for future PRs:
//   - Never silence exhaustive-deps without a comment explaining the invariant.
//   - For Base UI custom components, label-has-associated-control may be
//     disabled per-line when the custom component's internals are not
//     introspectable by static analysis (see ShowcaseFormControls.tsx).

import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  // ─── Base JS recommended ────────────────────────────────────────────────────
  js.configs.recommended,

  // ─── TypeScript source files ────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        // Without project:true we lose type-aware rules but avoid needing to
        // include every file in tsconfig. Type-aware rules can be re-enabled
        // once tsconfig includes all src subtrees consistently.
        project: false,
      },
      // Astro islands run in a browser context; stores/lib run in both browser
      // and SSR (Node). Listing browser + node globals avoids spurious no-undef
      // on fetch, window, document, console, navigator, localStorage, etc.
      globals: {
        ...globals.browser,
        ...globals.node,
        // PWA-specific browser event not in the standard globals list
        BeforeInstallPromptEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      // ── TypeScript recommended (type-unaware subset) ─────────────────────
      ...tsPlugin.configs.recommended.rules,

      // Turn off base rule in favour of the TS-aware version.
      'no-unused-vars': 'off',
      // no-undef can't see TypeScript ambient/global types (WindowEventMap,
      // AddEventListenerOptions, …). tsc owns undefined-identifier checking
      // in TS files — official typescript-eslint guidance is to disable it.
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          // Catch-binding variables named `_` or `_*` are a common JS idiom
          // for "I intentionally ignore this error value".
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // ── React Hooks ───────────────────────────────────────────────────────
      // exhaustive-deps is the #1 source of stale-closure bugs in islands.
      // Never silence this without a comment explaining the invariant that
      // makes the missing dep safe (e.g. a stable ref).
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': 'error',

      // set-state-in-effect warns when useState setter is called synchronously
      // inside an effect. The pattern IS intentional for post-mount-only state
      // (e.g. reading localStorage after hydration to avoid SSR mismatch).
      // We keep it as warn so the gate stays green while flagging new instances.
      'react-hooks/set-state-in-effect': 'warn',

      // ── jsx-a11y ──────────────────────────────────────────────────────────
      // Recommended: flags serious a11y issues in JSX. Matches axe-core's
      // critical/serious tier.
      ...jsxA11y.configs.recommended.rules,

      // Base UI wraps native inputs with custom React components. Static
      // analysis cannot trace the label association through the component
      // boundary, so this rule produces false positives for Base UI wrappers.
      // We downgrade to warn; real missing-label issues are still caught by
      // the axe-core Playwright gate which sees the rendered DOM.
      'jsx-a11y/label-has-associated-control': 'warn',

      // Base UI portals and compound components sometimes use non-static
      // interaction patterns that are semantically correct but trip these rules.
      'jsx-a11y/no-static-element-interactions': 'warn',
      'jsx-a11y/click-events-have-key-events': 'warn',

      // no-autofocus: the command-palette intentionally autofocuses the search
      // input (standard UX for modal search dialogs). Downgrade to warn so the
      // gate stays green; new autofocus uses must still be deliberate.
      'jsx-a11y/no-autofocus': 'warn',
    },
  },

  // ─── Node config + scripts (.mjs) — process/console are real globals ───────
  {
    files: ['*.mjs', 'scripts/**/*.mjs', 'examples/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // ─── Test files — relax rules that are noisy in test code ──────────────────
  {
    files: ['src/**/*.test.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        BeforeInstallPromptEvent: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off', // test stubs often need any
    },
  },

  // ─── Ignore patterns ────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      // Agent worktrees nest full checkouts (their own dist, node_modules…)
      // inside the repo — never lint them from the parent.
      '.claude/**',
      'playwright-report/**',
      'test-results/**',
      '.astro/**',
      'node_modules/**',
      // Config files that are not typed via tsconfig — parsed without
      // type-aware rules to avoid requiring a separate tsconfig for tooling.
      'playwright.config.ts',
      'vitest.config.ts',
      'vitest.setup.ts',
      'scripts/**',
      'tests/**',
      'server-flask/**',
      'server-node/**',
    ],
  },
];
