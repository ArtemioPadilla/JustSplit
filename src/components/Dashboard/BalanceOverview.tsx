import React, { useEffect, useState } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { calculateSettlementsWithConversion } from '../../utils/expenseCalculator';
import { convertCurrency, getCurrencySymbol } from '../../utils/currencyExchange';
import Link from 'next/link';
import HoverCard, { HoverCardPosition } from '../ui/HoverCard';
import { TimelineExpense } from '../../utils/timelineUtils';
import BalanceLine from './BalanceLine';

interface UserBalance {
  id: string;
  name: string;
  balance: number;
}

const BalanceOverview = ({ balanceDistribution, preferredCurrency: propCurrency }) => {
  const { state, preferredCurrency, isConvertingCurrencies, setPreferredCurrency, setIsConvertingCurrencies } = useAppContext();
  const { users, expenses, events } = state;
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [totalPositive, setTotalPositive] = useState(0);
  const [totalNegative, setTotalNegative] = useState(0);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverCardPosition, setHoverCardPosition] = useState<HoverCardPosition | null>(null);
  const [hoverData, setHoverData] = useState<any>(null);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const [hoverExpenses, setHoverExpenses] = useState<TimelineExpense[]>([]);
  const [relativeBalances, setRelativeBalances] = useState<{[key: string]: number}>({});
  const [relTotalPositive, setRelTotalPositive] = useState(0);
  const [relTotalNegative, setRelTotalNegative] = useState(0);
  const [relNetBalance, setRelNetBalance] = useState(0);
  const [maxRelativeBalance, setMaxRelativeBalance] = useState(1);
  
  // Calculate balances based on expenses and settlements
  useEffect(() => {
    const calculateBalances = async () => {
      setIsLoading(true);
      try {
        // Get settlements based on unsettled expenses
        const settlements = await calculateSettlementsWithConversion(
          expenses, 
          users, 
          preferredCurrency,
          isConvertingCurrencies
        );

        // Initialize user balances
        const balanceMap = new Map<string, number>();
        users.forEach(user => {
          balanceMap.set(user.id, 0);
        });

        // Apply settlements to calculate balances
        for (const settlement of settlements) {
          // If currency conversion is enabled, convert settlement amounts
          let amount = settlement.amount;
          if (isConvertingCurrencies && settlement.currency !== preferredCurrency) {
            try {
              const converted = await convertCurrency(amount, settlement.currency, preferredCurrency);
              amount = converted.convertedAmount;
            } catch (error) {
              console.error(`Failed to convert ${settlement.currency} to ${preferredCurrency}:`, error);
            }
          }
          
          // The user who receives money has a positive balance
          balanceMap.set(
            settlement.toUser, 
            (balanceMap.get(settlement.toUser) || 0) + amount
          );
          
          // The user who pays money has a negative balance
          balanceMap.set(
            settlement.fromUser, 
            (balanceMap.get(settlement.fromUser) || 0) - amount
          );
        }

        // Convert to array format with user names
        const calculatedBalances: UserBalance[] = users.map(user => ({
          id: user.id,
          name: user.name,
          balance: balanceMap.get(user.id) || 0,
        }));

        // Calculate total positive, negative and net balances
        let positive = 0;
        let negative = 0;

        calculatedBalances.forEach(user => {
          if (user.balance > 0) {
            positive += user.balance;
          } else if (user.balance < 0) {
            negative += user.balance;
          }
        });

        setUserBalances(calculatedBalances.sort((a, b) => b.balance - a.balance));
        setTotalPositive(positive);
        setTotalNegative(negative);
        setNetBalance(positive + negative);
      } catch (error) {
        console.error('Error calculating balances:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (users.length > 0) {
      calculateBalances();
    } else {
      setUserBalances([]);
      setTotalPositive(0);
      setTotalNegative(0);
      setNetBalance(0);
      setIsLoading(false);
    }
  }, [users, expenses, preferredCurrency, isConvertingCurrencies]); 
  
  // Format currency - use the correct currency symbol
  const formatCurrency = (amount: number) => {
    const currencySymbol = getCurrencySymbol(preferredCurrency);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: preferredCurrency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Get the maximum balance value for scaling
  const getMaxBalance = () => {
    return Math.max(
      ...userBalances.map(user => Math.abs(user.balance)), 
      Math.abs(totalNegative), 
      totalPositive,
      0.01 // Avoid division by zero
    );
  };

  // Helper to get expenses for a user (participant or payer)
  const getUserExpenses = (user: UserBalance, sign: 'positive' | 'negative') => {
    if (sign === 'positive') {
      // User is owed money: show expenses they paid for
      return expenses.filter(exp => exp.paidBy === user.id && !exp.settled);
    } else {
      // User owes money: show expenses they participated in (but didn't pay)
      return expenses.filter(exp => exp.participants.includes(user.id) && exp.paidBy !== user.id && !exp.settled);
    }
  };

  // Helper to get all positive or negative expenses for the general bar
  const getGeneralExpenses = (sign: 'positive' | 'negative') => {
    if (sign === 'positive') {
      // All expenses where payer is a user with positive balance
      const positiveUserIds = userBalances.filter(u => u.balance > 0).map(u => u.id);
      return expenses.filter(exp => positiveUserIds.includes(exp.paidBy) && !exp.settled);
    } else {
      // All expenses where participant is a user with negative balance
      const negativeUserIds = userBalances.filter(u => u.balance < 0).map(u => u.id);
      return expenses.filter(exp => exp.participants.some(pid => negativeUserIds.includes(pid)) && !exp.settled);
    }
  };

  // Helper to show hover card
  let hoverTimeout: NodeJS.Timeout | null = null;
  const handleBarHover = (event: React.MouseEvent, data: any) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let hoverExpenses: TimelineExpense[] = [];
    if (data.type === 'general') {
      hoverExpenses = getGeneralExpenses(data.sign);
    } else if (data.type === 'user') {
      hoverExpenses = getUserExpenses(data.user, data.sign);
    } else if (data.type === 'relative') {
      hoverExpenses = data.expenses || [];
    }
    setHoverCardPosition({
      x: targetRect.right + 10,
      y: targetRect.top + targetRect.height / 2,
      targetRect,
      preferredPlacement: 'side',
    });
    setHoverData(data);
    setShowHoverCard(true);
    setHoverExpenses(hoverExpenses);
  };

  const handleBarLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      if (!isHoveringCard) setShowHoverCard(false);
    }, 200);
  };

  const handleHoverCardClose = () => {
    setShowHoverCard(false);
  };

  // Get current user (first user in list)
  const currentUser = users.length > 0 ? users[0] : null;

  // Calculate relative balances
  useEffect(() => {
    const calculateRelativeBalances = async () => {
      if (!currentUser || userBalances.length === 0) return;
      
      const balances: {[key: string]: number} = {};
      let totalPositive = 0;
      let totalNegative = 0;
      let maxBalance = 0.01;
      
      // Process all expenses for each user
      for (const user of userBalances) {
        if (user.id === currentUser.id) continue;
        
        let balance = 0;
        // Process each unsettled expense
        for (const exp of expenses) {
          if (exp.settled) continue;
          
          const n = exp.participants.length;
          let amount = exp.amount;
          
          // Convert amount if needed and enabled
          if (isConvertingCurrencies && exp.currency !== preferredCurrency) {
            try {
              const result = await convertCurrency(amount, exp.currency, preferredCurrency);
              amount = result.convertedAmount;
            } catch (error) {
              console.error(`Failed to convert ${exp.currency} to ${preferredCurrency}:`, error);
            }
          }
          
          // Calculate share based on converted amount
          if (exp.paidBy === currentUser.id && exp.participants.includes(user.id)) {
            balance += amount / n;
          } else if (exp.paidBy === user.id && exp.participants.includes(currentUser.id)) {
            balance -= amount / n;
          }
        }
        
        // Store balance for this user
        balances[user.id] = balance;
        
        // Update totals and find max
        if (balance > 0) totalPositive += balance;
        if (balance < 0) totalNegative += balance;
        maxBalance = Math.max(maxBalance, Math.abs(balance));
      }
      
      // Update all state values
      setRelativeBalances(balances);
      setRelTotalPositive(totalPositive);
      setRelTotalNegative(totalNegative);
      setRelNetBalance(totalPositive + totalNegative);
      setMaxRelativeBalance(maxBalance);
    };

    if (users.length > 0 && !isLoading) {
      calculateRelativeBalances();
    }
  }, [currentUser, userBalances, expenses, preferredCurrency, isConvertingCurrencies, isLoading]);

  // Get relative balance for a user (synchronous now that values are cached)
  const getRelativeBalance = (otherUser: UserBalance) => {
    return relativeBalances[otherUser.id] || 0;
  };

  // Use this cached value for relative max
  const getMaxRelativeBalance = () => {
    return maxRelativeBalance;
  };

  // Get CSS class based on balance value (for backward compatibility with tests)
  const getBalanceClass = (balance: number) => {
    if (balance > 0) return styles.positiveBalance;
    if (balance < 0) return styles.negativeBalance;
    return styles.zeroBalance;
  };

  return (
    <div>
      <div className={styles.dashboardCard}>
        <h2 className={styles.cardTitle}>Balance Overview</h2>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p>Calculating balances...</p>
          </div>
        ) : users.length > 0 ? (
          <div className={styles.balanceContainer}>
            {/* Summary Section (relative to current user) */}
            <div className={styles.balanceSummary}>
              {/* You are owed row */}
              <div className={styles.balanceRow}>
                <div className={styles.balanceLabel}>You are owed:</div>
                <div className={styles.balanceValueGroup}>
                  <div className={styles.balanceBars}>
                    {relTotalPositive > 0 && (
                      <div 
                        className={styles.balanceBarPositive} 
                        style={{ 
                          width: `${Math.min(200, (relTotalPositive / getMaxBalance()) * 200)}px`,
                          height: '8px' 
                        }}
                      ></div>
                    )}
                  </div>
                  <div className={`${styles.balanceAmount}`}>
                    {formatCurrency(relTotalPositive)}
                  </div>
                </div>
              </div>
              {/* You owe row */}
              <div className={styles.balanceRow}>
                <div className={styles.balanceLabel}>You owe:</div>
                <div className={styles.balanceValueGroup}>
                  <div className={styles.balanceBars}>
                    {relTotalNegative < 0 && (
                      <div 
                        className={styles.balanceBarNegative} 
                        style={{ 
                          width: `${Math.min(200, (Math.abs(relTotalNegative) / getMaxBalance()) * 200)}px`,
                          height: '8px',
                        }}
                      ></div>
                    )}
                  </div>
                  <div className={`${styles.balanceAmount}`}>
                    {formatCurrency(Math.abs(relTotalNegative))}
                  </div>
                </div>
              </div>
              {/* Net balance row */}
              <div className={styles.balanceDivider}></div>
              <div className={styles.balanceRow}>
                <div className={styles.balanceLabel}>Net balance:</div>
                <div className={`${styles.balanceAmount} ${relNetBalance > 0 ? styles.positiveBalance : relNetBalance < 0 ? styles.negativeBalance : styles.zeroBalance}`}>
                  {formatCurrency(relNetBalance)}
                </div>
              </div>
              {/* Settlement Button */}
              <div className={styles.actionButtonContainer}>
                <Link href="/settlements" passHref>
                  <button className={styles.settleButton}>
                    Settle Balances
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <p>No balance data available</p>
        )}
      </div>

      {/* Relative Balance Line Plot */}
      <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Relative Balances (You vs. Others)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {userBalances.filter(u => currentUser && u.id !== currentUser.id).map(user => {
            const rel = getRelativeBalance(user);
            const max = getMaxRelativeBalance();
            const relevantExpenses = expenses.filter(exp =>
              !exp.settled &&
              ((exp.paidBy === currentUser.id && exp.participants.includes(user.id)) ||
               (exp.paidBy === user.id && exp.participants.includes(currentUser.id)))
            );
            return (
              <BalanceLine
                key={user.id}
                label={user.name}
                value={rel}
                max={max}
                color={rel > 0 ? '#4CAF50' : rel < 0 ? '#F44336' : '#bbb'}
                direction={rel < 0 ? 'left' : 'right'}
                onHover={e => handleBarHover(e, { type: 'relative', user, sign: rel < 0 ? 'negative' : 'positive', amount: rel, expenses: relevantExpenses })}
                onLeave={handleBarLeave}
                onClick={e => handleBarHover(e, { type: 'relative', user, sign: rel < 0 ? 'negative' : 'positive', amount: rel, expenses: relevantExpenses })}
                barLabel={formatCurrency(rel)}
              />
            );
          })}
        </div>
      </div>
      {/* End Relative Balance Line Plot */}
      {/* Individual Balances Section with aligned waterfall bars */}
      <div className={styles.userBalancesHeader}>
        <h3>Individual Balances</h3>
      </div>
      <div className={styles.userBalances}>
        {/* Add special divs with classes for test compatibility */}
        {userBalances.map(user => {
          const absBalance = Math.abs(user.balance);
          return (
            <div key={user.id} className={styles.userBalance}>
              <div className={styles.userName}>{user.name}</div>
              <div className={getBalanceClass(user.balance)}>
                {user.balance >= 0 ? formatCurrency(user.balance) : formatCurrency(user.balance)}
              </div>
              {/* Actual visual balance line */}
              <BalanceLine
                key={`balance-${user.id}`}
                label=""
                value={user.balance}
                max={Math.max(Math.abs(totalNegative), totalPositive)}
                color={user.balance > 0 ? '#4CAF50' : user.balance < 0 ? '#F44336' : '#bbb'}
                direction={user.balance < 0 ? 'left' : 'right'}
                onHover={e => handleBarHover(e, { type: 'user', user, sign: user.balance < 0 ? 'negative' : 'positive', amount: absBalance })}
                onLeave={handleBarLeave}
                onClick={e => handleBarHover(e, { type: 'user', user, sign: user.balance < 0 ? 'negative' : 'positive', amount: absBalance })}
                barLabel=""
              />
            </div>
          );
        })}
      </div>
      
      {showHoverCard && hoverCardPosition && hoverData && (
        <HoverCard
          position={hoverCardPosition}
          expenses={hoverData.type === 'relative' ? hoverData.expenses : hoverExpenses}
          onClose={handleHoverCardClose}
          onMouseEnter={() => setIsHoveringCard(true)}
          onMouseLeave={() => setIsHoveringCard(false)}
        />
      )}
    </div>
  );
};

export default BalanceOverview;
