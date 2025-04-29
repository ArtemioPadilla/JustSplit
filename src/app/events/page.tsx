'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EventsPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the events list page
    router.push('/events/list');
  }, [router]);
  
  // This will briefly show while the redirect happens
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to events list...</p>
    </div>
  );
}
