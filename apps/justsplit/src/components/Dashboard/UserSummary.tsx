import React from 'react';
import Link from 'next/link';
import styles from './styles.module.css';
import { useAppContext } from '../../context/AppContext';

const UserSummary: React.FC = () => {
  // Access users from context state
  const { state } = useAppContext();
  const { users } = state;

  // Format balance with currency symbol
  const formatBalance = (balance: number, currency: string = 'USD') => {
    const symbol = currency === 'USD' ? '$' : '€';
    const prefix = balance < 0 ? '-' : '';
    return `${prefix}${symbol}${Math.abs(balance).toFixed(2)}`;
  };

  // Get CSS class based on balance value
  const getBalanceClass = (balance: number) => {
    if (balance > 0) return styles.positiveBalance;
    if (balance < 0) return styles.negativeBalance;
    return styles.zeroBalance;
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Balance Summary</h2>
      {users.length > 0 ? (
        <div className={styles.usersList}>
          {users.map(user => (
            <div key={user.id} className={styles.userItem}>
              <span className={styles.userName}>{user.name}</span>
              <div className={getBalanceClass(user.balance)}>
                {formatBalance(user.balance, user.preferredCurrency)}
              </div>
            </div>
          ))}
          <div className={styles.settleUpButton}>
            <Link href="/settlements/new">Settle Up</Link>
          </div>
        </div>
      ) : (
        <p>No users available</p>
      )}
    </div>
  );
};

export default UserSummary;
