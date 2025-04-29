'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function ExpenseDetail() {
  const router = useRouter();
  const params = useParams();
  const { state } = useAppContext();
  const expenseId = params.id as string;
  
  const expense = useMemo(() => {
    return state.expenses.find(e => e.id === expenseId);
  }, [state.expenses, expenseId]);
  
  const paidByUser = useMemo(() => {
    if (!expense) return null;
    return state.users.find(user => user.id === expense.paidBy);
  }, [expense, state.users]);
  
  const event = useMemo(() => {
    if (!expense) return null;
    return state.events.find(e => e.id === expense.eventId);
  }, [expense, state.events]);
  
  const participants = useMemo(() => {
    if (!expense) return [];
    return state.users.filter(user => expense.participants.includes(user.id));
  }, [expense, state.users]);
  
  if (!expense) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Expense Not Found</h1>
        <p>The expense you're looking for doesn't exist or has been deleted.</p>
        <Link href="/expenses/list" className={styles.backButton}>
          Return to Expenses List
        </Link>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{expense.description}</h1>
        <Link href="/expenses/list" className={styles.backButton}>
          Back to Expenses
        </Link>
      </div>
      
      <div className={styles.section}>
        <div className={styles.amountDisplay}>
          <span className={styles.currency}>{expense.currency}</span>
          <span className={styles.amount}>{expense.amount.toFixed(2)}</span>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Details</h2>
        
        <div className={styles.detailGrid}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Date</span>
            <span className={styles.detailValue}>
              {new Date(expense.date).toLocaleDateString()}
            </span>
          </div>
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Paid By</span>
            <span className={styles.detailValue}>
              {paidByUser ? paidByUser.name : 'Unknown User'}
            </span>
          </div>
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Event</span>
            <span className={styles.detailValue}>
              {event ? event.name : 'No Event'}
            </span>
          </div>
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Category</span>
            <span className={styles.detailValue}>
              {expense.category || 'Uncategorized'}
            </span>
          </div>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Split Among ({participants.length})</h2>
        
        {participants.length > 0 ? (
          <ul className={styles.participantsList}>
            {participants.map(user => (
              <li key={user.id} className={styles.participantItem}>
                {user.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>This expense isn't split with anyone.</p>
        )}
      </div>
      
      {expense.notes && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notes</h2>
          <p className={styles.notes}>{expense.notes}</p>
        </div>
      )}
      
      <div className={styles.actions}>
        <button 
          className={`${styles.actionButton} ${styles.editButton}`}
          onClick={() => router.push(`/expenses/edit/${expenseId}`)}
        >
          Edit Expense
        </button>
      </div>
    </div>
  );
}
