'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { User } from '../../../types';
import Link from 'next/link';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import ProgressBar from '../../../components/ui/ProgressBar';
import Button from '../../../components/ui/Button';
import EditableText from '../../../components/ui/EditableText';
import CurrencySelector from '../../../components/ui/CurrencySelector';
import { 
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount
} from '../../../utils/timelineUtils';
import { DEFAULT_CURRENCY, convertCurrency, formatCurrency, clearExchangeRateCache } from '../../../utils/currencyExchange';

export default function EventList() {
  const { state, dispatch, updateEvent } = useAppContext();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ date: '', type: '', status: '' });
  const [updatingEvents, setUpdatingEvents] = useState<Record<string, boolean>>({});
  // const [sortBy, setSortBy] = useState('date'); // Default sort by date
  // const [sortOrder, setSortOrder] = useState('desc'); // Default sort order
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedTotals, setConvertedTotals] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Get current date range for date filter
  const currentYear = new Date().getFullYear();
  const dateRanges = ['All Dates', `${currentYear} (This Year)`, `${currentYear-1} (Last Year)`];

  const toggleParticipants = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters({ ...filters, [filterType]: value });
  };

  const handleEventNameUpdate = async (eventId: string, newName: string) => {
    setUpdatingEvents({ ...updatingEvents, [eventId]: true });
    
    // Find the event to update
    const eventToUpdate = state.events.find(event => event.id === eventId);
    
    if (eventToUpdate) {
      try {
        // Create updated event with new name
        const updatedEvent = { ...eventToUpdate, name: newName };
        
        // Dispatch update action for local state
        dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
        
        // Update in database - add this line to persist changes
        await updateEvent(eventId, { name: newName });
        
      } catch (error) {
        console.error('Error updating event name:', error);
        alert('Failed to update event name. Please try again.');
      } finally {
        // Clear updating status after a short delay to show feedback
        setTimeout(() => {
          setUpdatingEvents(prev => ({ ...prev, [eventId]: false }));
        }, 500);
      }
    }
  };

  // Function to calculate total amount for an event
  const calculateEventTotal = (eventId: string) => {
    const eventExpenses = state.expenses.filter(expense => expense.eventId === eventId);
    return eventExpenses.reduce((total, expense) => total + expense.amount, 0);
  };

  // Calculate and store all event totals
  const eventTotals = state.events.reduce((acc, event) => {
    acc[event.id] = calculateEventTotal(event.id);
    return acc;
  }, {} as Record<string, number>);

  // Handle refreshing rates
  const handleRefreshRates = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear the exchange rate cache to force fetching fresh rates
      clearExchangeRateCache();
      
      // Re-trigger conversion with fresh rates
      await performConversion();
    } catch (error) {
      console.error('Error refreshing exchange rates:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // Visual feedback delay
    }
  };
  
  // Function to perform currency conversion
  const performConversion = useCallback(async () => {
    if (state.events.length === 0) return;
    
    setIsConverting(true);
    
    const converted: Record<string, number> = {};
    
    try {
      for (const event of state.events) {
        // Calculate the event's original total and currency
        const eventExpenses = state.expenses.filter(expense => expense.eventId === event.id);
        
        if (eventExpenses.length === 0) {
          converted[event.id] = 0;
          continue;
        }
        
        // Convert each expense amount and sum them up
        let total = 0;
        for (const expense of eventExpenses) {
          const { convertedAmount } = await convertCurrency(
            expense.amount,
            expense.currency,
            targetCurrency
          );
          total += convertedAmount;
        }
        
        converted[event.id] = total;
      }
      
      setConvertedTotals(converted);
    } catch (error) {
      console.error('Error converting currencies:', error);
    } finally {
      setIsConverting(false);
    }
  }, [state.events, state.expenses, targetCurrency]);
  
  // Effect to handle currency conversion when target currency changes
  useEffect(() => {
    performConversion();
  }, [state.events, state.expenses, targetCurrency, performConversion]);  // Sort events by the selected criteria
  /* // TODO: Re-enable sorting functionality when needed
  const sortedEvents = [...state.events].sort((a, b) => {
    // Default to date sorting
    if (sortBy === 'date') {
      const dateA = new Date(a.startDate || 0).getTime();
      const dateB = new Date(b.startDate || 0).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    }
    
    // Sort by name
    if (sortBy === 'name') {
      return sortOrder === 'asc'
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    }
    
    // Sort by total amount
    if (sortBy === 'amount') {
      const amountA = isConverting ? convertedTotals[a.id] || 0 : eventTotals[a.id] || 0;
      const amountB = isConverting ? convertedTotals[b.id] || 0 : eventTotals[b.id] || 0;
      return sortOrder === 'asc' ? amountA - amountB : amountB - amountA;
    }
    
    return 0;
  });

  // Toggle sort order or change sort field
  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if clicking on the same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Change field and set default sort order
      setSortBy(field);
      setSortOrder('desc'); // Default to descending order on field change
    }
  };
  */

  const filteredEvents = state.events.filter((event) => {
    // Apply date filter
    if (filters.date && filters.date !== 'All Dates') {
      const year = parseInt(filters.date.split(' ')[0]);
      const eventYear = new Date(event.startDate || event.date).getFullYear();
      if (eventYear !== year) return false;
    }
    
    return true;
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Events</h1>
      
      {state.events.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven&apos;t created any events yet.</p>
          <Link href="/events/new">
            <Button variant="primary">Create Your First Event</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.buttonContainer}>
            <Link href="/events/new">
              <Button variant="primary">Create New Event</Button>
            </Link>
          </div>

          <div className={styles.filters}>
            <select 
              value={filters.date} 
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className={styles.filterSelect}
            >
              <option value="">All Dates</option>
              {dateRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
            
            {/* Add Currency Selector here */}
            <div className={styles.currencyFilterContainer}>
              <CurrencySelector
                value={targetCurrency}
                onChange={setTargetCurrency}
                showRefreshButton={true}
                onRefresh={handleRefreshRates}
                isRefreshing={isRefreshing}
                label="Convert to:"
                id="events-currency-filter"
                compact={true}
              />
            </div>
          </div>
          
          <div className={styles.eventsList}>
            {filteredEvents.map((event) => {
              // Get event expenses
              const eventExpenses = state.expenses.filter(expense => expense.eventId === event.id);
              const totalByCurrency = calculateTotalByCurrency(eventExpenses);
              const unsettledAmounts = calculateUnsettledAmount(eventExpenses);
              
              // Calculate metrics
              // const totalExpenses = Object.values(totalByCurrency).reduce((sum, total) => sum + total, 0);
              const settledPercentage = calculateSettledPercentage(eventExpenses);
              const isUpdating = updatingEvents[event.id] || false;

              // Calculate expenses and total for this event
              const totalAmount = eventTotals[event.id] || 0;
              // const convertedAmount = isConverting ? convertedTotals[event.id] || 0 : totalAmount;
              
              // Determine primary currency for this event
              let eventCurrency = '';
              if (eventExpenses.length > 0) {
                // Use the most common currency among expenses
                const currencyCounts = eventExpenses.reduce((acc, expense) => {
                  acc[expense.currency] = (acc[expense.currency] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                
                eventCurrency = Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || DEFAULT_CURRENCY;
              } else {
                eventCurrency = DEFAULT_CURRENCY;
              }
              
              // Update the metrics display to show converted amounts
              return (
                <div key={event.id} className={styles.eventCard}>
                  {/* Replace static event name with editable component */}
                  <EditableText 
                    as="h2"
                    value={event.name}
                    onSave={(newName) => handleEventNameUpdate(event.id, newName)}
                    className={`${styles.eventName} ${isUpdating ? styles.updating : ''}`}
                  />
                  
                  {event.description && (
                    <p className={styles.eventDescription}>{event.description}</p>
                  )}
                  
                  {/* Use our Timeline component */}
                  <Timeline 
                    event={{
                      ...event,
                      startDate: event.startDate || event.date || '',
                    }}
                    expenses={eventExpenses.map(exp => ({
                      ...exp,
                      date: exp.date,
                      type: 'expense',
                      title: exp.description,
                      eventName: event.name,
                      userNames: Object.fromEntries(exp.participants.map(pid => {
                        const user = state.users.find(u => u.id === pid);
                        return [pid, user ? user.name : 'Unknown'];
                      })),
                      category: exp.category ?? '',
                    }))} 
                  />
                  
                  {/* Event Metrics - Update this section */}
                  <div className={styles.metrics}>
                    <div className={styles.metric}>
                      <span className={styles.metricIcon}>💰</span>
                      <span className={styles.metricValue}>
                        {isConverting ? (
                          <span className={styles.convertingIndicator}>Converting...</span>
                        ) : (
                          <>
                            {/* Determine which amount to display */}
                            {targetCurrency !== DEFAULT_CURRENCY || convertedTotals[event.id] ? (
                              // Show converted amount when we have conversions
                              <>
                                {formatCurrency(convertedTotals[event.id] || 0, targetCurrency)}
                                
                                {/* Show original amount if conversion was applied */}
                                {eventCurrency !== targetCurrency && totalAmount > 0 && (
                                  <span className={styles.originalAmount}>
                                    (Originally: {formatCurrency(totalAmount, eventCurrency)})
                                  </span>
                                )}
                              </>
                            ) : (
                              // Show original amounts grouped by currency
                              <>
                                {Object.entries(totalByCurrency).length > 0 ? 
                                  Object.entries(totalByCurrency)
                                    .map(([currency, amount], index) => (
                                      <span key={currency}>
                                        {formatCurrency(amount, currency)}
                                        {index < Object.entries(totalByCurrency).length - 1 ? ', ' : ''}
                                      </span>
                                    )) : 
                                  '0.00'
                                }
                              </>
                            )}
                          </>
                        )}
                      </span>
                    </div>
                    
                    <div className={styles.metric}>
                      <span className={styles.metricIcon}>👥</span>
                      <span>Participants: {event.members?.length || 0}</span>
                    </div>
                    
                    {Object.keys(unsettledAmounts).length > 0 && (
                      <div className={styles.metric}>
                        <span className={styles.metricIcon}>⚠️</span>
                        <span>
                          Unsettled: {Object.entries(unsettledAmounts).map(([currency, amount]) => 
                            `${amount.toFixed(2)} ${currency}`
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Settlement progress */}
                  <div className={styles.progressContainer}>
                    <div className={styles.progressLabel}>
                      <span>Settlement Progress</span>
                      <span>{settledPercentage}%</span>
                    </div>
                    <ProgressBar
                      value={settledPercentage}
                      variant={
                        settledPercentage === 100 ? 'success' :
                        settledPercentage >= 75 ? 'info' :
                        settledPercentage >= 50 ? 'warning' : 'danger'
                      }
                    />
                  </div>
                  
                  {/* Participants */}
                  <div className={styles.participantsContainer}>
                    <Button
                      aria-label={`Show participants for ${event.name}`}
                      onClick={() => toggleParticipants(event.id)}
                      variant="primary"
                    >
                      {expandedEventId === event.id ? 'Hide Participants' : 'Show Participants'} 
                      ({event.members.length})
                    </Button>
                    
                    <ul className={`${styles.participantsList} ${expandedEventId === event.id ? styles.participantsListExpanded : ''}`}>
                      {event.members.map((memberId: string) => {
                        const participant = state.users.find((user: User) => user.id === memberId);
                        return (
                          <li key={memberId} className={styles.participantItem}>
                            {participant?.name ?? 'Unknown'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  
                  <div className={styles.totalByCurrency}>
                    {Object.entries(totalByCurrency).map(([currency, total]) => (
                      <p key={currency} className={styles.secondaryText}>{currency}: {total.toFixed(2)}</p>
                    ))}
                  </div>
                  
                  <div className={styles.actions}>
                    <Link href={`/events/${event.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
