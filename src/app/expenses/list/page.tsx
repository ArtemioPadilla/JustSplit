'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import { exportExpensesToCSV } from '../../../utils/csvExport';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, convertCurrency, formatCurrency, clearExchangeRateCache } from '../../../utils/currencyExchange';
import EditableText from '../../../components/ui/EditableText';

export default function ExpenseList() {
  const { state, dispatch } = useAppContext();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedExpenses, setConvertedExpenses] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingExpenses, setUpdatingExpenses] = useState<Record<string, boolean>>({});

  // Get unique list of events that have expenses - use optional chaining for safety
  const eventsWithExpenses = [...new Set(state.expenses?.map(expense => expense.eventId) || [])];
  const events = state.events?.filter(event => eventsWithExpenses.includes(event.id)) || [];

  // Filter expenses based on selected event
  const filteredExpenses = selectedEvent === 'all' 
    ? state.expenses || []
    : (state.expenses || []).filter(expense => expense.eventId === selectedEvent);

  // Set default currency based on event preference or user preference
  useEffect(() => {
    // ...existing code...
  }, [selectedEvent, state.events, state.users]);

  // Handle refreshing rates
  const handleRefreshRates = async () => {
    // ...existing code...
  };
  
  // Function to perform currency conversion
  const performConversion = async () => {
    // ...existing code...
  };
  
  // Effect to handle currency conversion when target currency changes
  useEffect(() => {
    performConversion();
  }, [filteredExpenses, targetCurrency]);

  // Handle expense description update
  const handleExpenseDescriptionUpdate = (expenseId: string, newDescription: string) => {
    // ...existing code...
  };

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
      
      {!state.expenses || state.expenses.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No expenses found. Start by adding your first expense!</p>
          <Link href="/expenses/new" className={styles.createButton}>
            Add Your First Expense
          </Link>
        </div>
      ) : (
        <>
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
            
            <div className={styles.filter}>
              <label htmlFor="currency-filter">Convert to:</label>
              <select 
                id="currency-filter" 
                className={styles.select}
                value={targetCurrency}
                onChange={(e) => setTargetCurrency(e.target.value)}
              >
                {SUPPORTED_CURRENCIES.map(currency => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </option>
                ))}
              </select>
            </div>

            <button 
              className={styles.refreshButton}
              onClick={handleRefreshRates}
              disabled={isRefreshing}
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
            </button>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No expenses found for the selected filters.</p>
            </div>
          ) : (
            <div className={styles.expensesList}>
              {filteredExpenses.map(expense => {
                const isUpdating = updatingExpenses[expense.id] || false;
                return (
                  <div key={expense.id} className={styles.expenseCard}>
                    <div className={styles.expenseHeader}>
                      <EditableText 
                        as="h2"
                        value={expense.description}
                        onSave={(newDescription) => handleExpenseDescriptionUpdate(expense.id, newDescription)}
                        className={`${styles.expenseName} ${isUpdating ? styles.updating : ''}`}
                      />
                      <span className={styles.expenseAmount}>
                        {isConverting ? (
                          <small>Converting...</small>
                        ) : (
                          <>
                            {formatCurrency(convertedExpenses[expense.id] || expense.amount, targetCurrency)}
                            {expense.currency !== targetCurrency && (
                              <small className={styles.originalAmount}>
                                (Originally: {formatCurrency(expense.amount, expense.currency)})
                              </small>
                            )}
                          </>
                        )}
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
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
