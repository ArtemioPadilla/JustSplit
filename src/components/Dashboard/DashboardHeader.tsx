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
  isConvertingCurrencies: boolean;
  setIsConvertingCurrencies: (convert: boolean) => void;
}

export default function DashboardHeader({ 
  expenses, 
  users, 
  events, 
  selectedCurrency, 
  setSelectedCurrency, 
  handleRefreshRates,
  isConvertingCurrencies,
  setIsConvertingCurrencies
}: DashboardHeaderProps) {
  return (
    <div className={styles.dashboardHeader}>
      <div className={styles.headerTop}>
        <h1>Dashboard</h1>
        
        <div className={styles.currencyControls}>
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
              variant="secondarylight"
              title="Refresh exchange rates"
            >
              🔄
            </Button>
          </div>
          
          <div className={styles.conversionToggle}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isConvertingCurrencies}
                onChange={(e) => setIsConvertingCurrencies(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Convert currencies</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className={styles.quickActions}>
        <Link href="/expenses/new" passHref>
          <Button variant="primary">Add Expense</Button>
        </Link>
        <Link href="/events/new" passHref>
          <Button variant="primary">Create Event</Button>
        </Link>
        
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
