// ESLint for the Next tree (Track A). Replaced by Inceptor's eslint.config.mjs in B1.
//
// Every rule relaxed here is a TODO(track-b): the files it covers are deleted or
// rewritten when src/ becomes the Astro tree, and Track A forbids app-code changes,
// so the relaxations are scoped in config rather than fixed in source.
module.exports = {
  extends: ['next/core-web-vitals', 'next/typescript'],
  rules: {
    // Cosmetic: apostrophes/quotes in JSX text across ~12 legacy pages.
    'react/no-unescaped-entities': 'off',
    // Legacy code leans on `any`; the Astro tree uses Zod + @cyber-eco/types instead.
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    // Four `let` declarations never reassigned in legacy utils/context (all deleted in B1).
    'prefer-const': 'warn',
  },
  overrides: [
    {
      // jest.mock() factories return anonymous components; naming them adds nothing.
      files: ['src/**/__tests__/**', 'src/__tests__/**', 'src/**/*.test.{ts,tsx}'],
      rules: { 'react/display-name': 'off' },
    },
    {
      // Conditional hook calls in legacy components (early returns before useMemo/useEffect,
      // `useAuth()` inside a branch). All four files go away in B1 (React Context → Nano
      // Stores, settlements → SettlementsIsland). Scoped so the rule stays on elsewhere.
      files: [
        'src/context/AppContext.tsx',
        'src/components/ui/DatabaseErrorRecovery.tsx',
        'src/components/Dashboard/DashboardHeader.tsx',
        'src/app/settlements/page.tsx',
      ],
      rules: { 'react-hooks/rules-of-hooks': 'off' },
    },
  ],
};
