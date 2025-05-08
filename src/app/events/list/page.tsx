'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext, User } from '../../../context/AppContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { LinearProgress } from '@mui/material';
import { format } from 'date-fns';

// Define the Event type explicitly
interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  participants: string[];
  type?: string;
  status?: string;
}

// Define the Expense type explicitly
interface Expense {
  id: string;
  eventId: string | undefined;
  amount: number;
  currency: string;
  settled?: boolean;
  date: string;
  description?: string;
}

export default function EventList() {
  const router = useRouter();
  const { state } = useAppContext();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ date: '', type: '', status: '' });
  
  // State for expense group hover card
  const [activeGroup, setActiveGroup] = useState<{
    position: { x: number, y: number },
    expenses: Expense[]
  } | null>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);
  
  // Close hover card when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (hoverCardRef.current && !hoverCardRef.current.contains(event.target as Node)) {
        setActiveGroup(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Extract unique types and statuses for filter options
  const eventTypes = [...new Set(state.events.map(event => event.type || 'Unspecified'))];
  const eventStatuses = [...new Set(state.events.map(event => event.status || 'Unspecified'))];
  
  // Get current date range for date filter
  const currentYear = new Date().getFullYear();
  const dateRanges = ['All Dates', `${currentYear} (This Year)`, `${currentYear-1} (Last Year)`];

  const toggleParticipants = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters({ ...filters, [filterType]: value });
  };

  const filteredEvents = state.events.filter((event: Event) => {
    // Apply date filter
    if (filters.date && filters.date !== 'All Dates') {
      const year = parseInt(filters.date.split(' ')[0]);
      const eventYear = new Date(event.startDate).getFullYear();
      if (eventYear !== year) return false;
    }
    
    // Apply type filter
    if (filters.type && event.type !== filters.type && filters.type !== 'All Types') {
      return false;
    }
    
    // Apply status filter
    if (filters.status && event.status !== filters.status && filters.status !== 'All Statuses') {
      return false;
    }
    
    return true;
  });

  // Helper function to calculate the percentage of expenses settled
  const calculateSettledPercentage = (expenses: Expense[]): number => {
    if (expenses.length === 0) return 0;
    
    const settledExpenses = expenses.filter(expense => expense.settled === true);
    return (settledExpenses.length / expenses.length) * 100;
  };

  const calculateTotalByCurrency = (expenses: Expense[]): Record<string, number> => {
    const totals: Record<string, number> = {};
    expenses.forEach((expense: Expense) => {
      if (!totals[expense.currency]) {
        totals[expense.currency] = 0;
      }
      totals[expense.currency] += expense.amount;
    });
    return totals;
  };

  // Helper function to calculate unsettled amount
  const calculateUnsettledAmount = (expenses: Expense[]): Record<string, number> => {
    const unsettled: Record<string, number> = {};
    expenses.forEach((expense: Expense) => {
      if (expense.settled !== true) {
        if (!unsettled[expense.currency]) {
          unsettled[expense.currency] = 0;
        }
        unsettled[expense.currency] += expense.amount;
      }
    });
    return unsettled;
  };
  
  // Calculate timeline progress (percentage of time elapsed in event)
  const calculateTimelineProgress = (startDate: string, endDate?: string): number => {
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : new Date().getTime();
    const now = new Date().getTime();
    
    // If event has ended
    if (now > end) return 100;
    
    // If event hasn't started
    if (now < start) return 0;
    
    // Event is ongoing
    const totalDuration = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.round((elapsed / totalDuration) * 100));
  };

  // Enhanced position calculation to handle pre-event and post-event expenses
  const calculatePositionPercentage = (date: string, startDate: string, endDate?: string): number => {
    const targetDate = new Date(date).getTime();
    const start = new Date(startDate).getTime();
    const end = endDate ? new Date(endDate).getTime() : new Date().getTime();
    
    // Calculate the total event duration
    const totalDuration = end - start;
    
    // For pre-event expenses (before start date)
    if (targetDate < start) {
      // Allocate 20% of the timeline for pre-event expenses
      // Find how far back this expense is - up to 30 days before
      const daysBeforeEvent = (start - targetDate) / (1000 * 60 * 60 * 24);
      const maxDaysToShow = 30; // Show up to 30 days before
      const preEventPosition = 20 * Math.min(daysBeforeEvent, maxDaysToShow) / maxDaysToShow;
      return -Math.min(20, preEventPosition); // Cap at -20%
    }
    
    // For post-event expenses (after end date)
    if (endDate && targetDate > end) {
      // Allocate 20% of the timeline for post-event expenses
      // Find how far after this expense is - up to 30 days after
      const daysAfterEvent = (targetDate - end) / (1000 * 60 * 60 * 24);
      const maxDaysToShow = 30; // Show up to 30 days after
      const postEventPosition = 20 * Math.min(daysAfterEvent, maxDaysToShow) / maxDaysToShow;
      return 100 + Math.min(20, postEventPosition); // Start at 100% and go up to 120%
    }
    
    // For expenses exactly on the start date - shift slightly to avoid dot overlap
    if (Math.abs(targetDate - start) < 1000 * 60 * 60) { // Within an hour of start
      return 1; // Position at 1% to avoid overlapping the start dot but still be visible
    }
    
    // For expenses exactly on the end date - shift slightly to avoid dot overlap
    if (endDate && Math.abs(targetDate - end) < 1000 * 60 * 60) { // Within an hour of end
      return 99; // Position at 99% to avoid overlapping the end dot but still be visible
    }
    
    // For expenses within the event period
    if (targetDate >= start && (!endDate || targetDate <= end)) {
      return Math.max(1, Math.min(99, Math.round(((targetDate - start) / totalDuration) * 100)));
    }
    
    // Fallback (should not reach here)
    return 100;
  };

  // Group nearby expenses for hover display
  const groupNearbyExpenses = (expenses: Expense[], event: Event): { position: number, expenses: Expense[] }[] => {
    // Calculate positions for all expenses
    const expensesWithPositions = expenses.map(expense => ({
      expense,
      position: calculatePositionPercentage(expense.date, event.startDate, event.endDate)
    }));

    // Group expenses that are within 5% of each other
    const proximityThreshold = 5;
    const groupedExpenses: { position: number, expenses: Expense[] }[] = [];
    
    for (const { expense, position } of expensesWithPositions) {
      // Find if there's an existing group close to this position
      const existingGroup = groupedExpenses.find(
        group => Math.abs(group.position - position) < proximityThreshold
      );
      
      if (existingGroup) {
        // Add to existing group and adjust average position
        existingGroup.expenses.push(expense);
        // Recalculate the average position for the group
        existingGroup.position = existingGroup.expenses.reduce(
          (sum, exp) => sum + calculatePositionPercentage(exp.date, event.startDate, event.endDate),
          0
        ) / existingGroup.expenses.length;
      } else {
        // Create a new group
        groupedExpenses.push({ position, expenses: [expense] });
      }
    }
    
    return groupedExpenses;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  // Updated click handler for expense markers
  const handleExpenseClick = (e: React.MouseEvent, expenses: Expense[]) => {
    e.stopPropagation();
    setActiveGroup({
      position: { 
        x: e.clientX, 
        y: e.clientY 
      },
      expenses
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Events</h1>
      
      {state.events.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't created any events yet.</p>
          <Link href="/events/new" className={styles.createButton}>
            Create Your First Event
          </Link>
        </div>
      ) : (
        <>
          <Link href="/events/new" className={styles.createButton}>
            Create New Event
          </Link>

          <div className={styles.filters}>
            <select 
              value={filters.date} 
              onChange={(e) => handleFilterChange('date', e.target.value)}
            >
              <option value="">All Dates</option>
              {dateRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
            
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              {eventTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Statuses</option>
              {eventStatuses.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.eventsList}>
            {filteredEvents.map((event: Event) => {
              // Get event expenses
              const eventExpenses = state.expenses.filter((expense: Expense) => expense.eventId === event.id);
              const totalByCurrency = calculateTotalByCurrency(eventExpenses);
              const unsettledAmounts = calculateUnsettledAmount(eventExpenses);
              
              // Calculate metrics
              const totalExpenses = Object.values(totalByCurrency).reduce((sum, total) => sum + total, 0);
              const settledPercentage = calculateSettledPercentage(eventExpenses);
              const timelineProgress = calculateTimelineProgress(event.startDate, event.endDate);

              return (
                <div key={event.id} className={styles.eventCard}>
                  <h2 className={styles.eventName}>{event.name}</h2>
                  
                  {event.description && (
                    <p className={styles.eventDescription}>{event.description}</p>
                  )}
                  
                  {/* Enhanced Timeline for event dates and expenses */}
                  <div className={styles.timelineContainer}>
                    <div className={styles.timeline}>
                      <div 
                        className={styles.timelineProgress} 
                        style={{ width: `${timelineProgress}%` }}
                      />
                      <div 
                        className={styles.timelineDot} 
                        style={{ left: '0%' }} 
                        title={`Event Start: ${formatDate(event.startDate)}`}
                      />
                      {event.endDate && (
                        <div 
                          className={styles.timelineDot} 
                          style={{ left: '100%' }} 
                          title={`Event End: ${formatDate(event.endDate)}`}
                        />
                      )}
                      
                      {/* Use grouped expenses for the timeline */}
                      {groupNearbyExpenses(eventExpenses, event).map((group, index) => {
                        const position = group.position;
                        const isPreEvent = position < 0;
                        const absolutePosition = Math.abs(position);
                        
                        // Determine expense marker class based on settlement status
                        let markerClass = styles.unsettledExpense; // Default to unsettled (red)
                        
                        // If all expenses in the group are settled, use settled style (green)
                        const allSettled = group.expenses.every(expense => expense.settled);
                        // If some but not all expenses are settled, use mixed style
                        const somesettled = group.expenses.some(expense => expense.settled);
                        
                        if (allSettled) {
                          markerClass = styles.settledExpense;
                        } else if (somesettled && group.expenses.length > 1) {
                          markerClass = styles.mixedExpense;
                        }
                        
                        // Prepare appropriate tooltip based on number of expenses
                        const tooltipContent = group.expenses.length === 1 
                          ? `${group.expenses[0].description || 'Expense'}: ${group.expenses[0].amount} ${group.expenses[0].currency} (${formatDate(group.expenses[0].date)})` 
                          : `${group.expenses.length} expenses - ${group.expenses.filter(e => e.settled).length} settled, ${group.expenses.filter(e => !e.settled).length} unsettled`;
                        
                        return (
                          <div 
                            key={`group-${index}`}
                            className={`${styles.expenseMarker} 
                                       ${markerClass}
                                       ${isPreEvent ? styles.preEventExpense : ''}
                                       ${position > 100 ? styles.postEventExpense : ''}
                                       ${group.expenses.length > 1 ? styles.groupedExpense : ''}`}
                            style={{ 
                              left: `${isPreEvent ? 0 : position > 100 ? 100 : absolutePosition}%`,
                              transform: `translate(${isPreEvent ? '-50%' : position > 100 ? '50%' : '-50%'}, -50%) ${group.expenses.length > 1 ? 'scale(1.2)' : ''}`
                            }}
                            title={tooltipContent}
                            onClick={(e) => handleExpenseClick(e, group.expenses)}
                          />
                        );
                      })}
                    </div>
                    
                    <div className={styles.timelineDates}>
                      <span className={styles.secondaryText}>
                        {formatDate(event.startDate)}
                      </span>
                      {event.endDate && (
                        <span className={styles.secondaryText}>
                          {formatDate(event.endDate)}
                        </span>
                      )}
                    </div>
                    
                    {/* Updated timeline legend with conditional rendering */}
                    <div className={styles.timelineLegend}>
                      {eventExpenses.some(exp => exp.settled) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.settledExpense}`}></div>
                          <span>Settled</span>
                        </div>
                      )}
                      {eventExpenses.some(exp => !exp.settled) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.unsettledExpense}`}></div>
                          <span>Unsettled</span>
                        </div>
                      )}
                      {/* Only show mixed legend if there's at least one group with mixed settlement status */}
                      {groupNearbyExpenses(eventExpenses, event).some(group => 
                        group.expenses.length > 1 && 
                        group.expenses.some(exp => exp.settled) && 
                        group.expenses.some(exp => !exp.settled)
                      ) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.mixedExpense}`}></div>
                          <span>Mixed Settlement</span>
                        </div>
                      )}
                      {/* Pre-event expenses */}
                      {eventExpenses.some(exp => calculatePositionPercentage(exp.date, event.startDate, event.endDate) < 0) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.preEventExpense}`}></div>
                          <span>Pre-event</span>
                        </div>
                      )}
                      {/* Post-event expenses */}
                      {eventExpenses.some(exp => 
                        event.endDate && calculatePositionPercentage(exp.date, event.startDate, event.endDate) > 100
                      ) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.postEventExpense}`}></div>
                          <span>Post-event</span>
                        </div>
                      )}
                      {/* Multiple expenses */}
                      {groupNearbyExpenses(eventExpenses, event).some(group => group.expenses.length > 1) && (
                        <div className={styles.legendItem}>
                          <div className={`${styles.legendColor} ${styles.groupedExpense}`}></div>
                          <span>Multiple expenses</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Event Metrics */}
                  <div className={styles.metrics}>
                    <div className={styles.metric}>
                      <span className={styles.metricIcon}>💰</span>
                      <span>Total: {totalExpenses.toFixed(2)}</span>
                    </div>
                    
                    <div className={styles.metric}>
                      <span className={styles.metricIcon}>👥</span>
                      <span>Participants: {event.participants.length}</span>
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
                  
                  {/* Progress Bar */}
                  <div className={styles.progressContainer}>
                    <div className={styles.progressLabel}>
                      <span>Settlement Progress</span>
                      <span>{Math.round(settledPercentage)}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <div 
                        className={styles.progressFill} 
                        style={{ width: `${settledPercentage}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Participants with Animation */}
                  <div className={styles.participantsContainer}>
                    <button
                      aria-label={`Show participants for ${event.name}`}
                      onClick={() => toggleParticipants(event.id)}
                      className={styles.participantsButton}
                    >
                      {expandedEventId === event.id ? 'Hide Participants' : 'Show Participants'} 
                      ({event.participants.length})
                    </button>
                    
                    <ul className={`${styles.participantsList} ${expandedEventId === event.id ? styles.participantsListExpanded : ''}`}>
                      {event.participants.map((participantId: string) => {
                        const participant = state.users.find((user: User) => user.id === participantId);
                        return (
                          <li key={participantId} className={styles.participantItem}>
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
                    <Link href={`/events/${event.id}`} className={styles.viewButton}>
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      
      {/* Modified Hover card for expenses with individual dates */}
      {activeGroup && (
        <div 
          className={styles.hoverCard}
          style={{
            position: 'fixed',
            top: `${activeGroup.position.y}px`,
            left: `${activeGroup.position.x}px`,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000
          }}
          ref={hoverCardRef}
        >
          <div className={styles.hoverCardHeader}>
            <h4>
              {activeGroup.expenses.length > 1 ? (
                <>
                  {activeGroup.expenses.length} Expenses
                  <span className={styles.expenseSummary}>
                    {activeGroup.expenses.filter(e => e.settled).length} settled, 
                    {activeGroup.expenses.filter(e => !e.settled).length} unsettled
                  </span>
                </>
              ) : (
                'Expense Details'
              )}
            </h4>
            <button 
              className={styles.closeButton}
              onClick={() => setActiveGroup(null)}
            >
              ✕
            </button>
          </div>
          
          <ul className={styles.expensesList}>
            {activeGroup.expenses.map(expense => (
              <li 
                key={expense.id} 
                className={styles.expenseItem}
                onClick={() => {
                  router.push(`/expenses/${expense.id}`);
                  setActiveGroup(null);
                }}
              >
                <div className={styles.expenseItemHeader}>
                  <span className={styles.expenseName}>{expense.description || 'Expense'}</span>
                  <span className={`${styles.expenseStatus} ${expense.settled ? styles.settled : styles.unsettled}`}>
                    {expense.settled ? 'Settled' : 'Unsettled'}
                  </span>
                </div>
                <div className={styles.expenseAmount}>
                  {expense.amount.toFixed(2)} {expense.currency}
                </div>
                <div className={styles.expenseDate}>
                  {formatDate(expense.date)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
