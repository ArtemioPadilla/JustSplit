'use client';

import Link from 'next/link';
import { useAppContext } from '../context/AppContext';
import { useMemo, useEffect, useState } from 'react';
import { calculateSettlements } from '../utils/expenseCalculator';
import CurrencyExchangeTicker from '../components/CurrencyExchangeTicker';
import { exportExpensesToCSV } from '../utils/csvExport';
import { getExchangeRate, SUPPORTED_CURRENCIES } from '../utils/currencyExchange';
import styles from './page.module.css';

export default function Home() {
  const { state } = useAppContext();
  const [colorBy, setColorBy] = useState<'event' | 'spender'>('event');
  const [isConvertingCurrencies, setIsConvertingCurrencies] = useState(true);
  const [isLoadingRates, setIsLoadingRates] = useState(false);
  const [conversionError, setConversionError] = useState<string | null>(null);
  
  // Check if the user has any data
  const hasData = state.expenses.length > 0 || state.events.length > 0;
  
  // Get the user's preferred currency
  const preferredCurrency = state.users.length > 0 ? state.users[0].preferredCurrency || 'USD' : 'USD';
  
  // Calculate financial summary
  const financialSummary = useMemo(() => {
    // Calculate how much the user has spent
    const totalSpent = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === preferredCurrency);
    
    // Calculate unsettled expenses
    const unsettledExpenses = state.expenses.filter(exp => !exp.settled);
    
    // Calculate upcoming events (events with start dates in the future)
    const today = new Date();
    const upcomingEvents = state.events
      .filter(event => new Date(event.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
    // Calculate pending settlements
    const pendingSettlements = calculateSettlements(state.expenses, state.users);
    const totalPendingAmount = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);
    
    return {
      totalSpent,
      unsettledCount: unsettledExpenses.length,
      pendingSettlements,
      totalPendingAmount,
      upcomingEvents: upcomingEvents.slice(0, 3) // Show only the next 3 events
    };
  }, [state.expenses, state.events, state.users]);
  
  // Get recent expenses
  const recentExpenses = useMemo(() => {
    return [...state.expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Show only the 5 most recent expenses
  }, [state.expenses]);
  
  // Get recent settlements
  const recentSettlements = useMemo(() => {
    return [...state.settlements]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3); // Show only the 3 most recent settlements
  }, [state.settlements]);
  
  // Calculate monthly expense trends for the last 6 months
  const monthlyTrends = useMemo(() => {
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
      const monthlyExpenses = state.expenses.filter(expense => {
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
          if (isConvertingCurrencies && expense.currency !== preferredCurrency) {
            const rate = await getRate(expense.currency, preferredCurrency);
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
          const event = state.events.find(e => e.id === eventId);
          return {
            id: eventId,
            name: event ? event.name : 'No Event',
            amount,
            percentage: (amount / totalAmount) * 100
          };
        }).sort((a, b) => b.amount - a.amount);
        
        const payerBreakdown = Object.entries(spendingByPayer).map(([userId, amount]) => {
          const user = state.users.find(u => u.id === userId);
          return {
            id: userId,
            name: user ? user.name : 'Unknown',
            amount,
            percentage: (amount / totalAmount) * 100
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
  }, [state.expenses, state.events, state.users, preferredCurrency, isConvertingCurrencies]);
  
  // State to hold the processed trends data
  const [processedTrends, setProcessedTrends] = useState<any[]>([]);
  
  // Effect to process the monthly trends once calculated
  useEffect(() => {
    // Resolve the promises in monthlyTrends when it changes
    if (monthlyTrends instanceof Promise) {
      setIsLoadingRates(true);
      monthlyTrends.then(resolvedTrends => {
        setProcessedTrends(resolvedTrends);
        console.log("Monthly trends for chart:", resolvedTrends);
        setIsLoadingRates(false);
      }).catch(error => {
        console.error("Error processing monthly trends:", error);
        setConversionError("Error converting currencies. Using original amounts.");
        const calculateWithoutConversion = () => {
          // Fallback: calculate without currency conversion
          // ... remaining implementation
        };
        calculateWithoutConversion();
        setIsLoadingRates(false);
      });
    } else if (Array.isArray(monthlyTrends)) {
      setProcessedTrends(monthlyTrends);
      console.log("Monthly trends for chart:", monthlyTrends);
    }
  }, [monthlyTrends]);
  
  // Get expense categories distribution
  const categoryDistribution = useMemo(() => {
    // For simplicity, we'll use the event as the category if available
    // In a real app, you'd have proper categories
    const distribution = {};
    
    state.expenses.forEach(expense => {
      let category = 'Uncategorized';
      
      if (expense.eventId) {
        const event = state.events.find(e => e.id === expense.eventId);
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
  }, [state.expenses, state.events, financialSummary.totalSpent]);
  
  // Calculate balance distribution among users
  const balanceDistribution = useMemo(() => {
    const balances = {};
    
    // Initialize balances for all users
    state.users.forEach(user => {
      balances[user.id] = 0;
    });
    
    // Calculate balances from expenses
    state.expenses.forEach(expense => {
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
        const user = state.users.find(u => u.id === userId);
        return {
          userId,
          name: user ? user.name : 'Unknown',
          balance: balance as number
        };
      })
      .sort((a, b) => b.balance - a.balance);
  }, [state.expenses, state.users]);
  
  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = state.users.find(user => user.id === userId);
    return user ? user.name : 'Unknown';
  };
  
  // Get event name by ID
  const getEventName = (eventId?: string): string => {
    if (!eventId) return '';
    const event = state.events.find(event => event.id === eventId);
    return event ? event.name : '';
  };
  
  // Helper for generating colors
  const getColorForIndex = (index: number, total: number) => {
    // Generate a hue based on the index and total count
    const hue = (index / total) * 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  if (!hasData) {
    // Show welcome screen for new users
    return (
      <main className={styles.main}>
        <h1>JustSplit</h1>
        <p>Fair expense splitting, made simple.</p>
        <p>Track, divide, and settle shared expenses effortlessly — for trips, events, or daily life.</p>
        <div className={styles.buttons}>
          <Link href="/expenses/new" className={styles.button}>
            Add Expense
          </Link>
          <Link href="/events/new" className={styles.button}>
            Create Event
          </Link>
        </div>
      </main>
    );
  } 
  
  // Dashboard view for users with data
  return (
    <main className={styles.dashboardMain}>
      <div className={styles.dashboardHeader}>
        <h1>Dashboard</h1>
        <div className={styles.quickActions}>
          <Link href="/expenses/new" className={styles.button}>Add Expense</Link>
          <Link href="/events/new" className={styles.button}>Create Event</Link>
          <button 
            className={`${styles.button} ${styles.secondaryButton}`}
            onClick={() => exportExpensesToCSV(state.expenses, state.users, 'all-expenses.csv')}
            disabled={state.expenses.length === 0}
          >
            Export Expenses
          </button>
        </div>
      </div>
      {/* Exchange Rates Ticker */}
      <CurrencyExchangeTicker baseCurrency={preferredCurrency} />
      <div className={styles.dashboardSummary}>
        <div className={styles.summaryCard}>
          <h2 className={styles.cardTitle}>Financial Overview</h2>
          <div className={styles.summaryStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>${financialSummary.totalSpent.toFixed(2)}</span>
              <span className={styles.statLabel}>Total Tracked</span>
              <div className={styles.statIcon}>💰</div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{financialSummary.unsettledCount}</span>
              <span className={styles.statLabel}>Unsettled Expenses</span>
              <div className={styles.statIcon}>📝</div>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>${financialSummary.totalPendingAmount.toFixed(2)}</span>
              <span className={styles.statLabel}>Pending Settlements</span>
              <div className={styles.statIcon}>⏳</div>
            </div>
          </div>
        </div>
        <div className={styles.chartContainer}>
          {/* Monthly Expense Trends Chart */}
          <div className={styles.dashboardCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Monthly Expense Trends</h2>
              <div className={styles.chartControls}>
                <div className={styles.controlGroup}>
                  <label className={styles.controlLabel}>Color by:</label>
                  <div className={styles.buttonToggle}>
                    <button 
                      className={`${styles.toggleButton} ${colorBy === 'event' ? styles.toggleActive : ''}`}
                      onClick={() => setColorBy('event')}
                    >
                      Event
                    </button>
                    <button 
                      className={`${styles.toggleButton} ${colorBy === 'spender' ? styles.toggleActive : ''}`}
                      onClick={() => setColorBy('spender')}
                    >
                      Spender
                    </button>
                  </div>
                </div>
                <div className={styles.controlGroup}>
                  <label className={styles.switchControl}>
                    <input
                      type="checkbox"
                      checked={isConvertingCurrencies}
                      onChange={() => setIsConvertingCurrencies(!isConvertingCurrencies)}
                    />
                    <span className={styles.switchLabel}>Convert currencies</span>
                  </label>
                </div>
              </div>
            </div>
            <div className={styles.barChart}>
              {processedTrends.map((month, index) => {
                const maxAmount = Math.max(...processedTrends.map(m => m.amount)) || 1;
                
                // Force minimum visible height for bars with values (10px)
                const heightPercentage = month.amount > 0
                  ? Math.max(10, (month.amount / maxAmount) * 100)
                  : 0;
                
                // Get the breakdown data based on selected coloring option
                const breakdown = colorBy === 'event' ? month.byEvent : month.byPayer;
                // If there's no data, show a simple bar
                if (!breakdown || breakdown.length === 0) {
                  return (
                    <div className={styles.barGroup} key={index}>
                      <div className={styles.bar} 
                        style={{ 
                          height: `${heightPercentage}%`,
                          backgroundColor: month.amount > 0 ? 'var(--primary-color)' : 'transparent'
                        }}
                        title={`${preferredCurrency} ${month.amount.toFixed(2)} (${month.count} expenses)`}
                      ></div>
                      <div className={styles.barLabel}>{month.month}</div>
                    </div>
                  );
                }
                
                // Otherwise show a stacked bar with segments
                return (
                  <div className={styles.barGroup} key={index}>
                    <div 
                      className={styles.stackedBar}
                      style={{ height: `${heightPercentage}%` }}
                      title={`${preferredCurrency} ${month.amount.toFixed(2)} (${month.count} expenses)`}
                    >
                      {breakdown.map((segment, segIndex) => {
                        const segmentHeight = (segment.percentage / 100) * heightPercentage;
                        return (
                          <div 
                            key={segIndex}
                            className={styles.barSegment}
                            style={{ 
                              height: `${segmentHeight}%`,
                              backgroundColor: getColorForIndex(
                                segIndex, 
                                colorBy === 'event' ? state.events.length + 1 : state.users.length
                              )
                            }}
                            title={`${segment.name}: ${preferredCurrency} ${segment.amount.toFixed(2)} (${segment.percentage.toFixed(1)}%)`}
                          ></div>
                        );
                      })}
                    </div>
                    <div className={styles.barLabel}>{month.month}</div>
                  </div>
                );
              })}
            </div>
            <div className={styles.chartLegend}>
              <div className={styles.legendItems}>
                {colorBy === 'event' && state.events.length > 0 && (
                  <>
                    <div className={styles.legendItem}>
                      <span 
                        className={styles.legendColor}
                        style={{ backgroundColor: getColorForIndex(state.events.length, state.events.length + 1) }}
                      ></span>
                      <span>No Event</span>
                    </div>
                    {state.events.slice(0, 5).map((event, idx) => (
                      <div key={event.id} className={styles.legendItem}>
                        <span 
                          className={styles.legendColor}
                          style={{ backgroundColor: getColorForIndex(idx, state.events.length + 1) }}
                        ></span>
                        <span>{event.name}</span>
                      </div>
                    ))}
                  </>
                )}
                {colorBy === 'spender' && state.users.length > 0 && (
                  <>
                    {state.users.slice(0, 7).map((user, idx) => (
                      <div key={user.id} className={styles.legendItem}>
                        <span 
                          className={styles.legendColor}
                          style={{ backgroundColor: getColorForIndex(idx, state.users.length) }}
                        ></span>
                        <span>{user.name}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className={styles.legendTotal}>
                <span>Last 6 Months Total:</span>
                <span className={styles.legendValue}>
                  {preferredCurrency} {processedTrends.reduce((sum, month) => sum + month.amount, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Expense Distribution */}
      <div className={styles.dashboardCard}>
        <h2 className={styles.cardTitle}>Expense Distribution</h2>
        {categoryDistribution.length > 0 ? (
          <div className={styles.distributionChart}>
            {categoryDistribution.slice(0, 5).map((category, index) => (
              <div key={index} className={styles.distributionItem}>
                <div className={styles.distributionLabel}>
                  <span className={styles.categoryColor} style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></span>
                  <span className={styles.categoryName}>{category.name}</span>
                </div>
                <div className={styles.distributionBar}>
                  <div 
                    className={styles.distributionFill} 
                    style={{ 
                      width: `${category.percentage}%`,
                      backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                    }}
                  ></div>
                </div>
                <div className={styles.distributionValue}>
                  ${category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyMessage}>No expenses to categorize</p>
        )}
      </div>
      
      {/* Balance Distribution */}
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
      
      {/* Recent Expenses */}
      <div className={styles.dashboardCard}>
        <h2 className={styles.cardTitle}>Recent Expenses</h2>
        {recentExpenses.length > 0 ? (
          <ul className={styles.expensesList}>
            {recentExpenses.map(expense => (
              <li key={expense.id} className={styles.expenseItem}>
                <Link href={`/expenses/${expense.id}`}>
                  <div className={styles.expenseName}>{expense.description}</div>
                  <div className={styles.expenseDetails}>
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                    <span className={styles.expenseAmount}>
                      {expense.currency} {expense.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.expensePaidBy}>
                    Paid by {getUserName(expense.paidBy)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyMessage}>No expenses yet</p>
        )}
        <Link href="/expenses/list" className={styles.viewAllLink}>
          View all expenses
        </Link>
      </div>
      
      {/* Recent Settlements */}
      <div className={styles.dashboardCard}>
        <h2 className={styles.cardTitle}>Recent Settlements</h2>
        {recentSettlements.length > 0 ? (
          <ul className={styles.settlementsList}>
            {recentSettlements.map(settlement => (
              <li key={settlement.id} className={styles.settlementItem}>
                <div className={styles.settlementUsers}>
                  <span>{getUserName(settlement.fromUser)}</span>
                  <span className={styles.settlementArrow}>→</span>
                  <span>{getUserName(settlement.toUser)}</span>
                </div>
                <div className={styles.settlementDetails}>
                  <span>{new Date(settlement.date).toLocaleDateString()}</span>
                  <span className={styles.settlementAmount}>
                    ${settlement.amount.toFixed(2)}
                  </span>
                </div>
                {settlement.eventId && (
                  <div className={styles.settlementEvent}>
                    {getEventName(settlement.eventId)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyMessage}>No settlements yet</p>
        )}
        <Link href="/settlements" className={styles.viewAllLink}>
          View all settlements
        </Link>
      </div>
      
      {/* Upcoming Events */}
      <div className={styles.dashboardCard}>
        <h2 className={styles.cardTitle}>Upcoming Events</h2>
        {financialSummary.upcomingEvents.length > 0 ? (
          <ul className={styles.eventsList}>
            {financialSummary.upcomingEvents.map(event => (
              <li key={event.id} className={styles.eventItem}>
                <Link href={`/events/${event.id}`}>
                  <div className={styles.eventName}>{event.name}</div>
                  <div className={styles.eventDate}>
                    {new Date(event.startDate).toLocaleDateString()}
                    {event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                  </div>
                  <div className={styles.eventParticipants}>
                    {event.participants.length} participants
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyMessage}>No upcoming events</p>
        )}
        <Link href="/events/list" className={styles.viewAllLink}>
          View all events
        </Link>
      </div>
    </main>
  );
}
