'use client';

import React from 'react';
import { ThemeProvider } from './theme';
import { LanguageProvider, TranslationsMap } from './i18n';

interface GlobalProviderProps {
  children: React.ReactNode;
  translations?: TranslationsMap;
}

// Using regular function declaration for better Next.js compatibility
export function GlobalProvider({ children, translations }: GlobalProviderProps) {
  return (
    <ThemeProvider>
      <LanguageProvider initialTranslations={translations}>
        {children}
      </LanguageProvider>
    </ThemeProvider>
  );
}