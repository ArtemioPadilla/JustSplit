'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { calculateSettlementsWithConversion } from '../utils/expenseCalculator';
import CurrencyExchangeTicker from '../components/CurrencyExchangeTicker';
import { getExchangeRate, SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, clearExchangeRateCache } from '../utils/currencyExchange';

// Import dashboard components
import WelcomeScreen from '../components/Dashboard/WelcomeScreen';
import DashboardHeader from '../components/Dashboard/DashboardHeader';
import FinancialSummary from '../components/Dashboard/FinancialSummary';
import MonthlyTrendsChart from '../components/Dashboard/MonthlyTrendsChart';
import ExpenseDistribution from '../components/Dashboard/ExpenseDistribution';
import BalanceOverview from '../components/Dashboard/BalanceOverview';
import RecentExpenses from '../components/Dashboard/RecentExpenses';
import RecentSettlements from '../components/Dashboard/RecentSettlements';
import UpcomingEvents from '../components/Dashboard/UpcomingEvents';

import styles from './page.module.css';

export default function Home() {
  const { state } = useAppContext();
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  
  // Define these safely regardless of whether state exists (moved from conditional)
  const hasData = state?.expenses?.length > 0 || state?.events?.length > 0;
  const userPreferredCurrency = state?.users?.length > 0 ? state.users[0].preferredCurrency || DEFAULT_CURRENCY : DEFAULT_CURRENCY;
  
  // Add state for selected currency
  const [selectedCurrency, setSelectedCurrency] = useState(userPreferredCurrency);
  
  // Update selected currency when user preference changes
  useEffect(() => {
    setSelectedCurrency(userPreferredCurrency);
  }, [userPreferredCurrency]);
  
  // Function to handle refreshing exchange rates
  const handleRefreshRates = async () => {
    try {
      // Clear the exchange rate cache
      clearExchangeRateCache();
      
      // Show a confirmation (this could be enhanced with a toast notification)
      alert("Exchange rates have been refreshed!");
      
      // Force recalculation of financial data
      calculateFinancialSummary();
    } catch (error) {
      console.error("Error refreshing rates:", error);
      alert("Failed to refresh rates. Please try again.");
    }
  };
  
  const [financialSummary, setFinancialSummary] = useState({
    totalSpent: 0,
    unsettledCount: 0,
    pendingSettlements: [],
    totalPendingAmount: 0,
    upcomingEvents: []
  });

  // Function to calculate financial summary
  const calculateFinancialSummary = async () => {
    if (!state) return;
    
    setIsLoadingRates(true);
    try {
      // Calculate how much the user has spent
      let totalSpent = 0;
      
      // Convert all expenses to selected currency
      for (const exp of state.expenses || []) {
        if (exp.currency === selectedCurrency) {
          totalSpent += exp.amount;
        } else {
          try {
            const { rate } = await getExchangeRate(exp.currency, selectedCurrency);
            totalSpent += exp.amount * rate;
          } catch (error) {
            console.error(`Error converting ${exp.currency} to ${selectedCurrency}:`, error);
            // If conversion fails, just add original amount
            totalSpent += exp.amount;
          }
        }
      }
      
      // Calculate unsettled expenses
      const unsettledExpenses = state.expenses?.filter(exp => !exp.settled) || [];
      
      // Calculate upcoming events (events with start dates in the future)
      const today = new Date();
      const upcomingEvents = state.events
        ?.filter(event => new Date(event.startDate) >= today)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()) || [];
      
      // Calculate pending settlements
      const pendingSettlements = await calculateSettlementsWithConversion(state.expenses || [], state.users || [], selectedCurrency);
      const totalPendingAmount = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
      
      const summary = {
        totalSpent,
        unsettledCount: unsettledExpenses.length,
        pendingSettlements,
        totalPendingAmount,
        upcomingEvents: upcomingEvents.slice(0, 3) // Show only the next 3 events
      };
      setFinancialSummary(summary);
      setConversionError(null);
    } catch (error) {
      console.error("Error calculating financial summary:", error);
      setConversionError("Error converting currencies. Using original amounts.");
    } finally {
      setIsLoadingRates(false);
    }
  };

  useEffect(() => {
    calculateFinancialSummary();
  }, [state, selectedCurrency]);
  
  // Get recent expenses
  const recentExpenses = useMemo(() => {
    if (!state?.expenses) return [];
    return [...(state.expenses)]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Show only the 5 most recent expenses
  }, [state?.expenses]);
  
  // Get recent settlements
  const recentSettlements = useMemo(() => {
    if (!state?.settlements) return [];
    return [...(state.settlements)]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3); // Show only the 3 most recent settlements
  }, [state?.settlements]);
  
  // Calculate monthly expense trends for the last 6 months
  const monthlyTrends = useMemo(() => {
    if (!state) return Promise.resolve([]);
    
    const trends = [];
    const now = new Date();
    
    // Cache for storing already fetched exchange rates to avoid duplicate API calls
    const exchangeRateCache: Record<string, number> = {};
    
    // Helper function to get exchange rate (from cache or API)
    const getRate = async (fromCurrency: string, toCurrency: string): Promise<number> => {
      if (fromCurrency === toCurrency) return 1;
      const cacheKey = `${fromCurrency}-${toCurrency}`;
      if (exchangeRateCache[cacheKey]) return exchangeRateCache[cacheKey];
      
      try {
        const rate = await getExchangeRate(fromCurrency, toCurrency);
        exchangeRateCache[cacheKey] = rate;
        return rate;
      } catch (error) {
        console.error(`Error getting exchange rate from ${fromCurrency} to ${toCurrency}:`, error);
        return 1; // Default fallback
      }
    };
    
    // Process each month's data
    for (let i = 5; i >= 0; i--) {
      // Create start date as first day of month
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      // Create end date as last day of month
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      // Format dates to yyyy-mm-dd string for reliable comparison
      const monthStr = month.toISOString().split('T')[0];
      const monthEndStr = monthEnd.toISOString().split('T')[0];
      
      // Filter expenses that fall within this month
      const monthlyExpenses = (state.expenses || []).filter(expense => {
        const expenseDate = expense.date.split('T')[0]; // Get yyyy-mm-dd part only
        return expenseDate >= monthStr && expenseDate <= monthEndStr;
      });
      
      // Process the expenses with currency conversion if needed
      const processMonthlyExpenses = async () => {
        let totalAmount = 0;
        
        // Create maps to track spending by category (event or spender)
        const spendingByEvent: Record<string, number> = {};
        const spendingByPayer: Record<string, number> = {};
        
        // Process each expense for this month
        for (const expense of monthlyExpenses) {
          let amount = expense.amount;
          
          // Convert currency if needed and enabled
          if (expense.currency !== selectedCurrency) {
            const rate = await getRate(expense.currency, selectedCurrency);
            amount = amount * rate;
          }
          
          totalAmount += amount;
          
          // Track by event
          const eventId = expense.eventId || 'no-event';
          spendingByEvent[eventId] = (spendingByEvent[eventId] || 0) + amount;
          
          // Track by payer
          spendingByPayer[expense.paidBy] = (spendingByPayer[expense.paidBy] || 0) + amount;
        }
        
        // Format the breakdown data into an array for display
        const eventBreakdown = Object.entries(spendingByEvent).map(([eventId, amount]) => {
          const event = (state.events || []).find(e => e.id === eventId);
          return {
            id: eventId,
            name: event ? event.name : 'No Event',
            amount,
            percentage: totalAmount ? (amount / totalAmount) * 100 : 0
          };
        }).sort((a, b) => b.amount - a.amount);
        
        const payerBreakdown = Object.entries(spendingByPayer).map(([userId, amount]) => {
          const user = (state.users || []).find(u => u.id === userId);
          return {
            id: userId,
            name: user ? user.name : 'Unknown',
            amount,
            percentage: totalAmount ? (amount / totalAmount) * 100 : 0
          };
        }).sort((a, b) => b.amount - a.amount);
        
        return {
          month: month.toLocaleDateString('default', { month: 'short' }),
          amount: totalAmount,
          count: monthlyExpenses.length,
          byEvent: eventBreakdown,
          byPayer: payerBreakdown
        };
      };
      
      // Use a promise-based approach for async processing but don't await here
      // We'll handle the async nature in useEffect
      trends.push(processMonthlyExpenses());
    }
    
    return Promise.all(trends);
  }, [state, selectedCurrency]);
  
  // State to hold the processed trends data
  const [processedTrends, setProcessedTrends] = useState<any[]>([]);
  
  // Effect to process the monthly trends once calculated
  useEffect(() => {
    // Resolve the promises in monthlyTrends when it changes
    if (monthlyTrends instanceof Promise) {
      setIsLoadingRates(true);
      monthlyTrends.then(resolvedTrends => {
        setProcessedTrends(resolvedTrends);
        setIsLoadingRates(false);
      }).catch(error => {
        console.error("Error processing monthly trends:", error);
        setConversionError("Error converting currencies. Using original amounts.");
        setIsLoadingRates(false);
        // Fall back to empty trends rather than crash
        setProcessedTrends([]);
      });
    } else if (Array.isArray(monthlyTrends)) {
      setProcessedTrends(monthlyTrends);
    }
  }, [monthlyTrends]);
  
  // Get expense categories distribution
  const categoryDistribution = useMemo(() => {
    if (!state) return [];
    
    // For simplicity, we'll use the event as the category if available
    const distribution = {};
    
    (state.expenses || []).forEach(expense => {
      let category = 'Uncategorized';
      
      if (expense.eventId) {
        const event = (state.events || []).find(e => e.id === expense.eventId);
        if (event) category = event.name;
      }
      
      distribution[category] = (distribution[category] || 0) + expense.amount;
    });
    
    // Convert to array of objects for easier rendering
    return Object.entries(distribution).map(([name, amount]) => ({
      name,
      amount: amount as number,
      percentage: (amount as number) / (financialSummary.totalSpent || 1) * 100
    })).sort((a, b) => b.amount - a.amount);
  }, [state, financialSummary.totalSpent]);
  
  // Calculate balance distribution among users
  const balanceDistribution = useMemo(() => {
    if (!state) return [];
    
    const balances = {};
    
    // Initialize balances for all users
    (state.users || []).forEach(user => {
      balances[user.id] = 0;
    });
    
    // Calculate balances from expenses
    (state.expenses || []).forEach(expense => {
      if (expense.settled) return;
      
      const paidBy = expense.paidBy;
      const participants = expense.participants;
      const amountPerPerson = expense.amount / participants.length;
      
      participants.forEach(participantId => {
        if (participantId === paidBy) return;
        
        balances[participantId] = (balances[participantId] || 0) - amountPerPerson;
        balances[paidBy] = (balances[paidBy] || 0) + amountPerPerson;
      });
    });
    
    // Convert to array and add user names
    return Object.entries(balances)
      .map(([userId, balance]) => {
        const user = (state.users || []).find(u => u.id === userId);
        return {
          userId,
          name: user ? user.name : 'Unknown',
          balance: balance as number
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [state]);
  
  // Now we can safely check for state and return the loading state AFTER all hooks have been called
  if (!state) {
    return <div className={styles.loading}>Loading application data...</div>;
  }
  
  // Normal rendering when state is available
  return hasData ? (
    <main className={styles.dashboardMain}>
      <DashboardHeader 
        expenses={state.expenses || []} 
        users={state.users || []} 
        events={state.events || []} 
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
        handleRefreshRates={handleRefreshRates}
      />
      
      <CurrencyExchangeTicker baseCurrency={selectedCurrency} />
      
      <div className={styles.dashboardSummary}>
        <FinancialSummary
          totalSpent={financialSummary.totalSpent}
          unsettledCount={financialSummary.unsettledCount}
          totalPendingAmount={financialSummary.totalPendingAmount}
        />
        
        <div className={styles.chartContainer}>
          <MonthlyTrendsChart 
            processedTrends={processedTrends}
            users={state.users || []}
            events={state.events || []}
            isLoadingRates={isLoadingRates}
            conversionError={conversionError}
            preferredCurrency={selectedCurrency}
          />
        </div>
      </div>
      
      <ExpenseDistribution categoryDistribution={categoryDistribution} />
      
      <BalanceOverview balanceDistribution={balanceDistribution} />
      
      <RecentExpenses expenses={recentExpenses} users={state.users || []} />
      
      <RecentSettlements 
        settlements={recentSettlements}
        users={state.users || []}
        events={state.events || []}
      />
      
      <UpcomingEvents events={financialSummary.upcomingEvents} />
    </main>
  ) : (
    <WelcomeScreen />
  );
}
