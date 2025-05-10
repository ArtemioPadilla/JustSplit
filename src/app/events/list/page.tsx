'use client';

import React, { useState } from 'react';
import { useAppContext, User } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import ProgressBar from '../../../components/ui/ProgressBar';
import Button from '../../../components/ui/Button';
import { 
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  TimelineEvent,
  TimelineExpense
} from '../../../utils/timelineUtils';

// Define the Event type explicitly
interface Event extends TimelineEvent {
  participants: string[];
}

// Define the Expense type explicitly
interface Expense extends TimelineExpense {
  eventId: string | undefined;
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

              return (
                <div key={event.id} className={styles.eventCard}>
                  <h2 className={styles.eventName}>{event.name}</h2>
                  
                  {event.description && (
                    <p className={styles.eventDescription}>{event.description}</p>
                  )}
                  
                  {/* Use our new Timeline component */}
                  <Timeline 
                    event={event} 
                    expenses={eventExpenses} 
                  />
                  
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
                  
                  {/* Use our new ProgressBar component */}
                  <ProgressBar
                    value={settledPercentage}
                    label="Settlement Progress"
                    variant={
                      settledPercentage === 100 ? 'success' :
                      settledPercentage >= 75 ? 'info' :
                      settledPercentage >= 50 ? 'warning' : 'danger'
                    }
                  />
                  
                  {/* Participants with Animation */}
                  <div className={styles.participantsContainer}>
                    <Button
                      aria-label={`Show participants for ${event.name}`}
                      onClick={() => toggleParticipants(event.id)}
                      variant="primary"
                      className={styles.participantsButton}
                    >
                      {expandedEventId === event.id ? 'Hide Participants' : 'Show Participants'} 
                      ({event.participants.length})
                    </Button>
                    
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
