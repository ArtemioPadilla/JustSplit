import styles from './page.module.css';

export default function SettlementsPage() {
  return (
    <div className={styles.container}>
      <h1>Settlements</h1>
      <p>View and manage your settlements here.</p>
      
      <div className={styles.settlementsList}>
        <div className={styles.emptyState}>
          <h3>No settlements yet</h3>
          <p>Once you create events and add expenses, settlements will appear here.</p>
        </div>
      </div>
    </div>
  );
}
