'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { calculateSettlements, calculateSettlementsWithConversion } from '../../utils/expenseCalculator';
import { getExchangeRate } from '../../utils/currencyExchange';
import { useSearchParams } from 'next/navigation';
import { Settlement } from '../../types';
import styles from './page.module.css';
import Button from '../../components/ui/Button';
import CurrencySelector from '../../components/ui/CurrencySelector';

export default function SettlementsPage() {
  const searchParams = useSearchParams();
  const { state, dispatch } = useAppContext();
  
  // Get event param from URL - Move this before the state check
  const eventParam = searchParams?.get('event') || null;
  
  // Initialize all state hooks at the top level
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'balance'>('pending');
  const [selectedEventId, setSelectedEventId] = useState<string>(eventParam || 'all');
  const [displayCurrency, setDisplayCurrency] = useState<string>('USD');
  const [pendingSettlements, setPendingSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [exchangeRates] = useState<Record<string, { rate: number, timestamp: Date }>>({});
  // const [setExchangeRates] - commented out as unused
  const [showExpensesBreakdown, setShowExpensesBreakdown] = useState<boolean>(false);
  const [convertedSettlementAmounts, setConvertedSettlementAmounts] = useState<Record<string, number>>({});
  const [convertedBalances] = useState<Record<string, { overall: number, byEvent: Record<string, number> }>>({});
  // const [setConvertedBalances] - commented out as unused

  // Calculate the total unsettled amount
  const totalUnsettledAmount = useMemo(() => {
    return pendingSettlements.reduce((sum, settlement) => sum + settlement.amount, 0);
  }, [pendingSettlements]);

  // Get events with unsettled expenses for the filter
  const eventsWithUnsettledExpenses = useMemo(() => {
    if (!state?.expenses || !state?.events) return [];
    const unsettledExpenses = state.expenses.filter(exp => !exp.settled);
    const eventIds = Array.from(
      new Set(
        unsettledExpenses
          .map(exp => exp.eventId)
          .filter((id): id is string => id !== undefined)
      )
    );
    return state.events.filter(event => eventIds.includes(event.id));
  }, [state?.expenses, state?.events]);

  // Get filtered settlement history
  const filteredSettlementHistory = useMemo(() => {
    if (!state?.settlements) return [];
    return selectedEventId === 'all'
      ? state.settlements
      : state.settlements.filter(s => s.eventId === selectedEventId);
  }, [state?.settlements, selectedEventId]);
  
  // Get filtered expenses (unsettled only)
  const filteredExpenses = useMemo(() => {
    if (!state?.expenses) return [];
    const unsettledExpenses = state.expenses.filter(exp => !exp.settled);
    return selectedEventId === 'all' 
      ? unsettledExpenses
      : unsettledExpenses.filter(exp => exp.eventId === selectedEventId);
  }, [state?.expenses, selectedEventId]);

  // Get unique currencies in the filtered expenses
  const expenseCurrencies = useMemo(() => {
    const currencies = new Set(filteredExpenses.map(exp => exp.currency));
    return Array.from(currencies);
  }, [filteredExpenses]);
  
  // Calculate user balances for display
  // const balances = useMemo(() => { - commented out as unused
  // ... balance calculation logic would go here
  // }, [state?.users, state?.expenses, state?.events]);

  // Calculate pending settlements based on selected event and currency
  useEffect(() => {
    const fetchSettlements = async () => {
      if (!state?.expenses || !state?.users) return;
      
      setIsLoading(true);
      try {
        const settlements = await calculateSettlementsWithConversion(
          state.expenses,
          state.users,
          displayCurrency,
          selectedEventId === 'all' ? undefined : selectedEventId
        );
        
        // Convert to Settlement format with necessary properties
        const formattedSettlements: Settlement[] = settlements.map(settlement => ({
          id: `${settlement.fromUser}-${settlement.toUser}-${Date.now()}`,
          fromUser: settlement.fromUser,
          toUser: settlement.toUser,
          amount: settlement.amount,
          currency: displayCurrency,
          date: new Date().toISOString(),
          expenseIds: settlement.expenseIds,
          eventId: settlement.eventId
        }));
        
        setPendingSettlements(formattedSettlements);
      } catch (error) {
        console.error('Error calculating settlements:', error);
        // Fallback to regular calculation without conversion
        const settlements = calculateSettlements(
          state.expenses,
          state.users,
          selectedEventId === 'all' ? undefined : selectedEventId
        );
        
        // Convert to Settlement format with necessary properties
        const formattedSettlements: Settlement[] = settlements.map(settlement => ({
          id: `${settlement.fromUser}-${settlement.toUser}-${Date.now()}`,
          fromUser: settlement.fromUser,
          toUser: settlement.toUser,
          amount: settlement.amount,
          currency: displayCurrency,
          date: new Date().toISOString(),
          expenseIds: settlement.expenseIds,
          eventId: settlement.eventId
        }));
        
        setPendingSettlements(formattedSettlements);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSettlements();
  }, [state?.expenses, state?.users, selectedEventId, displayCurrency]);

  // Effect hook to convert historical settlement amounts when currency or filter changes
  useEffect(() => {
    const convertAmounts = async () => {
      const converted: Record<string, number> = {};
      
      // Process each settlement
      for (const settlement of filteredSettlementHistory) {
        // Skip if already in the target currency
        if (settlement.currency === displayCurrency) {
          converted[settlement.id] = settlement.amount;
          continue;
        }
        
        try {
          const rateData = await getExchangeRate(settlement.currency, displayCurrency);
          const rateValue = typeof rateData === 'object' && rateData !== null ? rateData.rate : 1;
          converted[settlement.id] = settlement.amount * rateValue;
        } catch (error) {
          console.error(`Error converting settlement amount from ${settlement.currency} to ${displayCurrency}:`, error);
          // Fallback to original amount if conversion fails
          converted[settlement.id] = settlement.amount;
        }
      }
      
      setConvertedSettlementAmounts(converted);
    };
    
    if (activeTab === 'history' && filteredSettlementHistory.length > 0) {
      convertAmounts();
    }
  }, [displayCurrency, filteredSettlementHistory, activeTab]);
  
  // Add null check for state AFTER all hooks are declared
  if (!state) {
    return <div className={styles.loadingState}>Loading application data...</div>;
  }
  
  // Utility function for formatting currency values
  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2);
  };
  
  // Helper function to get user name
  const getUserName = (userId: string): string => {
    const user = (state.users || []).find(user => user.id === userId);
    return user ? user.name : 'Unknown User';
  };
  
  // Helper function to get event name
  const getEventName = (eventId?: string): string => {
    if (!eventId) return 'No Event';
    const event = (state.events || []).find(event => event.id === eventId);
    return event ? event.name : 'Unknown Event';
  };

  // Handle settling up
  const handleSettleUp = (settlement: Settlement) => {
    dispatch({
      type: 'ADD_SETTLEMENT',
      payload: {
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        amount: settlement.amount,
        currency: displayCurrency,
        expenseIds: settlement.expenseIds,
        eventId: settlement.eventId || ''
      }
    });
    
    // Recalculate pending settlements
    const updatedSettlements = pendingSettlements.filter(
      s => s.fromUser !== settlement.fromUser || s.toUser !== settlement.toUser
    );
    setPendingSettlements(updatedSettlements);
  };

  // Add currency selector UI
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settlements</h1>
      
      <div className={styles.filterContainer}>
        <div className={styles.filterItem}>
          <label htmlFor="event-filter" className={styles.filterLabel}>
            Filter by Event:
          </label>
          <select
            id="event-filter"
            className={styles.filterSelect}
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="all">All Events</option>
            {eventsWithUnsettledExpenses.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterItem}>
          <CurrencySelector
            value={displayCurrency}
            onChange={setDisplayCurrency}
            id="currency-filter"
            label="Settlement Currency:"
            compact={true}
          />
          <small className={styles.helpText}>All settlements will be calculated in this currency</small>
        </div>
      </div>
      
      {/* Calculation Details Section */}
      <div className={styles.calculationDetails}>
        <div className={styles.detailHeader} onClick={() => setShowExpensesBreakdown(!showExpensesBreakdown)}>
          <h3>Calculation Details</h3>
          <span className={styles.toggleIcon}>{showExpensesBreakdown ? '▼' : '►'}</span>
        </div>
        
        <div className={`${styles.detailContent} ${showExpensesBreakdown ? styles.expanded : ''}`}>
          <div className={styles.detailSection}>
            <h4>Expenses Included</h4>
            <p>
              <strong>{filteredExpenses.length}</strong> unsettled expenses 
              {selectedEventId !== 'all' ? ` from event "${getEventName(selectedEventId)}"` : ' across all events'}
            </p>
            
            {filteredExpenses.length > 0 && (
              <div className={styles.currencyBreakdown}>
                <h5>Currency Breakdown:</h5>
                <ul className={styles.currencyList}>
                  {expenseCurrencies.map(currency => {
                    const count = filteredExpenses.filter(exp => exp.currency === currency).length;
                    const total = filteredExpenses
                      .filter(exp => exp.currency === currency)
                      .reduce((sum, exp) => sum + exp.amount, 0);
                    
                    return (
                      <li key={currency} className={styles.currencyItem}>
                        <span className={styles.currencyCode}>{currency}:</span> 
                        <span>{count} expenses totaling {currency} {total.toFixed(2)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          
          {expenseCurrencies.length > 1 && (
            <div className={styles.detailSection}>
              <h4>Exchange Rates Used</h4>
              <p>All amounts converted to {displayCurrency} for settlement calculations.</p>
              
              <div className={styles.exchangeRatesTable}>
                <table className={styles.ratesTable}>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th>Rate</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(exchangeRates).map(([fromCurrency, data]) => (
                      <tr key={fromCurrency}>
                        <td>{fromCurrency}</td>
                        <td>{displayCurrency}</td>
                        <td className={styles.rateValue}>1 {fromCurrency} = {data.rate.toFixed(4)} {displayCurrency}</td>
                        <td>{data.timestamp.toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <p className={styles.disclaimer}>
                Exchange rates are fetched from Yahoo Finance API and cached for 1 hour.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <div className={styles.tabs}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'pending' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending Settlements
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'balance' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('balance')}
        >
          Balance Overview
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Settlement History
        </button>
      </div>
      
      {activeTab === 'pending' && (
        <div className={styles.tabContent}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <p>Loading settlements and converting currencies...</p>
            </div>
          ) : pendingSettlements.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>All Settled Up!</h3>
              <p>There are no pending settlements {selectedEventId !== 'all' ? 'for this event' : ''} at the moment.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryCard}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Unsettled</span>
                  <span className={styles.summaryValue}>{displayCurrency} {formatCurrency(totalUnsettledAmount)}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Settlements</span>
                  <span className={styles.summaryValue}>{pendingSettlements.length}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Expenses Included</span>
                  <span className={styles.summaryValue}>{filteredExpenses.length}</span>
                </div>
              </div>
              
              <div className={styles.settlementsList}>
                {pendingSettlements.map((settlement, index) => (
                  <div key={index} className={styles.settlementCard}>
                    <div className={styles.settlementDetails}>
                      <div className={styles.settlementUsers}>
                        <div className={styles.settlementUser}>
                          <span className={styles.userLabel}>From</span>
                          <span className={styles.userName}>{getUserName(settlement.fromUser)}</span>
                        </div>
                        <div className={styles.arrowIcon}>→</div>
                        <div className={styles.settlementUser}>
                          <span className={styles.userLabel}>To</span>
                          <span className={styles.userName}>{getUserName(settlement.toUser)}</span>
                        </div>
                      </div>
                      <div className={styles.settlementAmount}>
                        {displayCurrency} {formatCurrency(settlement.amount)}
                      </div>
                    </div>
                    
                    {settlement.eventId && (
                      <div className={styles.settlementEvent}>
                        <span className={styles.eventLabel}>Event:</span>
                        <span className={styles.eventName}>{getEventName(settlement.eventId)}</span>
                      </div>
                    )}
                    
                    {/* Add expense details for the settlement */}
                    <div className={styles.settlementExpenses}>
                      <div className={styles.expensesHeader} onClick={() => {
                        // Toggle expense details view (you'll need to add state for this)
                        // This is a simplified example - in reality, you'd track which settlements are expanded
                        const element = document.getElementById(`expenses-${index}`);
                        if (element) {
                          element.style.display = element.style.display === 'none' ? 'block' : 'none';
                        }
                      }}>
                        <span>Based on {settlement.expenseIds.length} expenses</span>
                        <span className={styles.detailsToggle}>Show details</span>
                      </div>
                      
                      <div id={`expenses-${index}`} className={styles.expensesDetails} style={{display: 'none'}}>
                        <ul className={styles.expensesList}>
                          {settlement.expenseIds.map((expId: string) => {
                            const expense = state.expenses.find(e => e.id === expId);
                            if (!expense) return null;
                            
                            // If currency conversion was needed, display the original amount
                            const needsConversion = expense.currency !== displayCurrency;
                            const convertedAmount = needsConversion 
                              ? (exchangeRates[expense.currency]?.rate || 1) * expense.amount 
                              : expense.amount;
                            
                            return (
                              <li key={expId} className={styles.expenseItem}>
                                <div className={styles.expenseName}>{expense.description}</div>
                                <div className={styles.expenseInfo}>
                                  <span>Paid by: {getUserName(expense.paidBy)}</span>
                                  <span>Date: {new Date(expense.date).toLocaleDateString()}</span>
                                  <span className={styles.expenseAmount}>
                                    {expense.currency} {expense.amount.toFixed(2)}
                                    {needsConversion && (
                                      <span className={styles.convertedAmount}>
                                        ≈ {displayCurrency} {convertedAmount.toFixed(2)}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                    
                    <div className={styles.settlementActions}>
                      <Button 
                        onClick={() => handleSettleUp(settlement)}
                        variant="primary"
                      >
                        Mark as Settled
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      
      {activeTab === 'balance' && (
        <div className={styles.tabContent}>
          <div className={styles.balanceHeader}>
            <h3>Balance Overview</h3>
            <p className={styles.balanceDescription}>
              See who owes whom and how much across all events or filtered by a specific event.
            </p>
          </div>
          
          <div className={styles.balanceTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Person</th>
                  <th className={styles.alignRight}>Overall Balance</th>
                  {selectedEventId !== 'all' && (
                    <th className={styles.alignRight}>Event Balance</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {state.users.map(user => {
                  const overallBalance = convertedBalances[user.id]?.overall || 0;
                  const eventBalance = selectedEventId !== 'all' 
                    ? convertedBalances[user.id]?.byEvent[selectedEventId] || 0 
                    : 0;
                  
                  return (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td className={`${styles.alignRight} ${overallBalance > 0 ? styles.positive : overallBalance < 0 ? styles.negative : ''}`}>
                        {overallBalance > 0 ? '+' : ''}{formatCurrency(overallBalance)}
                      </td>
                      {selectedEventId !== 'all' && (
                        <td className={`${styles.alignRight} ${eventBalance > 0 ? styles.positive : eventBalance < 0 ? styles.negative : ''}`}>
                          {eventBalance > 0 ? '+' : ''}{formatCurrency(eventBalance)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {selectedEventId === 'all' && state.events.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>Breakdown by Event</h3>
              
              <div className={styles.eventBreakdownList}>
                {state.events.map(event => {
                  // Only show events with expenses
                  const hasExpenses = state.expenses.some(exp => exp.eventId === event.id);
                  if (!hasExpenses) return null;
                  
                  return (
                    <div key={event.id} className={styles.eventBreakdownCard}>
                      <h4 className={styles.eventBreakdownTitle}>{event.name}</h4>
                      
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Person</th>
                            <th className={styles.alignRight}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {state.users
                            .filter(user => event.members.includes(user.id))
                            .map(user => {
                              const balance = convertedBalances[user.id]?.byEvent[event.id] || 0;
                              
                              return (
                                <tr key={user.id}>
                                  <td>{user.name}</td>
                                  <td className={`${styles.alignRight} ${balance > 0 ? styles.positive : balance < 0 ? styles.negative : ''}`}>
                                    {balance > 0 ? '+' : ''}{formatCurrency(balance)}
                                  </td>
                                </tr>
                              );
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
      
      {activeTab === 'history' && (
        <div className={styles.tabContent}>
          {filteredSettlementHistory.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Settlement History</h3>
              <p>Once settlements are marked as complete, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className={styles.settlementsList}>
              {filteredSettlementHistory.map(settlement => (
                <div key={settlement.id} className={`${styles.settlementCard} ${styles.completedSettlement}`}>
                  <div className={styles.settlementDetails}>
                    <div className={styles.settlementUsers}>
                      <div className={styles.settlementUser}>
                        <span className={styles.userLabel}>From</span>
                        <span className={styles.userName}>{getUserName(settlement.fromUser)}</span>
                      </div>
                      <div className={styles.arrowIcon}>→</div>
                      <div className={styles.settlementUser}>
                        <span className={styles.userLabel}>To</span>
                        <span className={styles.userName}>{getUserName(settlement.toUser)}</span>
                      </div>
                    </div>
                    <div className={styles.settlementAmount}>
                      {settlement.currency} {formatCurrency(settlement.amount)}
                      {settlement.currency !== displayCurrency && convertedSettlementAmounts[settlement.id] && (
                        <span className={styles.convertedAmount}>
                          ≈ {displayCurrency} {formatCurrency(convertedSettlementAmounts[settlement.id])}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {settlement.eventId && (
                    <div className={styles.settlementEvent}>
                      <span className={styles.eventLabel}>Event:</span>
                      <span className={styles.eventName}>{getEventName(settlement.eventId)}</span>
                    </div>
                  )}
                  
                  <div className={styles.settlementMeta}>
                    <span className={styles.settlementDate}>
                      {new Date(settlement.date).toLocaleDateString()}
                    </span>
                    <span className={styles.settlementStatus}>Completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
