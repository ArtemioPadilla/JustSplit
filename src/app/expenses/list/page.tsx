'use client';

import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import { exportExpensesToCSV } from '../../../utils/csvExport';

export default function ExpenseList() {
  const { state } = useAppContext();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  // Get unique list of events that have expenses
  const eventsWithExpenses = [...new Set(state.expenses.map(expense => expense.eventId))];
  const events = state.events.filter(event => eventsWithExpenses.includes(event.id));

  // Filter expenses based on selected event
  const filteredExpenses = selectedEvent === 'all' 
    ? state.expenses 
    : state.expenses.filter(expense => expense.eventId === selectedEvent);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = state.users.find(user => user.id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Get event name by ID
  const getEventName = (eventId: string) => {
    const event = state.events.find(event => event.id === eventId);
    return event ? event.name : 'No Event';
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Expenses</h1>
      
      <div className={styles.actions}>
        <Link href="/expenses/new" className={styles.createButton}>
          Add New Expense
        </Link>
        
        <button 
          className={styles.exportButton}
          onClick={() => exportExpensesToCSV(
            filteredExpenses, 
            state.users, 
            state.events, 
            selectedEvent === 'all' ? 'all-expenses.csv' : `${getEventName(selectedEvent)}-expenses.csv`
          )}
          disabled={filteredExpenses.length === 0}
        >
          Export as CSV
        </button>
        
        <div className={styles.filter}>
          <label htmlFor="event-filter">Filter by Event:</label>
          <select 
            id="event-filter" 
            className={styles.select}
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      {filteredExpenses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No expenses found. Start by adding your first expense!</p>
        </div>
      ) : (
        <div className={styles.expensesList}>
          {filteredExpenses.map(expense => (
            <div key={expense.id} className={styles.expenseCard}>
              <div className={styles.expenseHeader}>
                <h2 className={styles.expenseName}>{expense.description}</h2>
                <span className={styles.expenseAmount}>
                  {expense.amount.toFixed(2)} {expense.currency}
                </span>
              </div>
              
              <div className={styles.expenseDetails}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Paid by:</span>
                  <span className={styles.detailValue}>{getUserName(expense.paidBy)}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Date:</span>
                  <span className={styles.detailValue}>
                    {new Date(expense.date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Event:</span>
                  <span className={styles.detailValue}>{getEventName(expense.eventId)}</span>
                </div>
                
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Split among:</span>
                  <span className={styles.detailValue}>
                    {expense.participants?.length || 0} people
                  </span>
                </div>
              </div>
              
              <div className={styles.actions}>
                <Link href={`/expenses/${expense.id}`} className={styles.viewButton}>
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
