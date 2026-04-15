import React from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { Event as LocalEvent, User } from '../../types'; // Import LocalEvent and User

interface UpcomingEventsProps {
  events?: LocalEvent[];
  users?: User[];
}

const UpcomingEvents: React.FC<UpcomingEventsProps> = ({ events: propEvents, users: propUsers }) => {
  const context = useAppContext();
  const state = context?.state;

  // Use propEvents directly. It's already LocalEvent[] (or undefined, defaulting to []).
  // This ensures 'events' is always of type LocalEvent[] as expected by the rest of the component.
  const events: LocalEvent[] = propEvents || state?.events || [];
  
  // Fallback for users is generally fine if the User type is consistent.
  const users: User[] = propUsers || state?.users || [];

  // Format date range using native Date methods
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startFormatted = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endFormatted = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startFormatted} - ${endFormatted}`;
  };

  // Helper: get participant names/count
  const getParticipantNames = (event: LocalEvent) => {
    if (!event.members) return ''; // Changed from event.participants to event.members to match LocalEvent
    const names = event.members.map(uid => { // Changed from event.participants to event.members
      const user = users.find(u => u.id === uid);
      return user ? user.name : 'Unknown';
    });
    return names.join(', ');
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Upcoming Events</h2>
      {events.length > 0 ? (
        <ul className={styles.eventsList} style={{ padding: 0, margin: 0 }}>
          {events.map((event: LocalEvent) => { // Now 'events' is guaranteed to be LocalEvent[]
            const isPast = new Date(event.endDate || event.startDate || event.date) < new Date(); // Added event.date as fallback
            const participantCount = event.members ? event.members.length : 0; // Changed from event.participants to event.members
            return (
              <li key={event.id} className={styles.eventItem} style={{ listStyle: 'none', marginBottom: 16 }}>
                <Link href={`/events/${event.id}`} className={styles.eventLink} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className={styles.eventCard} style={{ boxShadow: 'var(--shadow-md)', borderRadius: 12, padding: 18, background: '#fff', display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
                    <div className={styles.eventAvatar} style={{ background: '#e0e7ef', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: '#4f46e5' }}>
                      {event.name ? event.name[0] : '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className={styles.eventTitle} style={{ fontWeight: 600, fontSize: 18, marginBottom: 2 }}>{event.name}</div>
                      {event.description && (
                        <div className={styles.eventDescription} style={{ color: '#666', fontSize: 14, marginBottom: 2 }}>{event.description}</div>
                      )}
                      <div className={styles.eventLocation} style={{ color: '#888', fontSize: 14 }}>{event.location || <span style={{ color: '#bbb' }}>No location</span>}</div>
                      <div className={styles.eventDate} style={{ color: '#4f46e5', fontWeight: 500, fontSize: 14 }}>{formatDateRange(event.startDate || event.date, event.endDate || event.startDate || event.date)}</div> {/* Added event.date as fallback */}
                      <div style={{ color: '#888', fontSize: 13, marginTop: 2 }}>
                        {participantCount > 0 && (<span>{participantCount} participant{participantCount !== 1 ? 's' : ''}</span>)}
                        {participantCount > 0 && <span style={{ marginLeft: 8 }}>{getParticipantNames(event)}</span>}
                      </div>
                    </div>
                    <div style={{ minWidth: 90, textAlign: 'right' }}>
                      <span style={{ fontWeight: 600, color: isPast ? '#bbb' : 'var(--color-success)', background: isPast ? '#f3f4f6' : '#e6f9f0', borderRadius: 8, padding: '2px 10px', fontSize: 13 }}>
                        {isPast ? 'Past' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
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
