import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, convertCurrency, getCurrencySymbol } from '../../utils/currencyExchange';
import { Expense, User, Event } from '../../types';

interface RecentExpensesProps {
  expenses?: Expense[];
  users?: User[];
  events?: Event[];
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
}

const RecentExpenses: React.FC<RecentExpensesProps> = ({ 
  expenses: propExpenses, 
  users: propUsers, 
  events: propEvents, 
  preferredCurrency: propPreferredCurrency, 
  isConvertingCurrencies: propIsConverting 
}) => {
  const context = useAppContext();
  const state = context?.state;
  const preferredCurrency = propPreferredCurrency || context?.preferredCurrency || 'USD';
  const isConvertingCurrencies = propIsConverting !== undefined ? propIsConverting : context?.isConvertingCurrencies ?? true;
  const users = propUsers || state?.users || [];
  const events = propEvents || state?.events || [];
  
  // Memoize expenses to avoid dependency issues
  const expenses = useMemo(() => propExpenses || state?.expenses || [], [propExpenses, state?.expenses]);

  const [convertedAmounts, setConvertedAmounts] = useState<{[key: string]: number}>({});
  const [fallbacks, setFallbacks] = useState<{[key: string]: boolean}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Helper: get user name
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  // Helper: get event name
  const getEventName = (eventId: string | undefined) => {
    if (!eventId) return '';
    const event = events.find(e => e.id === eventId);
    return event ? event.name : '';
  };

  // Memoize recentExpenses
  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);
  }, [expenses]);

  // Fetch converted amounts for expenses
  useEffect(() => {
    let isMounted = true;
    const fetchConversions = async () => {
      setIsLoading(true);
      const conversions: { [key: string]: number } = {};
      const fallbackFlags: { [key: string]: boolean } = {};
      await Promise.all(
        recentExpenses.map(async (expense) => {
          if (expense.currency === preferredCurrency || !isConvertingCurrencies) {
            conversions[expense.id] = expense.amount;
            fallbackFlags[expense.id] = false;
          } else {
            try {
              const { convertedAmount, isFallback } = await convertCurrency(
                expense.amount,
                expense.currency,
                preferredCurrency
              );
              conversions[expense.id] = convertedAmount;
              fallbackFlags[expense.id] = isFallback;
            } catch {
              conversions[expense.id] = expense.amount;
              fallbackFlags[expense.id] = true;
            }
          }
        })
      );
      if (isMounted) {
        setConvertedAmounts(conversions);
        setFallbacks(fallbackFlags);
        setIsLoading(false);
        
        // Debug information
        console.log('After conversion:', {
          conversions,
          fallbackFlags,
          preferredCurrency,
          isConvertingCurrencies,
          expenses: recentExpenses.map(e => ({id: e.id, currency: e.currency}))
        });
      }
    };
    fetchConversions();
    return () => { isMounted = false; };
  }, [recentExpenses, preferredCurrency, isConvertingCurrencies]);

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Expenses</h2>
      {isLoading ? (
        <div className={styles.loadingState}>
          <p>Converting currencies...</p>
        </div>
      ) : recentExpenses.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table} style={{ minWidth: 900, width: '100%' }}>
            <thead>
              <tr>
                <th align="left">Description</th>
                <th align="center">Amount</th>
                <th align="left">Paid By</th>
                <th align="left">Participants</th>
                <th align="left">Event</th>
                <th align="center">Date</th>
                <th align="center">Status</th>
                <th align="left">Notes</th>
              </tr>
            </thead>
            <tbody>
              {recentExpenses.map(expense => {
                const originalAmount = formatCurrency(expense.amount, expense.currency);
                const converted = convertedAmounts[expense.id];
                const isFallback = fallbacks[expense.id];
                const showConverted = expense.currency !== preferredCurrency && isConvertingCurrencies;
                const participants = expense.participants.map(getUserName).join(', ');
                const eventName = getEventName(expense.eventId);
                return (
                  <tr key={expense.id} className={styles.expenseItem} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td>
                      <Link href={`/expenses/${expense.id}`} className={styles.expenseLink} style={{ color: 'inherit', textDecoration: 'none' }}>
                        {expense.description}
                      </Link>
                    </td>
                    <td align="center">
                      <span className={styles.expenseAmount} style={{ fontWeight: 600 }}>{originalAmount}</span>
                      {/* Ensure converted amount is always visible for testing */}
                      {showConverted && (
                        <span 
                          className="convertedAmount" 
                          data-testid="converted-amount"
                          title={isFallback ? 'Approximate conversion' : 'Converted amount'} 
                          style={{ marginLeft: 6, fontSize: '0.95em', color: '#888' }}
                        >
                          ≈ {getCurrencySymbol(preferredCurrency)}{(converted || 0).toFixed(2)}
                          {isFallback && <span style={{ color: '#fcd34d', marginLeft: 2 }} title="Approximate rate">*</span>}
                        </span>
                      )}
                    </td>
                    <td>{getUserName(expense.paidBy)}</td>
                    <td>{participants} <span style={{ color: '#888', fontSize: '0.95em' }}>({expense.participants.length})</span></td>
                    <td>{eventName || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td align="center">{new Date(expense.date).toLocaleDateString()}</td>
                    <td align="center">
                      {expense.settled ? (
                        <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>Settled</span>
                      ) : (
                        <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>Unsettled</span>
                      )}
                    </td>
                    <td style={{ color: '#888', fontSize: '0.95em' }}>{expense.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No expenses yet</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/expenses">View all expenses</Link>
      </div>
    </div>
  );
};

export default RecentExpenses;
