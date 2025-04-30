import Link from 'next/link';
import { Settlement, User, Event } from '../../context/AppContext';
import styles from '../../app/page.module.css';

interface RecentSettlementsProps {
  settlements: Settlement[];
  users: User[];
  events: Event[];
}

export default function RecentSettlements({ settlements, users, events }: RecentSettlementsProps) {
  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(user => user.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Get event name by ID
  const getEventName = (eventId?: string): string => {
    if (!eventId) return '';
    const event = events.find(event => event.id === eventId);
    return event ? event.name : '';
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Settlements</h2>
      {settlements.length > 0 ? (
        <ul className={styles.settlementsList}>
          {settlements.map(settlement => (
            <li key={settlement.id} className={styles.settlementItem}>
              <div className={styles.settlementUsers}>
                <span>{getUserName(settlement.fromUser)}</span>
                <span className={styles.settlementArrow}>→</span>
                <span>{getUserName(settlement.toUser)}</span>
              </div>
              <div className={styles.settlementDetails}>
                <span>{new Date(settlement.date).toLocaleDateString()}</span>
                <span className={styles.settlementAmount}>
                  ${settlement.amount.toFixed(2)}
                </span>
              </div>
              {settlement.eventId && (
                <div className={styles.settlementEvent}>
                  {getEventName(settlement.eventId)}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>No settlements yet</p>
      )}
      <Link href="/settlements" className={styles.viewAllLink}>
        View all settlements
      </Link>
    </div>
  );
}
