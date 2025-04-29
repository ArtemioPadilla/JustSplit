import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from '../context/Providers';
import Header from '../components/Header';

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
        <Providers>
          <Header />
          <main className="main-content">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
