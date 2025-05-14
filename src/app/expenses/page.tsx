'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '../../components/ui/Button';

export default function ExpensesPage() {
  const router = useRouter();
  const { state } = useAppContext();
  
  // Option 1: Auto-redirect to the list page
  useEffect(() => {
    router.push('/expenses/list');
  }, [router]);
  
  // Option 2: Display expenses directly (as a fallback if redirect doesn't work)
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Expenses</h1>
      <p>Redirecting to expense list...</p>
      
      <div className={styles.actions}>
        <Button 
          variant="primary" 
          onClick={() => router.push('/expenses/new')}
        >
          Add New Expense
        </Button>
        
        <Button 
          variant="secondary" 
          onClick={() => router.push('/expenses/list')}
        >
          View All Expenses ({state.expenses?.length || 0})
        </Button>
      </div>
      
      {/* Display a few recent expenses as preview */}
      {state.expenses && state.expenses.length > 0 && (
        <div className={styles.previewSection}>
          <h2>Recent Expenses</h2>
          <div className={styles.expensesPreview}>
            {state.expenses.slice(0, 3).map(expense => (
              <div key={expense.id} className={styles.expensePreviewItem}>
                <span>{expense.description}</span>
                <span>{expense.amount} {expense.currency}</span>
              </div>
            ))}
            <Link href="/expenses/list" className={styles.viewAllLink}>
              View all expenses →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
