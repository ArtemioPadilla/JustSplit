'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { calculateSettlements } from '../../utils/expenseCalculator';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

export default function SettlementsPage() {
  const searchParams = useSearchParams();
  const { state, dispatch } = useAppContext();
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'balance'>('pending');
  
  // Initialize with event param from URL if available
  const eventParam = searchParams.get('event');
  const [selectedEventId, setSelectedEventId] = useState<string>(eventParam || 'all');
  
  // Get events with unsettled expenses for the filter
  const eventsWithUnsettledExpenses = useMemo(() => {
    const unsettledExpenses = state.expenses.filter(exp => !exp.settled);
    const eventIds = [...new Set(unsettledExpenses.map(exp => exp.eventId).filter(Boolean))];
    return state.events.filter(event => eventIds.includes(event.id));
  }, [state.expenses, state.events]);
  
  // Calculate pending settlements based on selected event
  const pendingSettlements = useMemo(() => {
    return selectedEventId === 'all' 
      ? calculateSettlements(state.expenses, state.users) 
      : calculateSettlements(state.expenses, state.users, selectedEventId);
  }, [state.expenses, state.users, selectedEventId]);
  
  // Filter settlement history by event
  const filteredSettlementHistory = useMemo(() => {
    return selectedEventId === 'all'
      ? state.settlements
      : state.settlements.filter(settlement => settlement.eventId === selectedEventId);
  }, [state.settlements, selectedEventId]);
  
  // Calculate user balances overall and per event
  const balances = useMemo(() => {
    const userBalances: Record<string, { overall: number, byEvent: Record<string, number> }> = {};
    
    // Initialize user balances
    state.users.forEach(user => {
      userBalances[user.id] = { 
        overall: 0, 
        byEvent: {} 
      };
      
      // Initialize balance for each event
      state.events.forEach(event => {
        userBalances[user.id].byEvent[event.id] = 0;
      });
    });
    
    // Process expenses to calculate balances
    state.expenses.forEach(expense => {
      if (expense.settled) return;
      
      const paidBy = expense.paidBy;
      const participants = expense.participants;
      const amountPerPerson = expense.amount / participants.length;
      
      participants.forEach(participantId => {
        if (participantId === paidBy) return; // Payer doesn't owe themselves
        
        // Update overall balance
        userBalances[participantId].overall -= amountPerPerson;
        userBalances[paidBy].overall += amountPerPerson;
        
        // Update per-event balance if expense is associated with an event
        if (expense.eventId) {
          userBalances[participantId].byEvent[expense.eventId] -= amountPerPerson;
          userBalances[paidBy].byEvent[expense.eventId] += amountPerPerson;
        }
      });
    });
    
    return userBalances;
  }, [state.users, state.events, state.expenses]);
  
  // Get username by user ID
  const getUserName = (userId: string): string => {
    const user = state.users.find(user => user.id === userId);
    return user ? user.name : 'Unknown User';
  };
  
  // Get event name by event ID
  const getEventName = (eventId?: string): string => {
    if (!eventId) return 'No event';
    const event = state.events.find(event => event.id === eventId);
    return event ? event.name : 'Unknown event';
  };
  
  // Handle settlement completion
  const handleSettleUp = (settlement: { fromUser: string; toUser: string; amount: number; expenseIds: string[]; eventId?: string }) => {
    dispatch({
      type: 'ADD_SETTLEMENT',
      payload: {
        fromUser: settlement.fromUser,
        toUser: settlement.toUser,
        amount: settlement.amount,
        expenseIds: settlement.expenseIds,
        eventId: settlement.eventId
      }
    });
  };
  
  // Format currency with 2 decimal places
  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2);
  };
  
  // Calculate total unsettled amount
  const totalUnsettledAmount = pendingSettlements.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settlements</h1>
      
      <div className={styles.filterContainer}>
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
          {pendingSettlements.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>All Settled Up!</h3>
              <p>There are no pending settlements {selectedEventId !== 'all' ? 'for this event' : ''} at the moment.</p>
            </div>
          ) : (
            <>
              <div className={styles.summaryCard}>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Total Unsettled</span>
                  <span className={styles.summaryValue}>${formatCurrency(totalUnsettledAmount)}</span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Settlements</span>
                  <span className={styles.summaryValue}>{pendingSettlements.length}</span>
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
                        ${formatCurrency(settlement.amount)}
                      </div>
                    </div>
                    
                    {settlement.eventId && (
                      <div className={styles.settlementEvent}>
                        <span className={styles.eventLabel}>Event:</span>
                        <span className={styles.eventName}>{getEventName(settlement.eventId)}</span>
                      </div>
                    )}
                    
                    <div className={styles.settlementActions}>
                      <button 
                        className={styles.settleButton}
                        onClick={() => handleSettleUp(settlement)}
                      >
                        Mark as Settled
                      </button>
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
                  const overallBalance = balances[user.id]?.overall || 0;
                  const eventBalance = selectedEventId !== 'all' 
                    ? balances[user.id]?.byEvent[selectedEventId] || 0 
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
                            .filter(user => event.participants.includes(user.id))
                            .map(user => {
                              const balance = balances[user.id]?.byEvent[event.id] || 0;
                              
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
              <p>Once settlements are marked as complete, they'll appear here.</p>
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
                      ${formatCurrency(settlement.amount)}
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
