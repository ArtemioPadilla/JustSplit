import styles from '../../app/page.module.css';

interface BalanceData {
  userId: string;
  name: string;
  balance: number;
}

interface BalanceOverviewProps {
  balanceDistribution: BalanceData[];
}

export default function BalanceOverview({ balanceDistribution }: BalanceOverviewProps) {
  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Balance Overview</h2>
      {balanceDistribution.length > 0 ? (
        <div className={styles.balanceChart}>
          {balanceDistribution.map((user, index) => (
            <div key={index} className={styles.balanceItem}>
              <div className={styles.balanceName}>{user.name}</div>
              <div className={styles.balanceBarContainer}>
                <div 
                  className={`${styles.balanceBar} ${user.balance > 0 ? styles.positiveBalance : styles.negativeBalance}`}
                  style={{ 
                    width: `${Math.min(100, Math.abs(user.balance) / (Math.max(...balanceDistribution.map(u => Math.abs(u.balance))) || 1) * 100)}%` 
                  }}
                ></div>
              </div>
              <div className={`${styles.balanceValue} ${user.balance > 0 ? styles.positive : user.balance < 0 ? styles.negative : ''}`}>
                {user.balance > 0 ? '+' : ''}{user.balance.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyMessage}>No balance data available</p>
      )}
    </div>
  );
}
