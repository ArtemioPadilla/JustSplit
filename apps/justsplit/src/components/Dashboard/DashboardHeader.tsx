import Link from 'next/link';
import { Expense, User, Event } from '../../types';
import { exportExpensesToCSV } from '../../utils/csvExport';
import styles from '../../app/page.module.css';
import Button from '../ui/Button';
import { useAppContext } from '../../context/AppContext';
import { useState } from 'react';
import CurrencySelector from '../ui/CurrencySelector';

interface DashboardHeaderProps {
  expenses: Expense[];
  users: User[];
  events: Event[];
  handleRefreshRates?: () => Promise<void>;
  selectedCurrency?: string;
  setSelectedCurrency?: (currency: string) => void;
}

export default function DashboardHeader({ 
  expenses, 
  users, 
  events, 
  handleRefreshRates,
  selectedCurrency: propSelectedCurrency,
  setSelectedCurrency: propSetSelectedCurrency
}: DashboardHeaderProps) {
  // For tests - we need default values that work without context
  const [localCurrency, setLocalCurrency] = useState('USD');

  // Try to get context values, but don't crash if we're in a test environment
  const contextValues = useAppContext();
  
  // Use context values if available, otherwise use props or local state
  const preferredCurrency = 
    propSelectedCurrency || 
    (contextValues?.preferredCurrency) || 
    localCurrency;
    
  const setPreferredCurrency =
    propSetSelectedCurrency || 
    setLocalCurrency;
    
  // Handler for refresh rates - use prop or empty function
  const handleRefresh = handleRefreshRates || (() => Promise.resolve());
  
  return (
    <div className={styles.dashboardHeader}>
      <div className={styles.headerTop}>
        <h1>Dashboard</h1>
        
        <div className={styles.currencyControls}>
          <CurrencySelector
            value={preferredCurrency}
            onChange={setPreferredCurrency}
            showRefreshButton={true}
            onRefresh={handleRefresh}
            compact={true}
          />
          
        </div>
      </div>
      
      <div className={styles.quickActions}>
        <Link href="/expenses/new" passHref>
          <Button variant="primary">Add Expense</Button>
        </Link>
        <Link href="/events/new" passHref>
          <Button variant="primary">Create Event</Button>
        </Link>          <Button 
            onClick={() => exportExpensesToCSV(expenses, users, events, 'all-expenses.csv')}
            variant="secondary"
            disabled={expenses.length === 0}
          >
            Export Expenses
          </Button>
      </div>
    </div>
  );
}
