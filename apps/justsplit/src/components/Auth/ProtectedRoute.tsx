"use client";
// Presumed structure of ProtectedRouter.tsx
import { useAuth } from '../../context/AuthContext'; // Adjust path
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Define public paths that don't require authentication
const PUBLIC_PATHS = [
  '/landing',
  '/auth/signin',
  '/auth/signup',
  '/about',
  '/tos',
  '/privacy',
  '/help',
  '/contact'
];

export default function ProtectedRouter({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoading } = useAuth(); // Changed 'user' to 'currentUser'
  const router = useRouter();
  const pathname = usePathname();

  console.log('ProtectedRouter - Auth State:', { user: currentUser, isLoading }); // ADD THIS

  useEffect(() => {
    // Allow access to public paths without authentication
    const isPublicPath = PUBLIC_PATHS.some(path => pathname?.startsWith(path));
    
    if (!isLoading && !currentUser && !isPublicPath) {
      console.log('ProtectedRouter: No user, not loading, not public path - redirecting to landing page');
      router.push('/landing'); // Changed redirect to landing page
    }
  }, [currentUser, isLoading, router, pathname]); // Changed 'user' to 'currentUser'

  if (isLoading) {
    console.log('ProtectedRouter: isLoading is true, returning null (or a loader)');
    return null; // Or a loading spinner component
  }

  // Add more logs for other conditions based on your component's logic

  return <>{children}</>;
}