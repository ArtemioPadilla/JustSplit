// Server Component
import React from 'react';
import Script from 'next/script';
import { createThemeScript, themeTransitionCSS } from '@cybereco/ui-components';
import './globals.css';
import '../styles/theme-variables.css';
import ClientLayout from './client-layout';
export { metadata } from './metadata';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeTransitionCSS }} />
        <script dangerouslySetInnerHTML={{ __html: createThemeScript() }} />
      </head>
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}