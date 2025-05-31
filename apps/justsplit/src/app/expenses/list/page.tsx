'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import { exportExpensesToCSV } from '../../../utils/csvExport';
import { DEFAULT_CURRENCY, convertCurrency, formatCurrency } from '../../../utils/currencyExchange';
import EditableText from '../../../components/ui/EditableText';
import CurrencySelector from '../../../components/ui/CurrencySelector';

export default function ExpenseList() {
  const { state, dispatch, updateExpense } = useAppContext();
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedExpenses, setConvertedExpenses] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingExpenses, setUpdatingExpenses] = useState<Record<string, boolean>>({});

  // Get unique list of events that have expenses - use optional chaining for safety
  const eventsWithExpenses = Array.from(
    new Set(
      (state.expenses || [])
        .map(expense => expense.eventId)
        .filter((id): id is string => id !== undefined)
    )
  );
  const events = state.events?.filter(event => eventsWithExpenses.includes(event.id)) || [];

  // Filter expenses based on selected event
  const filteredExpenses = useMemo(() => 
    selectedEvent === 'all' 
      ? state.expenses || []
      : (state.expenses || []).filter(expense => expense.eventId === selectedEvent),
    [selectedEvent, state.expenses]
  );

  // Set default currency based on event preference or user preference
  useEffect(() => {
    // ...existing code...
  }, [selectedEvent, state.events, state.users]);

  // Handle refreshing rates
  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      // Force re-conversion with fresh rates
      await performConversion();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Function to perform currency conversion
  const performConversion = useCallback(async () => {
    if (filteredExpenses.length === 0) return;
    
    setIsConverting(true);
    
    const converted: Record<string, number> = {};
    
    try {
      for (const expense of filteredExpenses) {
        if (expense.currency === targetCurrency) {
          // No conversion needed
          converted[expense.id] = expense.amount;
        } else {
          // Convert the amount
          const { convertedAmount } = await convertCurrency(
            expense.amount,
            expense.currency,
            targetCurrency
          );
          converted[expense.id] = convertedAmount;
        }
      }
      
      setConvertedExpenses(converted);
    } catch (error) {
      console.error('Error converting currencies:', error);
    } finally {
      setIsConverting(false);
    }
  }, [filteredExpenses, targetCurrency]);
  
  // Effect to handle currency conversion when target currency changes
  useEffect(() => {
    performConversion();
  }, [filteredExpenses, targetCurrency, performConversion]);

  // Handle expense description update
  const handleExpenseDescriptionUpdate = async (expenseId: string, newDescription: string) => {
    try {
      // First, update local state for responsive UI
      setUpdatingExpenses(prev => ({ ...prev, [expenseId]: true }));
      
      // Find the expense to update
      const expense = state.expenses.find(e => e.id === expenseId);
      if (!expense) {
        console.error(`Expense with ID ${expenseId} not found`);
        return;
      }
      
      // Update in local state via dispatch
      const updatedExpense = { ...expense, description: newDescription };
      dispatch({ type: 'UPDATE_EXPENSE', payload: updatedExpense });
      
      // Update in Firestore
      await updateExpense(expenseId, { description: newDescription });
      
      console.log(`Expense ${expenseId} description updated to: ${newDescription}`);
    } catch (error) {
      console.error('Error updating expense description:', error);
      alert('Failed to update expense description. Please try again.');
    } finally {
      // Clear updating state after a short delay
      setTimeout(() => {
        setUpdatingExpenses(prev => ({ ...prev, [expenseId]: false }));
      }, 500);
    }
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
              <CurrencySelector
                value={targetCurrency}
                onChange={setTargetCurrency}
                showRefreshButton={true}
                onRefresh={handleRefreshRates}
                isRefreshing={isRefreshing}
                label="Convert to:"
                id="currency-filter"
                compact={true}
                className={styles.currencyFilter}
              />
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No expenses found for the selected filters.</p>
            </div>
          ) : (
            <div className={styles.expensesList}>
              {filteredExpenses.map(expense => {
                const isUpdating = updatingExpenses[expense.id] || false;
                const isConverted = isConverting || 
                  (convertedExpenses[expense.id] && expense.currency !== targetCurrency);
                const displayAmount = convertedExpenses[expense.id] || expense.amount;
                
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
                            {formatCurrency(displayAmount, targetCurrency)}
                            {isConverted && expense.currency !== targetCurrency && (
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
                        <span className={styles.detailValue}>
                          {expense.eventId ? getEventName(expense.eventId) : 'No Event'}
                        </span>
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
