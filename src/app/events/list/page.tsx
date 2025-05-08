'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext, User } from '../../../context/AppContext';
import Link from 'next/link';
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
}

export default function EventList() {
  const { state } = useAppContext();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ date: '', type: '', status: '' });
  
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

  // Format date for display
  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), 'MMM d, yyyy');
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
                  
                  {/* Timeline for event dates */}
                  <div className={styles.timeline}>
                    <div 
                      className={styles.timelineProgress} 
                      style={{ width: `${timelineProgress}%` }}
                    />
                    <div className={styles.timelineDot} style={{ left: '0%' }} />
                    {event.endDate && <div className={styles.timelineDot} style={{ left: '100%' }} />}
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
    </div>
  );
}
