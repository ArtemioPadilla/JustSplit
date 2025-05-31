'use client';

import React from 'react';
import { ThemeProvider, LanguageProvider } from '@cybereco/ui-components';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import translations from '../translations';
import styles from './client-layout.module.css';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LanguageProvider initialTranslations={translations}>
        <Header />
        <main className={styles.main}>
          {children}
        </main>
        <Footer />
      </LanguageProvider>
    </ThemeProvider>
  );
}