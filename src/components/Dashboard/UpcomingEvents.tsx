import Link from 'next/link';
import { Event } from '../../context/AppContext';
import styles from '../../app/page.module.css';

interface UpcomingEventsProps {
  events: Event[];
}

export default function UpcomingEvents({ events }: UpcomingEventsProps) {
  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Upcoming Events</h2>
      {events.length > 0 ? (
        <ul className={styles.eventsList}>
          {events.map(event => (
            <li key={event.id} className={styles.eventItem}>
              <Link href={`/events/${event.id}`}>
                <div className={styles.eventName}>{event.name}</div>
                <div className={styles.eventDate}>
                  {new Date(event.startDate).toLocaleDateString()}
                  {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                </div>
                <div className={styles.eventParticipants}>
                  {event.participants.length} participants
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>No upcoming events</p>
      )}
      <Link href="/events/list" className={styles.viewAllLink}>
        View all events
      </Link>
    </div>
  );
}
