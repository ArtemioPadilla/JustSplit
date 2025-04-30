'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import { exportExpensesToCSV } from '../../../utils/csvExport';
import styles from './page.module.css';

export default function EventDetail() {
  const router = useRouter();
  const params = useParams();
  const { state } = useAppContext();
  const eventId = params.id as string;
  
  const event = useMemo(() => {
    return state.events.find(e => e.id === eventId);
  }, [state.events, eventId]);
  
  const participants = useMemo(() => {
    if (!event) return [];
    return state.users.filter(user => event.participants.includes(user.id));
  }, [event, state.users]);

  // Get all expenses for this event
  const eventExpenses = useMemo(() => {
    if (!event) return [];
    return state.expenses
      .filter(expense => expense.eventId === eventId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [event, state.expenses, eventId]);

  // Calculate user balances for this event
  const eventBalances = useMemo(() => {
    if (!event) return {};
    
    const balances: Record<string, number> = {};
    
    // Initialize all participant balances to 0
    event.participants.forEach(userId => {
      balances[userId] = 0;
    });
    
    // Calculate balances based on expenses
    eventExpenses.forEach(expense => {
      if (expense.settled) return;
      
      const payer = expense.paidBy;
      const participants = expense.participants;
      const amountPerPerson = expense.amount / participants.length;
      
      // Add to the payer's balance (they are owed money)
      balances[payer] = (balances[payer] || 0) + expense.amount;
      
      // Subtract from each participant's balance (they owe money)
      participants.forEach(participantId => {
        balances[participantId] = (balances[participantId] || 0) - amountPerPerson;
      });
    });
    
    return balances;
  }, [event, eventExpenses]);

  // Calculate event statistics
  const eventStats = useMemo(() => {
    if (!event) return { totalExpenses: 0, totalAmount: 0, unsettledAmount: 0 };
    
    const totalAmount = eventExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const unsettledExpenses = eventExpenses.filter(exp => !exp.settled);
    const unsettledAmount = unsettledExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return {
      totalExpenses: eventExpenses.length,
      totalAmount,
      unsettledAmount
    };
  }, [event, eventExpenses]);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = state.users.find(user => user.id === userId);
    return user ? user.name : 'Unknown';
  };
  
  if (!event) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Event Not Found</h1>
        <p>The event you're looking for doesn't exist or has been deleted.</p>
        <Link href="/events/list" className={styles.backButton}>
          Return to Events List
        </Link>
      </div>
    );
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{event.name}</h1>
        <Link href="/events/list" className={styles.backButton}>
          Back to Events
        </Link>
      </div>
      
      {event.description && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Description</h2>
          <p className={styles.description}>{event.description}</p>
        </div>
      )}
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Dates</h2>
        <div className={styles.dates}>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>Start Date:</span>
            <span className={styles.dateValue}>{new Date(event.startDate).toLocaleDateString()}</span>
          </div>
          
          {event.endDate && (
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>End Date:</span>
              <span className={styles.dateValue}>{new Date(event.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Summary</h2>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{eventStats.totalExpenses}</span>
            <span className={styles.statLabel}>Expenses</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>${eventStats.totalAmount.toFixed(2)}</span>
            <span className={styles.statLabel}>Total Amount</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>${eventStats.unsettledAmount.toFixed(2)}</span>
            <span className={styles.statLabel}>Unsettled</span>
          </div>
        </div>
      </div>
      
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Participants</h2>
        {participants.length > 0 ? (
          <ul className={styles.participantsList}>
            {participants.map(user => {
              const balance = eventBalances[user.id] || 0;
              return (
                <li key={user.id} className={styles.participantItem}>
                  <span>{user.name}</span>
                  <span className={`${styles.participantBalance} ${balance > 0 ? styles.positive : balance < 0 ? styles.negative : ''}`}>
                    {balance > 0 ? '+' : ''}{balance.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p>No participants in this event.</p>
        )}
      </div>
      
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Expenses</h2>
          <button 
            className={styles.addExpenseButton}
            onClick={() => router.push(`/expenses/new?event=${eventId}`)}
          >
            Add Expense
          </button>
        </div>
        
        {eventExpenses.length > 0 ? (
          <div className={styles.expensesList}>
            {eventExpenses.map(expense => (
              <div key={expense.id} className={styles.expenseCard}>
                <div className={styles.expenseHeader}>
                  <h3 className={styles.expenseName}>{expense.description}</h3>
                  <span className={styles.expenseAmount}>
                    {expense.currency} {expense.amount.toFixed(2)}
                  </span>
                </div>
                
                <div className={styles.expenseDetails}>
                  <div className={styles.expenseDetail}>
                    <span className={styles.detailLabel}>Date:</span>
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  
                  <div className={styles.expenseDetail}>
                    <span className={styles.detailLabel}>Paid by:</span>
                    <span>{getUserName(expense.paidBy)}</span>
                  </div>
                  
                  <div className={styles.expenseDetail}>
                    <span className={styles.detailLabel}>Split among:</span>
                    <span>{expense.participants.length} people</span>
                  </div>
                  
                  <div className={styles.expenseDetail}>
                    <span className={styles.detailLabel}>Status:</span>
                    <span className={expense.settled ? styles.settledBadge : styles.unsettledBadge}>
                      {expense.settled ? 'Settled' : 'Unsettled'}
                    </span>
                  </div>
                </div>
                
                <div className={styles.expenseActions}>
                  <Link href={`/expenses/${expense.id}`} className={styles.viewExpenseButton}>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyExpenses}>
            <p>No expenses added to this event yet.</p>
          </div>
        )}
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.actionButton}
          onClick={() => router.push(`/expenses/new?event=${eventId}`)}
        >
          Add Expense
        </button>
        
        <button
          className={`${styles.actionButton} ${styles.editButton}`}
          onClick={() => router.push(`/events/edit/${eventId}`)}
        >
          Edit Event
        </button>
        
        <button
          className={`${styles.actionButton} ${styles.secondaryButton}`}
          onClick={() => router.push(`/settlements?event=${eventId}`)}
        >
          View Settlements
        </button>
        
        <button
          className={`${styles.actionButton} ${styles.tertiaryButton}`}
          onClick={() => exportExpensesToCSV(
            eventExpenses, 
            state.users, 
            state.events, 
            `${event.name}-expenses.csv`
          )}
          disabled={eventExpenses.length === 0}
        >
          Export as CSV
        </button>
      </div>
    </div>
  );
}
