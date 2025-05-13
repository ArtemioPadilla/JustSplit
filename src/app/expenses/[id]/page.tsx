'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import Button from '../../../components/ui/Button';
import EditableText from '../../../components/ui/EditableText';

export default function ExpenseDetail() {
  const router = useRouter();
  const params = useParams();
  const { state, dispatch } = useAppContext();
  const expenseId = params.id as string;
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  
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
  
  // Get event expenses for timeline
  const eventExpenses = useMemo(() => {
    if (!event) return [];
    return state.expenses.filter(e => e.eventId === event.id);
  }, [event, state.expenses]);
  
  // Handle expense description update
  const handleExpenseDescriptionUpdate = (newDescription: string) => {
    if (!expense) return;
    
    setIsUpdating(true);
    
    // Create updated expense with new description
    const updatedExpense = { ...expense, description: newDescription };
    
    // Dispatch update action
    dispatch({ type: 'UPDATE_EXPENSE', payload: updatedExpense });
    
    // Clear updating status after a short delay to show feedback
    setTimeout(() => {
      setIsUpdating(false);
    }, 500);
  };
  
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
        <EditableText
          as="h1"
          value={expense.description}
          onSave={handleExpenseDescriptionUpdate}
          className={`${styles.title} ${isUpdating ? styles.updating : ''}`}
        />
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
      
      {/* Add Timeline section if expense is part of an event */}
      {event && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Expense Timeline</h2>
          <Timeline 
            event={event} 
            expenses={eventExpenses} 
          />
          <div className={styles.eventDetails}>
            <span className={styles.detailLabel}>Part of Event:</span>
            <Link href={`/events/${event.id}`} className={styles.eventLink}>
              {event.name}
            </Link>
          </div>
        </div>
      )}
      
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
          
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Status</span>
            <span className={`${styles.detailValue} ${expense.settled ? styles.settled : styles.unsettled}`}>
              {expense.settled ? 'Settled' : 'Unsettled'}
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
      
      {expense.images && expense.images.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Receipts & Evidence</h2>
          <div className={styles.imageGallery}>
            {expense.images.map((image, index) => (
              <div key={index} className={styles.imageContainer}>
                <a href={image} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={image} 
                    alt={`Receipt ${index + 1}`} 
                    className={styles.image} 
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className={styles.actions}>
        {/* Export to CSV button */}
        <Button 
          onClick={() => {
            import('../../../utils/csvExport').then(module => {
              module.exportExpensesToCSV(
                [expense], 
                state.users, 
                state.events, 
                `expense-${expense.id}.csv`
              );
            });
          }} 
          variant="secondary"
        >
          Export as CSV
        </Button>
        
        <Button 
          onClick={() => router.push(`/expenses/edit/${expenseId}`)} 
          variant="secondary"
        >
          Edit Expense
        </Button>
      </div>
    </div>
  );
}
