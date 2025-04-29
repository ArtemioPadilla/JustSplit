'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ExpensesPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the expenses list page
    router.push('/expenses/list');
  }, [router]);
  
  // This will briefly show while the redirect happens
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Redirecting to expenses list...</p>
    </div>
  );
}
