import Link from 'next/link';
import { Expense, User, Event } from '../../context/AppContext';
import { exportExpensesToCSV } from '../../utils/csvExport';
import styles from '../../app/page.module.css';

interface DashboardHeaderProps {
  expenses: Expense[];
  users: User[];
  events: Event[];
}

export default function DashboardHeader({ expenses, users, events }: DashboardHeaderProps) {
  return (
    <div className={styles.dashboardHeader}>
      <h1>Dashboard</h1>
      <div className={styles.quickActions}>
        <Link href="/expenses/new" className={styles.button}>Add Expense</Link>
        <Link href="/events/new" className={styles.button}>Create Event</Link>
        <button 
          className={`${styles.button} ${styles.secondaryButton}`}
          onClick={() => exportExpensesToCSV(expenses, users, 'all-expenses.csv')}
          disabled={expenses.length === 0}
        >
          Export Expenses
        </button>
      </div>
    </div>
  );
}
