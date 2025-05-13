'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import { exportExpensesToCSV } from '../../../utils/csvExport';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, convertCurrency, formatCurrency, clearExchangeRateCache } from '../../../utils/currencyExchange';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import ProgressBar from '../../../components/ui/ProgressBar';
import { calculateSettledPercentage } from '../../../utils/timelineUtils';
import Button from '../../../components/ui/Button';
import EditableText from '../../../components/ui/EditableText';

export default function EventDetail() {
  const router = useRouter();
  const params = useParams();
  const { state, dispatch } = useAppContext();
  const eventId = params.id as string;
  
  // Selected currency for display
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  
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

  // Calculate settlement percentage for progress bar
  const settledPercentage = useMemo(() => {
    return calculateSettledPercentage(eventExpenses);
  }, [eventExpenses]);

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

  // Calculate event statistics with currency conversion
  const eventStats = useMemo(() => {
    if (!event) return { totalExpenses: 0, totalAmount: 0, unsettledAmount: 0 };
    
    // Default values (without conversion)
    let totalAmount = eventExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const unsettledExpenses = eventExpenses.filter(exp => !exp.settled);
    let unsettledAmount = unsettledExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // If we have converted amounts, use them instead
    if (Object.keys(convertedAmounts).length > 0 && !isConverting) {
      totalAmount = eventExpenses.reduce((sum, exp) => {
        return sum + (convertedAmounts[exp.id] || exp.amount);
      }, 0);
      
      unsettledAmount = unsettledExpenses.reduce((sum, exp) => {
        return sum + (convertedAmounts[exp.id] || exp.amount);
      }, 0);
    }
    
    return {
      totalExpenses: eventExpenses.length,
      totalAmount,
      unsettledAmount
    };
  }, [event, eventExpenses, convertedAmounts, isConverting]);

  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = state.users.find(user => user.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Initialize target currency from event's preferred currency
  useEffect(() => {
    if (event?.preferredCurrency) {
      setTargetCurrency(event.preferredCurrency);
    }
  }, [event]);

  // Function to perform currency conversion
  const performConversion = async () => {
    if (eventExpenses.length === 0) return;
    
    setIsConverting(true);
    const newConvertedAmounts: Record<string, number> = {};
    
    for (const expense of eventExpenses) {
      if (expense.currency === targetCurrency) {
        newConvertedAmounts[expense.id] = expense.amount;
      } else {
        try {
          const { convertedAmount } = await convertCurrency(
            expense.amount,
            expense.currency,
            targetCurrency
          );
          newConvertedAmounts[expense.id] = convertedAmount;
        } catch (error) {
          console.error(`Error converting expense ${expense.id}:`, error);
          // Fallback to original amount if conversion fails
          newConvertedAmounts[expense.id] = expense.amount;
        }
      }
    }
    
    setConvertedAmounts(newConvertedAmounts);
    setIsConverting(false);
  };
  
  // Handle refreshing rates
  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    try {
      // Clear the exchange rate cache
      clearExchangeRateCache();
      
      // Trigger conversion with fresh rates
      await performConversion();
      
      // Show a confirmation
      alert("Exchange rates have been refreshed!");
    } catch (error) {
      console.error("Error refreshing rates:", error);
      alert("Failed to refresh rates. Please try again.");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Effect to handle currency conversion when target currency changes
  useEffect(() => {
    performConversion();
  }, [targetCurrency, eventExpenses]);

  // Handle event name update
  const handleEventNameUpdate = (newName: string) => {
    if (!event) return;
    
    setIsUpdating(true);
    
    // Create updated event with new name
    const updatedEvent = { ...event, name: newName };
    
    // Dispatch update action
    dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
    
    // Clear updating status after a short delay to show feedback
    setTimeout(() => {
      setIsUpdating(false);
    }, 500);
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
        <EditableText
          as="h1"
          value={event.name}
          onSave={handleEventNameUpdate}
          className={`${styles.title} ${isUpdating ? styles.updating : ''}`}
        />
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
      
      {/* Timeline Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Event Timeline</h2>
        <Timeline 
          event={event} 
          expenses={eventExpenses} 
        />
        <div className={styles.timelineFooter}>
          <div className={styles.settlementProgress}>
            <p className={styles.progressTitle}>Settlement Progress</p>
            <ProgressBar 
              value={settledPercentage} 
              variant={
                settledPercentage === 100 ? 'success' :
                settledPercentage >= 75 ? 'info' :
                settledPercentage >= 50 ? 'warning' : 'danger'
              }
            />
          </div>
        </div>
      </div>
      
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
        <div className={styles.currencySelector}>
          <div className={styles.currencyControl}>
            <label htmlFor="targetCurrency">Display Currency:</label>
            <select
              id="targetCurrency"
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              disabled={isConverting || isRefreshing}
              className={styles.currencySelect}
            >
              {SUPPORTED_CURRENCIES.map(currency => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} ({currency.symbol}) - {currency.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleRefreshRates}
            disabled={isConverting || isRefreshing}
            variant="secondary"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Rates'}
          </Button>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{eventStats.totalExpenses}</span>
            <span className={styles.statLabel}>Expenses</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {formatCurrency(eventStats.totalAmount, targetCurrency)}
            </span>
            <span className={styles.statLabel}>Total Amount</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>
              {formatCurrency(eventStats.unsettledAmount, targetCurrency)}
            </span>
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
          <Button 
            variant="primary"
            onClick={() => router.push(`/expenses/new?event=${eventId}`)}
          >
            Add Expense
          </Button>
        </div>
        
        {eventExpenses.length > 0 ? (
          <div className={styles.expensesList}>
            {eventExpenses.map(expense => (
              <div key={expense.id} className={styles.expenseCard}>
                <div className={styles.expenseHeader}>
                  <h3 className={styles.expenseName}>{expense.description}</h3>
                  <span className={styles.expenseAmount}>
                    {targetCurrency} {isConverting ? '...' : 
                      convertedAmounts[expense.id] ? convertedAmounts[expense.id].toFixed(2) : expense.amount.toFixed(2)}
                    {expense.currency !== targetCurrency && convertedAmounts[expense.id] && (
                      <small className={styles.originalAmount}>
                        (Original: {expense.currency} {expense.amount.toFixed(2)})
                      </small>
                    )}
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
        <Button 
          variant="primary"
          onClick={() => router.push(`/expenses/new?event=${eventId}`)}
        >
          Add Expense
        </Button>
        
        <Button
          variant="secondary"
          onClick={() => router.push(`/events/edit/${eventId}`)}
        >
          Edit Event
        </Button>
        
        <Button
          variant="secondary"
          onClick={() => router.push(`/settlements?event=${eventId}`)}
        >
          View Settlements
        </Button>
        
        <Button
          variant="secondary"
          onClick={() => exportExpensesToCSV(
            eventExpenses, 
            state.users, 
            state.events, 
            `${event.name}-expenses.csv`
          )}
          disabled={eventExpenses.length === 0}
        >
          Export as CSV
        </Button>
      </div>
    </div>
  );
}
