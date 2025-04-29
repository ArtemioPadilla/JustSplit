'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
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
        <h2 className={styles.sectionTitle}>Participants</h2>
        {participants.length > 0 ? (
          <ul className={styles.participantsList}>
            {participants.map(user => (
              <li key={user.id} className={styles.participantItem}>
                {user.name}
              </li>
            ))}
          </ul>
        ) : (
          <p>No participants in this event.</p>
        )}
      </div>
      
      <div className={styles.actions}>
        <button 
          className={styles.actionButton}
          onClick={() => router.push(`/expenses/new?event=${eventId}`)}
        >
          Add Expense
        </button>
      </div>
    </div>
  );
}
