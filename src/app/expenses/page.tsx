'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '../../components/ui/Button';

export default function ExpensesPage() {
  const router = useRouter();
  
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Expenses</h1>
      <p>View and manage all your expenses here.</p>
      
      <div className={styles.actions}>
        <Button 
          variant="primary" 
          onClick={() => router.push('/expenses/new')}
        >
          Add New Expense
        </Button>
      </div>
    </div>
  );
}
