import React from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';

const BalanceOverview = () => {
  const { state } = useAppContext();
  const { users } = state;

  // Total balance calculations
  const totalPositive = users.reduce((sum, user) => sum + (user.balance > 0 ? user.balance : 0), 0);
  const totalNegative = users.reduce((sum, user) => sum + (user.balance < 0 ? user.balance : 0), 0);
  const netBalance = totalPositive + totalNegative;
  
  // Format currency
  const formatCurrency = (amount) => {
    const prefix = amount < 0 ? '-' : '';
    return `${prefix}$${Math.abs(amount).toFixed(2)}`;
  };

  // Get CSS class based on balance value
  const getBalanceClass = (balance) => {
    if (balance > 0) return styles.positiveBalance;
    if (balance < 0) return styles.negativeBalance;
    return styles.zeroBalance;
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Balance Overview</h2>
      {users.length > 0 ? (
        <div className={styles.balanceContainer}>
          <div className={styles.balanceRow}>
            <div className={styles.balanceLabel}>You are owed:</div>
            <div className={`${styles.balanceAmount} ${styles.positiveBalance}`}>
              {formatCurrency(totalPositive)}
            </div>
          </div>
          <div className={styles.balanceRow}>
            <div className={styles.balanceLabel}>You owe:</div>
            <div className={`${styles.balanceAmount} ${styles.negativeBalance}`}>
              {formatCurrency(totalNegative)}
            </div>
          </div>
          <div className={styles.balanceDivider}></div>
          <div className={styles.balanceRow}>
            <div className={styles.balanceLabel}>Net balance:</div>
            <div className={`${styles.balanceAmount} ${getBalanceClass(netBalance)}`}>
              {formatCurrency(netBalance)}
            </div>
          </div>
          
          <div className={styles.userBalances}>
            {users.map(user => (
              <div key={user.id} className={styles.userBalance}>
                <span className={styles.userName}>{user.name}</span>
                <div className={getBalanceClass(user.balance)}>
                  {formatCurrency(user.balance)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p>No balance data available</p>
      )}
    </div>
  );
};

export default BalanceOverview;
