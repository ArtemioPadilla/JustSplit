'use client';

import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';

export default function EventList() {
  const { state } = useAppContext();

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
          
          <div className={styles.eventsList}>
            {state.events.map(event => (
              <div key={event.id} className={styles.eventCard}>
                <h2 className={styles.eventName}>{event.name}</h2>
                
                {event.description && (
                  <p className={styles.eventDescription}>{event.description}</p>
                )}
                
                <div className={styles.eventDetails}>
                  <div className={styles.dateRange}>
                    <span>
                      {new Date(event.startDate).toLocaleDateString()}
                      {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                  
                  <div className={styles.participants}>
                    <span>{event.participants.length} participants</span>
                  </div>
                </div>
                
                <div className={styles.actions}>
                  <Link href={`/events/${event.id}`} className={styles.viewButton}>
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
