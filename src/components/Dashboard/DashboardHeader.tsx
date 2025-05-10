import Link from 'next/link';
import { Expense, User, Event } from '../../context/AppContext';
import { exportExpensesToCSV } from '../../utils/csvExport';
import { SUPPORTED_CURRENCIES } from '../../utils/currencyExchange';
import styles from '../../app/page.module.css';
import Button from '../ui/Button';

interface DashboardHeaderProps {
  expenses: Expense[];
  users: User[];
  events: Event[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  handleRefreshRates: () => Promise<void>;
}

export default function DashboardHeader({ 
  expenses, 
  users, 
  events, 
  selectedCurrency, 
  setSelectedCurrency, 
  handleRefreshRates 
}: DashboardHeaderProps) {
  return (
    <div className={styles.dashboardHeader}>
      <div className={styles.headerTop}>
        <h1>Dashboard</h1>
        
        <div className={styles.currencySelector}>
          <label htmlFor="currency-selector">Currency: </label>
          <select
            id="currency-selector"
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className={styles.select}
          >
            {SUPPORTED_CURRENCIES.map(currency => (
              <option key={currency.code} value={currency.code}>
                {currency.code} ({currency.symbol})
              </option>
            ))}
          </select>
          <Button 
            onClick={handleRefreshRates}
            variant="primary"
            title="Refresh exchange rates"
          >
            🔄
          </Button>
        </div>
      </div>
      
      <div className={styles.quickActions}>
        <Link href="/expenses/new" className={styles.button}>Add Expense</Link>
        <Link href="/events/new" className={styles.button}>Create Event</Link>
        
        <Button 
          onClick={() => exportExpensesToCSV(expenses, users, 'all-expenses.csv')}
          variant="secondary"
          disabled={expenses.length === 0}
        >
          Export Expenses
        </Button>
      </div>
    </div>
  );
}
