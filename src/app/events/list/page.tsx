'use client';

import React, { useState } from 'react';
import { useAppContext, Event as AppEvent, User } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Timeline from '../../../components/ui/Timeline';
import ProgressBar from '../../../components/ui/ProgressBar';
import Button from '../../../components/ui/Button';
import EditableText from '../../../components/ui/EditableText';
import { 
  calculateSettledPercentage,
  calculateTotalByCurrency,
  calculateUnsettledAmount,
  TimelineEvent,
  TimelineExpense
} from '../../../utils/timelineUtils';

export default function EventList() {
  const { state, dispatch } = useAppContext();
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ date: '', type: '', status: '' });
  const [updatingEvents, setUpdatingEvents] = useState<Record<string, boolean>>({});
  
  // Get current date range for date filter
  const currentYear = new Date().getFullYear();
  const dateRanges = ['All Dates', `${currentYear} (This Year)`, `${currentYear-1} (Last Year)`];

  const toggleParticipants = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  const handleFilterChange = (filterType: string, value: string) => {
    setFilters({ ...filters, [filterType]: value });
  };

  const handleEventNameUpdate = (eventId: string, newName: string) => {
    setUpdatingEvents({ ...updatingEvents, [eventId]: true });
    
    // Find the event to update
    const eventToUpdate = state.events.find(event => event.id === eventId);
    
    if (eventToUpdate) {
      // Create updated event with new name
      const updatedEvent = { ...eventToUpdate, name: newName };
      
      // Dispatch update action
      dispatch({ type: 'UPDATE_EVENT', payload: updatedEvent });
      
      // Clear updating status after a short delay to show feedback
      setTimeout(() => {
        setUpdatingEvents(prev => ({ ...prev, [eventId]: false }));
      }, 500);
    }
  };

  const filteredEvents = state.events.filter((event) => {
    // Apply date filter
    if (filters.date && filters.date !== 'All Dates') {
      const year = parseInt(filters.date.split(' ')[0]);
      const eventYear = new Date(event.startDate).getFullYear();
      if (eventYear !== year) return false;
    }
    
    return true;
  });

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Events</h1>
      
      {state.events.length === 0 ? (
        <div className={styles.emptyState}>
          <p>You haven't created any events yet.</p>
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
            >
              <option value="">All Dates</option>
              {dateRanges.map(range => (
                <option key={range} value={range}>{range}</option>
              ))}
            </select>
          </div>
          
          <div className={styles.eventsList}>
            {filteredEvents.map((event) => {
              // Get event expenses
              const eventExpenses = state.expenses.filter(expense => expense.eventId === event.id);
              const totalByCurrency = calculateTotalByCurrency(eventExpenses);
              const unsettledAmounts = calculateUnsettledAmount(eventExpenses);
              
              // Calculate metrics
              const totalExpenses = Object.values(totalByCurrency).reduce((sum, total) => sum + total, 0);
              const settledPercentage = calculateSettledPercentage(eventExpenses);
              const isUpdating = updatingEvents[event.id] || false;

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
