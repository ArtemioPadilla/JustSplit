'use client';

import { usePathname } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import Providers from '../context/Providers'; // Ensure path is correct
import Header from '../components/Header';     // Ensure path is correct
import ProtectedRoute from '../components/Auth/ProtectedRoute'; // Ensure path is correct
import DatabaseErrorRecovery from '../components/ui/DatabaseErrorRecovery'; // Import the recovery component

function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthRoute = pathname.startsWith('/auth/');

  return (
    <Providers>
      {/* This component will render only when there is a database corruption error */}
      <DatabaseErrorRecovery />
      
      {isAuthRoute ? (
        // For /auth/signin, /auth/signup, etc.
        // No Header, no ProtectedRoute wrapper here.
        children
      ) : (
        // For all other routes (e.g., /dashboard, /profile)
        <ProtectedRoute>
          {/* Header is a child of ProtectedRoute.
              If ProtectedRoute redirects or returns null (because user is not logged in),
              then Header also won't render */}
          <Header />
          {children}
        </ProtectedRoute>
      )}
    </Providers>
  );
}

export default function ClientLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // During SSR/SSG, just return children without providers
  if (!isClient) {
    return <>{children}</>;
  }

  return <ClientLayout>{children}</ClientLayout>;
}