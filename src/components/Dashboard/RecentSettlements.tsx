import React from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';

const RecentSettlements = () => {
  const { state } = useAppContext();
  const { settlements, users } = state;

  // Function to find user name by ID
  const getUserName = (userId) => {
    const user = users.find(user => user.id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Format settlement display
  const formatSettlement = (settlement) => {
    return `${getUserName(settlement.fromUserId)} → ${getUserName(settlement.toUserId)}`;
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Settlements</h2>
      {settlements.length > 0 ? (
        <ul className={styles.settlementsList}>
          {settlements.map(settlement => (
            <li key={settlement.id} className={styles.settlementItem}>
              <Link href={`/settlements/${settlement.id}`}>
                <div className={styles.settlementDetails}>
                  <span className={styles.settlementUsers}>
                    {formatSettlement(settlement)}
                  </span>
                  <span className={styles.settlementAmount}>
                    {settlement.currency === 'USD' ? '$' : '€'}{settlement.amount.toFixed(2)}
                  </span>
                  <span className={styles.settlementDate}>
                    {new Date(settlement.date).toLocaleDateString()}
                  </span>
                  <span className={styles.settlementStatus}>
                    {settlement.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No settlements yet</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/settlements">View all settlements</Link>
      </div>
    </div>
  );
};

export default RecentSettlements;
