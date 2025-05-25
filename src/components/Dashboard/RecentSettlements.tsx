import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { formatCurrency, convertCurrency, getCurrencySymbol } from '../../utils/currencyExchange';
import { Settlement, User, Expense } from '../../types';

interface RecentSettlementsProps {
  settlements?: Settlement[];
  users?: User[];
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
  expenses?: Expense[];
}

const RecentSettlements: React.FC<RecentSettlementsProps> = ({ 
  settlements: propSettlements, 
  users: propUsers, 
  preferredCurrency: propPreferredCurrency, 
  isConvertingCurrencies: propIsConverting, 
  expenses: propExpenses 
}) => {
  const context = useAppContext();
  const state = context?.state;
  const preferredCurrency = propPreferredCurrency || context?.preferredCurrency || 'USD';
  const isConvertingCurrencies = propIsConverting !== undefined ? propIsConverting : context?.isConvertingCurrencies ?? true;
  const users = propUsers || state?.users || [];
  const expenses = propExpenses || state?.expenses || [];
  
  // State for converted amounts and fallback flags
  const [convertedAmounts, setConvertedAmounts] = useState<{[key: string]: number}>({});
  const [fallbacks, setFallbacks] = useState<{[key: string]: boolean}>({});
  
  // Helper function to get user name by ID
  const getUserName = (userId: string): string => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.name : 'Unknown User';
  };
  
  // Helper function to get expense description by ID
  const getExpenseDescription = (expenseId: string | undefined): string => {
    if (!expenseId) return 'Settlement';
    const expense = expenses.find((e: Expense) => e.id === expenseId);
    return expense ? expense.description : 'Settlement';
  };
  
  // Memoize recentSettlements and ensure its type is Settlement[]
  const recentSettlements: Settlement[] = useMemo(() => {
    const sourceOfSettlements = propSettlements || state?.settlements || [];
    const settlementsToProcess = sourceOfSettlements as Settlement[];
    
    return [...settlementsToProcess]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5); // Show top 5 recent settlements
  }, [propSettlements, state?.settlements]);

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
              {recentSettlements.map(settlement => {
                const originalAmount = formatCurrency(settlement.amount, settlement.currency);
                const converted = convertedAmounts[settlement.id];
                const isFallback = fallbacks[settlement.id];
                const showConverted = settlement.currency !== preferredCurrency && isConvertingCurrencies;
                
                // Handle both property naming conventions with proper typing
                interface SettlementWithUsers {
                  fromUser?: string;
                  paidBy?: string;
                  toUser?: string;
                  paidTo?: string;
                  status?: string;
                }
                
                const settlementWithUsers = settlement as Settlement & SettlementWithUsers;
                const payerUserId = settlementWithUsers.fromUser || settlementWithUsers.paidBy || '';
                const payeeUserId = settlementWithUsers.toUser || settlementWithUsers.paidTo || '';
                const payerName = getUserName(payerUserId);
                const payeeName = getUserName(payeeUserId);
                const expenseDescription = getExpenseDescription(settlement.expenseIds?.[0]);
                
                // Handle status display - show status if available, otherwise show notes or default
                const statusText = settlementWithUsers.status 
                  ? settlementWithUsers.status.charAt(0).toUpperCase() + settlementWithUsers.status.slice(1)
                  : settlement.notes || '—';

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
                    <td style={{ color: '#888', fontSize: '0.95em' }}>{statusText}</td>
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
