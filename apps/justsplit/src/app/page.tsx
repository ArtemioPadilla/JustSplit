'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import CurrencyExchangeTicker from '../components/CurrencyExchangeTicker';
import { clearExchangeRateCache } from '../utils/currencyExchange';

import WelcomeScreen from '../components/Dashboard/WelcomeScreen';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import FinancialSummary from '../components/Dashboard/FinancialSummary';
import ExpenseDistribution from '../components/Dashboard/ExpenseDistribution';
import BalanceOverview from '../components/Dashboard/BalanceOverview';
import RecentExpenses from '../components/Dashboard/RecentExpenses';
import RecentSettlements from '../components/Dashboard/RecentSettlements';
import UpcomingEvents from '../components/Dashboard/UpcomingEvents';

import { Event as LocalEvent, Expense, Settlement } from '../types';

import styles from './page.module.css';

export default function Home() {
  const { state, isConvertingCurrencies, preferredCurrency } = useAppContext();
  
  const [localPreferredCurrency, setLocalPreferredCurrency] = useState(preferredCurrency);
  const localIsConvertingCurrencies = isConvertingCurrencies;
  // const [isLoadingRates, setIsLoadingRates] = useState(false);
  // const [conversionError, setConversionError] = useState<string | null>(null);
  
  // Calculate if we have any data to show
  const hasData = state?.expenses?.length > 0 || state?.events?.length > 0;
  
  // Function to handle refreshing exchange rates
  const handleRefreshRates = async () => {
    try {
      clearExchangeRateCache();
      alert("Exchange rates have been refreshed!");
    } catch (error) {
      console.error("Error refreshing rates:", error);
      alert("Failed to refresh rates. Please try again.");
    }
  };

  // Placeholder for financial data
  const [financialSummary, setFinancialSummary] = useState({
    totalSpent: 0,
    unsettledCount: 0,
    pendingSettlements: [],
    totalPendingAmount: 0,
    upcomingEvents: [],
    compareWithLastMonth: 0,
    activeEvents: 0,
    activeParticipants: 0,
    inactiveParticipants: 0,
    youOwe: 0,
    othersOwe: 0,
    mostExpensiveCategory: { name: 'Uncategorized', amount: 0 },
    highestExpense: 0,
    avgPerDay: 0
  });

  const [balanceDistribution] = useState<{ userId: string; name: string; balance: number; }[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    if (!state) return;
    
    // Simple calculations for demo purposes
    const unsettledExpenses = state.expenses?.filter(exp => !exp.settled) || [];
    
    setFinancialSummary({
      ...financialSummary,
      totalSpent: state.expenses?.reduce((sum, exp) => sum + exp.amount, 0) || 0,
      unsettledCount: unsettledExpenses.length,
    });
    
    // Update other data
    setRecentExpenses(state.expenses?.slice(0, 5) || []);
    setRecentSettlements(state.settlements?.slice(0, 3) || []);
    
  }, [state]);

  // Add this function to convert AppContext events to our Event interface
  const convertEvents = (contextEvents: unknown[]): LocalEvent[] => {
    if (!contextEvents || !Array.isArray(contextEvents)) return [];
    return contextEvents.map((event: unknown) => {
      const eventObj = event as Record<string, unknown>;
      return {
        ...eventObj, // Spread existing properties from the source event
        date: (eventObj.startDate as string) || (eventObj.date as string) || new Date().toISOString().split('T')[0], // Ensure 'date' is present
        // Provide defaults for other required LocalEvent properties if not in 'event'
        createdAt: (eventObj.createdAt as string) || new Date().toISOString(),
        createdBy: (eventObj.createdBy as string) || 'system', // Or some other appropriate default
        members: (eventObj.members as string[]) || [],
        expenseIds: (eventObj.expenseIds as string[]) || [],
      } as LocalEvent;
    });
  };

  if (!state) {
    return <div className={styles.loading}>Loading application data...</div>;
  }
  
  return hasData ? (
    <main className={styles.dashboardMain}>
      <DashboardHeader 
        expenses={state.expenses || []} 
        users={state.users || []} 
        events={state.events || []} 
        handleRefreshRates={handleRefreshRates}
        selectedCurrency={localPreferredCurrency}
        setSelectedCurrency={setLocalPreferredCurrency}
      />
      
      <CurrencyExchangeTicker baseCurrency={localPreferredCurrency} />
      
      <div className={styles.dashboardSummary}>
        <FinancialSummary
          compareWithLastMonth={financialSummary.compareWithLastMonth}
          activeEvents={financialSummary.activeEvents}
          activeParticipants={financialSummary.activeParticipants}
          inactiveParticipants={financialSummary.inactiveParticipants}
          mostExpensiveCategory={financialSummary.mostExpensiveCategory}
          highestExpense={financialSummary.highestExpense}
          avgPerDay={financialSummary.avgPerDay}
        />
      </div>
      
      <ExpenseDistribution 
        expenses={state.expenses || []}
        preferredCurrency={localPreferredCurrency}
        isConvertingCurrencies={localIsConvertingCurrencies}
      />
      
      <BalanceOverview 
        balanceDistribution={balanceDistribution} 
        preferredCurrency={localPreferredCurrency}
      />
      
      <RecentExpenses 
        expenses={recentExpenses} 
        users={state.users || []} 
        events={convertEvents(state.events || [])}
        preferredCurrency={localPreferredCurrency}
        isConvertingCurrencies={localIsConvertingCurrencies}
      />
      
      <RecentSettlements 
        settlements={recentSettlements}
        users={state.users || []}
        preferredCurrency={localPreferredCurrency}
        isConvertingCurrencies={localIsConvertingCurrencies}
        expenses={state.expenses || []}
      />
      
      <UpcomingEvents events={convertEvents(financialSummary.upcomingEvents)} users={state.users || []} />
    </main>
  ) : (
    <WelcomeScreen />
  );
}
