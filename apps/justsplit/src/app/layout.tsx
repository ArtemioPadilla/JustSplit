import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientLayoutWrapper from './client-layout-wrapper'; // Import the new wrapper

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JustSplit - Fair expense splitting, made simple',
  description: 'Track, divide, and settle shared expenses effortlessly — for trips, events, or daily life.',
  icons: {
    icon: '/images/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
      </body>
    </html>
  );
}