'use client';

import Link from 'next/link';
import { useAppContext } from '../context/AppContext';
import { useMemo } from 'react';
import { calculateSettlements } from '../utils/expenseCalculator';
import styles from './page.module.css';

export default function Home() {
  const { state } = useAppContext();
  
  // Check if the user has any data
  const hasData = state.expenses.length > 0 || state.events.length > 0;
  
  // Calculate financial summary
  const financialSummary = useMemo(() => {
    // Calculate how much the user has spent
    const totalSpent = state.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Calculate unsettled expenses
    const unsettledExpenses = state.expenses.filter(exp => !exp.settled);
    
    // Calculate upcoming events (events with start dates in the future)
    const today = new Date();
    const upcomingEvents = state.events.filter(
      event => new Date(event.startDate) >= today
    ).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    
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
        </div>
      </div>
      
      <div className={styles.dashboardGrid}>
        {/* Financial Summary */}
        <div className={styles.dashboardCard}>
          <h2 className={styles.cardTitle}>Financial Summary</h2>
          <div className={styles.summaryStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{financialSummary.totalSpent.toFixed(2)}</span>
              <span className={styles.statLabel}>Total Tracked</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statValue}>{financialSummary.unsettledCount}</span>
              <span className={styles.statLabel}>Unsettled Expenses</span>
            </div>
            
            <div className={styles.statItem}>
              <span className={styles.statValue}>{financialSummary.totalPendingAmount.toFixed(2)}</span>
              <span className={styles.statLabel}>Pending Settlements</span>
            </div>
          </div>
          
          {financialSummary.pendingSettlements.length > 0 && (
            <Link href="/settlements" className={styles.viewAllLink}>
              View all settlements
            </Link>
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
      </div>
    </main>
  );
}
