import styles from '../../app/page.module.css';

interface FinancialSummaryProps {
  totalSpent: number;
  unsettledCount: number;
  totalPendingAmount: number;
}

export default function FinancialSummary({ 
  totalSpent, 
  unsettledCount, 
  totalPendingAmount 
}: FinancialSummaryProps) {
  return (
    <div className={styles.summaryCard}>
      <h2 className={styles.cardTitle}>Financial Overview</h2>
      <div className={styles.summaryStats}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>${totalSpent.toFixed(2)}</span>
          <span className={styles.statLabel}>Total Tracked</span>
          <div className={styles.statIcon}>💰</div>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{unsettledCount}</span>
          <span className={styles.statLabel}>Unsettled Expenses</span>
          <div className={styles.statIcon}>📝</div>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statValue}>${totalPendingAmount.toFixed(2)}</span>
          <span className={styles.statLabel}>Pending Settlements</span>
          <div className={styles.statIcon}>⏳</div>
        </div>
      </div>
    </div>
  );
}
