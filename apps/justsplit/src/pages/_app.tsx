import '../app/globals.css';
import type { AppProps } from 'next/app';
import { AppProvider } from '../context/AppContext';
import Header from '../components/Header';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AppProvider>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Component {...pageProps} />
      </main>
    </AppProvider>
  );
}
