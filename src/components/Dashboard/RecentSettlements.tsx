import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, convertCurrency, getCurrencySymbol } from '../../utils/currencyExchange';
import { Settlement, User, Event as LocalEvent, Expense } from '../../types'; // Added Settlement, LocalEvent, Expense

interface RecentSettlementsProps {
  settlements?: Settlement[];
  users?: User[];
  events?: LocalEvent[]; // Use LocalEvent to match the converted event type
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
  expenses?: Expense[];
}

const RecentSettlements: React.FC<RecentSettlementsProps> = ({ 
  settlements: propSettlements, 
  users: propUsers, 
  events: propEvents, // propEvents should be LocalEvent[] from page.tsx
  preferredCurrency: propPreferredCurrency, 
  isConvertingCurrencies: propIsConverting, 
  expenses: propExpenses 
}) => {
  const context = useAppContext();
  const state = context?.state;
  const preferredCurrency = propPreferredCurrency || context?.preferredCurrency || 'USD';
  const isConvertingCurrencies = propIsConverting !== undefined ? propIsConverting : context?.isConvertingCurrencies ?? true;
  const users = propUsers || state?.users || [];
  const events = propEvents || []; // Simpler: rely on page.tsx to pass converted LocalEvent[]
  const expenses = propExpenses || state?.expenses || [];
  // sourceOfSettlements will be of type: OurSettlement[] | AppContextSettlement[]
  const sourceOfSettlements = propSettlements || state?.settlements || [];


  const [convertedAmounts, setConvertedAmounts] = useState<{[key: string]: number}>({});
  const [fallbacks, setFallbacks] = useState<{[key: string]: boolean}>({});

  // Helper: get user name
  const getUserName = (userId: string | undefined) => {
    if (!userId) return 'Unknown User'; // Handle undefined userId
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Helper: get event name (not directly used for settlements but good for consistency if needed)
  const getEventName = (eventId: string | undefined) => {
    if (!eventId) return '';
    const event = events.find(e => e.id === eventId);
    return event ? event.name : '';
  };
  
  // Helper: get expense description
  const getExpenseDescription = (expenseId: string | undefined) => {
    if (!expenseId) return 'N/A';
    const expense = expenses.find(exp => exp.id === expenseId);
    return expense ? expense.description : 'Unknown Expense';
  };

  // Memoize recentSettlements and ensure its type is Settlement[] (our local type)
  const recentSettlements: Settlement[] = useMemo(() => {
    // Cast the source array to Settlement[] (our local type).
    // This tells TypeScript to treat each item as our local Settlement type,
    // which defines payerId (optionally).
    // This assumes that AppContext.Settlement objects are structurally compatible
    // or that missing fields like payerId are correctly handled by their optionality.
    const settlementsToProcess = sourceOfSettlements as Settlement[];
    
    return [...settlementsToProcess]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Show top 5 recent settlements
  }, [sourceOfSettlements]); // Depend on the actual source array

  // Fetch converted amounts for settlements
  useEffect(() => {
    let isMounted = true;
    const fetchConversions = async () => {
      const conversions: {[key: string]: number} = {};
      const fallbackFlags: {[key: string]: boolean} = {};
      await Promise.all(
                recentSettlements.map(async (settlement) => {
                    if (settlement.currency === preferredCurrency || !isConvertingCurrencies) {
                        conversions[settlement.id] = settlement.amount;
                        fallbackFlags[settlement.id] = false;
                    } else {
                        try {
                            const { convertedAmount, isFallback } = await convertCurrency(
                                settlement.amount,
                                settlement.currency,
                                preferredCurrency
                            );
                            conversions[settlement.id] = convertedAmount;
                            fallbackFlags[settlement.id] = isFallback;
                        } catch {
                            conversions[settlement.id] = settlement.amount; // Fallback to original amount on error
                            fallbackFlags[settlement.id] = true;
                        }
                    }
                })
            );
      if (isMounted) {
        setConvertedAmounts(conversions);
        setFallbacks(fallbackFlags);
      }
    };
    fetchConversions();
    return () => { isMounted = false; };
  }, [recentSettlements, preferredCurrency, isConvertingCurrencies]);

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Settlements</h2>
      {recentSettlements.length > 0 ? (
        <table className={styles.settlementsTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #f1f1f1' }}>Description</th>
              <th style={{ width: 120, textAlign: 'center', padding: '12px 8px', borderBottom: '2px solid #f1f1f1' }}>Amount</th>
              <th style={{ width: 150, textAlign: 'left', padding: '12px 8px', borderBottom: '2px solid #f1f1f1' }}>From / To</th>
              <th style={{ width: 120, textAlign: 'center', padding: '12px 8px', borderBottom: '2px solid #f1f1f1' }}>Date</th>
              <th style={{ width: 100, textAlign: 'center', padding: '12px 8px', borderBottom: '2px solid #f1f1f1' }}>Status</th>
            </tr>
          </thead>
          <tbody>
              {recentSettlements.map(settlement => { // Now 'settlement' is typed as our local Settlement
                const originalAmount = formatCurrency(settlement.amount, settlement.currency);
                const converted = convertedAmounts[settlement.id];
                const isFallback = fallbacks[settlement.id];
                const showConverted = settlement.currency !== preferredCurrency && isConvertingCurrencies;
                const payerName = getUserName(settlement.fromUser);
                const payeeName = getUserName(settlement.toUser);
                const expenseDescription = getExpenseDescription(settlement.expenseIds?.[0]);

                return (
                  <tr key={settlement.id} className={styles.expenseItem} style={{ borderBottom: '1px solid #f1f1f1' }}>
                    <td>
                    <Link href={`/expenses/${settlement.expenseIds?.[0] || ''}`} className={styles.expenseLink} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {expenseDescription}
                    </Link>
                    </td>
                    <td align="center">
                      <span className={styles.expenseAmount} style={{ fontWeight: 600 }}>{originalAmount}</span>
                      {showConverted && (
                        <span 
                          className="convertedAmount" 
                          data-testid={`converted-amount-settlement-${settlement.id}`}
                          title={isFallback ? 'Approximate conversion' : 'Converted amount'} 
                          style={{ marginLeft: 6, fontSize: '0.95em', color: '#888' }}
                        >
                          ≈ {getCurrencySymbol(preferredCurrency)}{(converted || 0).toFixed(2)}
                          {isFallback && <span style={{ color: '#fcd34d', marginLeft: 2 }} title="Approximate rate">*</span>}
                        </span>
                      )}
                    </td>
                    <td>{payerName} to {payeeName}</td>
                    <td align="center">{new Date(settlement.date).toLocaleDateString()}</td>
                    <td style={{ color: '#888', fontSize: '0.95em' }}>{settlement.notes || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
        </table>
      ) : (
        <p>No settlements yet</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/settlements">View all settlements</Link>
      </div>
    </div>
  );
};

export default RecentSettlements;
