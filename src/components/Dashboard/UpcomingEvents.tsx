import React from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';

const UpcomingEvents = () => {
  const { state } = useAppContext();
  const { events } = state;

  // Format date range using native Date methods instead of date-fns
  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Format dates using toLocaleDateString
    const startFormatted = start.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    
    const endFormatted = end.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    
    return `${startFormatted} - ${endFormatted}`;
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Upcoming Events</h2>
      {events.length > 0 ? (
        <ul className={styles.eventsList}>
          {events.map(event => (
            <li key={event.id} className={styles.eventItem}>
              <Link href={`/events/${event.id}`}>
                <div className={styles.eventDetails}>
                  <span className={styles.eventTitle}>{event.title}</span>
                  <span className={styles.eventLocation}>{event.location}</span>
                  <span className={styles.eventDate}>
                    {formatDateRange(event.startDate, event.endDate)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No upcoming events</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/events">View all events</Link>
      </div>
    </div>
  );
};

export default UpcomingEvents;
