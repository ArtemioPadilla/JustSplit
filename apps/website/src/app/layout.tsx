// Server Component
import React from 'react';
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
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}