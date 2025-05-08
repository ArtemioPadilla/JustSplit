'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CircularProgress } from '@mui/material';

export default function EventsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the events list page
    router.push('/events/list');
  }, [router]);

  // This will briefly show while the redirect happens
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9f9f9', color: '#333' }}>
      <CircularProgress style={{ marginBottom: '16px' }} />
      <p style={{ fontSize: '18px', fontWeight: '500' }}>Redirecting to events list...</p>
    </div>
  );
}
