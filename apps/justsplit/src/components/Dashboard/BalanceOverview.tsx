import React, { useEffect, useState } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { calculateSettlementsWithConversion } from '../../utils/expenseCalculator';
import { convertCurrency } from '../../utils/currencyExchange';
import Link from 'next/link';
import HoverCard, { HoverCardPosition } from '../ui/HoverCard';
import { Expense, TimelineExpense, User, Event as TypesEvent } from '../../types'; // Renamed to TypesEvent for clarity
import BalanceLine from './BalanceLine';

interface UserBalance {
  id: string;
  name: string;
  balance: number;
}

interface HoverDataRelative {
  type: 'relative';
  user: User;
  sign: 'positive' | 'negative';
  amount: number;
  expenses: TimelineExpense[];
}

interface HoverDataGeneral {
  type: 'general';
  sign: 'owe' | 'owed';
  amount: number;
}

interface HoverDataUser {
  type: 'user';
  user: User;
  sign: 'owes' | 'is_owed';
  amount: number;
}

type HoverData = HoverDataRelative | HoverDataGeneral | HoverDataUser;

interface BalanceOverviewProps {
  balanceDistribution: Array<{userId: string, name: string, balance: number}>;
  preferredCurrency: string;
}

const BalanceOverview = ({ }: BalanceOverviewProps) => {
  const { state, preferredCurrency } = useAppContext();
  const { users, expenses, events } = state;
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [totalPositive, setTotalPositive] = useState(0);
  const [totalNegative, setTotalNegative] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverCardPosition, setHoverCardPosition] = useState<HoverCardPosition | null>(null);
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  const [hoverExpenses, setHoverExpenses] = useState<TimelineExpense[]>([]);
  const [relativeBalances, setRelativeBalances] = useState<{[key: string]: number}>({});
  const [relTotalPositive, setRelTotalPositive] = useState(0);
  const [relTotalNegative, setRelTotalNegative] = useState(0);
  const [relNetBalance, setRelNetBalance] = useState(0);
  const [maxRelativeBalance, setMaxRelativeBalance] = useState(1);
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  
  // Add this conversion function to map between the two Event types
  const convertContextEventsToTypesEvents = (contextEvents: typeof events): TypesEvent[] => {
    return contextEvents.map(event => ({
      id: event.id,
      name: event.name,
      description: event.description,
      date: event.startDate || '', // Use startDate as the required date field, fallback to empty string
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location, // Use location if available
      createdAt: event.createdAt || new Date().toISOString(), // Use event.createdAt if available
      updatedAt: event.updatedAt, // Optional
      createdBy: event.createdBy || (event.members?.[0] || ''), // Use createdBy or fallback to first member
      members: event.members || [], // Use members
      expenseIds: event.expenseIds || [], // Use expenseIds
      groupId: event.groupId // Optional
    }));
  };

  // Use this to get properly typed events when needed
  const typedEvents = convertContextEventsToTypesEvents(events);
  
  // Calculate balances based on expenses and settlements
  useEffect(() => {
    const calculateBalances = async () => {
      setIsLoading(true);
      try {
        // Get settlements based on unsettled expenses
        const settlements = await calculateSettlementsWithConversion(
          expenses, 
          users, 
          preferredCurrency
        );

        // Initialize user balances
        const balanceMap = new Map<string, number>();
        users.forEach(user => {
          balanceMap.set(user.id, 0);
        });

        // Apply settlements to calculate balances
        for (const settlement of settlements) {
          const amount = settlement.amount; // Amount is already in preferredCurrency

          // Update balances based on the settlement amount
          const fromUserBalance = balanceMap.get(settlement.fromUser) || 0;
          balanceMap.set(settlement.fromUser, fromUserBalance - amount);

          const toUserBalance = balanceMap.get(settlement.toUser) || 0;
          balanceMap.set(settlement.toUser, toUserBalance + amount);
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
      setIsLoading(false);
    }
  }, [users, expenses, preferredCurrency]); 
  
  // Format currency - use the correct currency symbol
  const formatCurrency = (amount: number) => {
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
  // REMOVE THE FOLLOWING OLD getUserExpenses FUNCTION
  /*
  const getUserExpenses = (user: UserBalance, sign: 'positive' | 'negative') => {
    if (sign === 'positive') {
      // User is owed money: show expenses they paid for
      return expenses.filter(exp => exp.paidBy === user.id && !exp.settled);
    } else {
      // User owes money: show expenses they participated in (but didn't pay)
      return expenses.filter(exp => exp.participants.includes(user.id) && exp.paidBy !== user.id && !exp.settled);
    }
  };
  */

  // Helper to get all positive or negative expenses for the general bar
  // REMOVE THE FOLLOWING OLD getGeneralExpenses FUNCTION
  /*
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
  */

  // Helper function to map Expense to TimelineExpense
  // This function assumes 'users' and 'events' (as LocalEvent[]) are available in its scope
  // You might need to pass them as arguments or access them from component state/props/context
  const mapExpenseToTimelineExpense = (
    expense: Expense, 
    allUsers: User[], // Pass all users
    allEvents: TypesEvent[] // Changed parameter type to TypesEvent[]
  ): TimelineExpense => {
    const paidByUser = allUsers.find(u => u.id === expense.paidBy);
    const participantUsers = expense.participants.map(pid => allUsers.find(u => u.id === pid)).filter(Boolean) as User[];
    
    const userNames: Record<string, string> = {};
    if (paidByUser) {
      userNames[paidByUser.id] = paidByUser.name;
    }
    participantUsers.forEach(pUser => {
      userNames[pUser.id] = pUser.name;
    });

    const event = expense.eventId ? allEvents.find(e => e.id === expense.eventId) : undefined;

    return {
      id: expense.id,
      type: 'expense', // Or determine dynamically if needed
      date: expense.date, // Keep as string
      title: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      category: expense.category || 'Uncategorized', // Use expense.category or a default
      eventName: event ? event.name : 'N/A',
      eventId: expense.eventId,
      settled: expense.settled,
      paidBy: expense.paidBy,
      participants: expense.participants,
      userNames: userNames,
    };
  };

  // --- Example modification for getGeneralExpenses ---
  // This is the NEW version to KEEP
  const getGeneralExpenses = (
    sign: 'owe' | 'owed', 
    expensesToFilter: Expense[], 
    allUsers: User[],
    allEvents: TypesEvent[] // Updated parameter type
  ): TimelineExpense[] => {
    // ... existing filtering logic ...
    
    // Replace this with your actual filtering logic
    const filteredExpenses: Expense[] = expensesToFilter.filter(exp => {
      // Placeholder for actual filtering logic based on 'sign'
      if (sign === 'owed') {
        const positiveUserIds = userBalances.filter(u => u.balance > 0).map(u => u.id);
        return positiveUserIds.includes(exp.paidBy) && !exp.settled;
      } else { // sign === 'owe' (negative for the group)
        const negativeUserIds = userBalances.filter(u => u.balance < 0).map(u => u.id);
        return exp.participants.some(pid => negativeUserIds.includes(pid)) && !exp.settled && !negativeUserIds.includes(exp.paidBy);
      }
    });

    return filteredExpenses.map(exp => mapExpenseToTimelineExpense(exp, allUsers, allEvents));
  };

  // --- Similarly, modify getUserExpenses and getRelativeExpenses ---
  // This is the NEW version to KEEP
  const getUserExpenses = (
    user: User,
    sign: 'owes' | 'is_owed',
    expensesToFilter: Expense[],
    allUsers: User[],
    allEvents: TypesEvent[] // Updated parameter type
  ): TimelineExpense[] => {
    // Placeholder for actual filtering logic based on 'sign' and 'user'
    // This logic should be based on the original getUserExpenses if it was correct
    const filteredExpenses: Expense[] = expensesToFilter.filter(exp => {
      if (sign === 'is_owed') { // User is owed money (positive balance contribution)
        return exp.paidBy === user.id && !exp.settled && exp.participants.some(p => p !== user.id);
      } else { // User owes money (negative balance contribution)
        return exp.participants.includes(user.id) && exp.paidBy !== user.id && !exp.settled;
      }
    });
    return filteredExpenses.map(exp => mapExpenseToTimelineExpense(exp, allUsers, allEvents));
  };

  // Helper to show hover card
  let hoverTimeout: NodeJS.Timeout | null = null;
  const handleBarHover = (event: React.MouseEvent, data: HoverData) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    let hoverExpenses: TimelineExpense[] = [];
    
    // Use the converted events instead of direct state.events
    if (data.type === 'general') {
      // Ensure data.sign matches 'owe' | 'owed'
      hoverExpenses = getGeneralExpenses(data.sign as ('owe' | 'owed'), expenses, users, typedEvents);
    } else if (data.type === 'user') {
      // Ensure data.user is of type User and data.sign matches 'owes' | 'is_owed'
      const targetUser = users.find(u => u.id === data.user.id); // data.user might be UserBalance, ensure it's User
      if (targetUser) {
        hoverExpenses = getUserExpenses(targetUser, data.sign as ('owes' | 'is_owed'), expenses, users, typedEvents);
      }
    } else if (data.type === 'relative') {
      // data.expenses are already TimelineExpense[]
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

  // Get current user from state instead of the first user in list
  const currentUser = state.currentUser;

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
          if (exp.currency !== preferredCurrency) {
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
  }, [currentUser, userBalances, expenses, preferredCurrency, users.length, isLoading]);

  // Get relevant users for the current user
  const getRelevantUsers = () => {
    if (!currentUser) return [];
    
    // Get all users that are either friends or involved in expenses/events with current user
    const relevantUserIds = new Set<string>();
    
    // Add friends of current user if available
    if (currentUser.friends && currentUser.friends.length > 0) {
      currentUser.friends.forEach(id => relevantUserIds.add(id));
    }
    
    // Add users from expenses where current user is a participant
    expenses.forEach(expense => {
      if (expense.participants.includes(currentUser.id)) {
        expense.participants.forEach(id => {
          if (id !== currentUser.id) {
            relevantUserIds.add(id);
          }
        });
      }
    });
    
    // Add users from events where current user is a participant
    events.forEach(event => {
      if (event.members.includes(currentUser.id)) {
        event.members.forEach(id => {
          if (id !== currentUser.id) {
            relevantUserIds.add(id);
          }
        });
      }
    });
    
    // Filter user balances to only include relevant users
    return userBalances.filter(user => 
      user.id === currentUser.id || relevantUserIds.has(user.id)
    );
  };

  // Get relative balance for a user (synchronous now that values are cached)
  const getRelativeBalance = (otherUser: UserBalance) => {
    return relativeBalances[otherUser.id] || 0;
  };

  // Use this cached value for relative max
  const getMaxRelativeBalance = () => {
    return maxRelativeBalance;
  };

  // Filter relevant users and optionally hide zero balances
  const filteredUsers = getRelevantUsers().filter(user => 
    !hideZeroBalances || getRelativeBalance(user) !== 0
  );

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
            <div className={styles.balanceSummary} style={{ 
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
              padding: '1.75rem',
              backgroundColor: '#fcfcfc',
              border: '1px solid #f3f4f6'
            }}>
              {/* Header */}
              <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.85rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#262626', fontWeight: '600' }}>Your Balance Summary</h3>
                <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>
                  Overview of your financial relationships with other users
                </p>
              </div>
              
              {/* You are owed row */}
              <div className={styles.balanceRow} style={{ padding: '0.85rem 0' }}>
                <div className={styles.balanceLabel} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#4CAF50', 
                    borderRadius: '50%',
                    marginRight: '10px',
                    boxShadow: '0 0 0 2px rgba(76, 175, 80, 0.2)'
                  }}></span>
                  <span style={{ fontWeight: '500', color: '#4a5568' }}>You are owed:</span>
                </div>
                <div className={styles.balanceValueGroup}>
                  <div className={styles.balanceBars}>
                    {relTotalPositive > 0 && (
                      <div 
                        className={styles.balanceBarPositive} 
                        style={{ 
                          width: `${Math.min(200, (relTotalPositive / getMaxBalance()) * 200)}px`,
                          height: '10px',
                          borderRadius: '5px',
                          background: 'linear-gradient(90deg, #4CAF50, #81C784)'
                        }}
                      ></div>
                    )}
                  </div>
                  <div className={`${styles.balanceAmount}`} style={{ 
                    fontSize: '1.15rem',
                    fontWeight: '600',
                    color: relTotalPositive > 0 ? '#4CAF50' : '#666'
                  }}>
                    {formatCurrency(relTotalPositive)}
                  </div>
                </div>
              </div>
              
              {/* You owe row */}
              <div className={styles.balanceRow} style={{ padding: '0.85rem 0' }}>
                <div className={styles.balanceLabel} style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    backgroundColor: '#F44336', 
                    borderRadius: '50%',
                    marginRight: '10px',
                    boxShadow: '0 0 0 2px rgba(244, 67, 54, 0.2)'
                  }}></span>
                  <span style={{ fontWeight: '500', color: '#4a5568' }}>You owe:</span>
                </div>
                <div className={styles.balanceValueGroup}>
                  <div className={styles.balanceBars}>
                    {relTotalNegative < 0 && (
                      <div 
                        className={styles.balanceBarNegative} 
                        style={{ 
                          width: `${Math.min(200, (Math.abs(relTotalNegative) / getMaxBalance()) * 200)}px`,
                          height: '10px',
                          borderRadius: '5px',
                          background: 'linear-gradient(90deg, #F44336, #E57373)'
                        }}
                      ></div>
                    )}
                  </div>
                  <div className={`${styles.balanceAmount}`} style={{ 
                    fontSize: '1.15rem',
                    fontWeight: '600',
                    color: relTotalNegative < 0 ? '#F44336' : '#666'
                  }}>
                    {formatCurrency(Math.abs(relTotalNegative))}
                  </div>
                </div>
              </div>
              
              {/* Net balance row */}
              <div className={styles.balanceDivider} style={{ margin: '0.85rem 0', backgroundColor: '#f0f0f0' }}></div>
              <div className={styles.balanceRow} style={{ 
                padding: '1.25rem',
                backgroundColor: relNetBalance > 0 ? 'rgba(76, 175, 80, 0.1)' : relNetBalance < 0 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(0, 0, 0, 0.03)',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: relNetBalance > 0 ? 'rgba(76, 175, 80, 0.2)' : relNetBalance < 0 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.05)'
              }}>
                <div className={styles.balanceLabel} style={{ 
                  fontWeight: '600', 
                  display: 'flex', 
                  alignItems: 'center' 
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: relNetBalance > 0 ? 'rgba(76, 175, 80, 0.2)' : relNetBalance < 0 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                    marginRight: '10px',
                    fontSize: '0.9rem'
                  }}>
                    {relNetBalance > 0 ? '↑' : relNetBalance < 0 ? '↓' : '='}
                  </span>
                  Net balance:
                </div>
                <div className={`${styles.balanceAmount} ${relNetBalance > 0 ? styles.positiveBalance : relNetBalance < 0 ? styles.negativeBalance : styles.zeroBalance}`} 
                  style={{ 
                    fontSize: '1.3rem',
                    fontWeight: '700'
                  }}>
                  {formatCurrency(relNetBalance)}
                </div>
              </div>
              
              {/* Settlement Button */}
              <div className={styles.actionButtonContainer} style={{ marginTop: '1.5rem' }}>
                <Link href="/settlements" passHref>
                  <button className={styles.settleButton} style={{ 
                    padding: '0.85rem',
                    backgroundColor: '#1a56db',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    width: '100%',
                    boxShadow: '0 2px 8px rgba(26, 86, 219, 0.25)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#1141a3';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#1a56db';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M2 12h20"/>
                    </svg>
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

      {/* Zero Balance Toggle */}
      <div style={{ 
        marginTop: '1rem', 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 18px',
        backgroundColor: '#f9fbff',
        borderRadius: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '1px solid #e6effd',
        transition: 'all 0.2s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ 
            marginRight: '14px', 
            color: '#3b82f6', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            backgroundColor: '#dbeafe',
            borderRadius: '50%',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'transform 0.3s ease'
          }} className={styles.infoIcon}>i</div>
          <span style={{ fontSize: '0.95rem', color: '#4b5563', lineHeight: '1.4' }}>
            Zero balances are relationships where you don&apos;t owe each other any money
          </span>
        </div>
        <label style={{ 
          display: 'flex', 
          alignItems: 'center', 
          cursor: 'pointer',
          backgroundColor: '#fff',
          padding: '8px 14px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          transition: 'all 0.15s ease',
          userSelect: 'none'
        }}
        className={styles.toggleLabel}
        onMouseOver={(e) => {
          e.currentTarget.style.borderColor = '#cbd5e0';
          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.borderColor = '#e2e8f0';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
        }}
        >
          <div 
            style={{ 
              position: 'relative',
              width: '42px',
              height: '22px',
              backgroundColor: hideZeroBalances ? '#d1d5db' : '#3b82f6',
              borderRadius: '11px',
              marginRight: '10px',
              transition: 'background-color 0.3s',
              border: '1px solid',
              borderColor: hideZeroBalances ? '#c1c5cd' : '#2563eb'
            }}
          >
            <div 
              style={{
                position: 'absolute',
                top: '1px',
                left: hideZeroBalances ? '2px' : 'calc(100% - 20px)',
                width: '18px',
                height: '18px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: 'left 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
              }}
            />
          </div>
          <input 
            type="checkbox" 
            checked={hideZeroBalances} 
            onChange={() => setHideZeroBalances(!hideZeroBalances)}
            style={{ display: 'none' }}
          />
          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: '#4b5563', transition: 'color 0.2s' }}>
            {hideZeroBalances ? 'Show zero balances' : 'Hide zero balances'}
          </span>
        </label>
      </div>

      {/* Relative Balance Line Plot */}
      <div style={{ 
        marginTop: '1rem', 
        marginBottom: '2rem',
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '20px 24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)',
        border: '1px solid #f3f4f6'
      }}>
        <h3 style={{ 
          marginBottom: '1.25rem', 
          color: '#262626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '15px',
          borderBottom: '1px solid #f0f0f0'
        }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '1.15rem',
            fontWeight: '600'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#edf2f7',
              color: '#4a5568',
              fontSize: '0.85rem'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
              </svg>
            </span>
            Relative Balances (You vs. Others)
          </span>
          <span style={{ 
            fontSize: '0.8rem', 
            color: '#4a5568', 
            fontWeight: 'normal',
            backgroundColor: '#f9fafb',
            padding: '6px 10px',
            borderRadius: '6px',
            border: '1px solid #edf2f7',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}>{filteredUsers.filter(user => currentUser && user.id !== currentUser.id).length}</span>
            relationships
          </span>
        </h3>
        
        {filteredUsers.length > 0 ? (
          <>
            <div style={{ 
              padding: '0 10px 14px 10px', 
              borderBottom: '1px solid #edf2f7', 
              fontSize: '0.9rem',
              color: '#64748b',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              fontWeight: '500'
            }}>
              <div style={{ flex: 1 }}>Person</div>
              <div style={{ width: '60%', textAlign: 'center' }}>Balance Direction</div>
              <div style={{ width: '80px', textAlign: 'right' }}>Amount</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredUsers.map(user => {
                if (currentUser && user.id === currentUser.id) return null;
                
                const rel = getRelativeBalance(user);
                const max = getMaxRelativeBalance();
                const relevantExpenses = currentUser ? expenses.filter(exp =>
                  !exp.settled &&
                  ((exp.paidBy === currentUser.id && exp.participants.includes(user.id)) ||
                  (exp.paidBy === user.id && exp.participants.includes(currentUser.id)))
                ).map(exp => mapExpenseToTimelineExpense(exp, users, typedEvents)) : [];
                
                return (
                  <BalanceLine
                    key={user.id}
                    label={user.name}
                    value={rel}
                    max={max}
                    color={rel > 0 ? '#4CAF50' : rel < 0 ? '#F44336' : '#bbb'}
                    direction={rel < 0 ? 'left' : 'right'}
                    onHover={e => handleBarHover(e, { 
                      type: 'relative', 
                      user, 
                      sign: rel < 0 ? 'negative' : 'positive', 
                      amount: rel, 
                      expenses: relevantExpenses 
                    })}
                    onLeave={handleBarLeave}
                    onClick={e => handleBarHover(e, { 
                      type: 'relative', 
                      user, 
                      sign: rel < 0 ? 'negative' : 'positive', 
                      amount: rel, 
                      expenses: relevantExpenses 
                    })}
                    barLabel={formatCurrency(rel)}
                  />
                );
              })}
            </div>
            <div style={{ 
              marginTop: '24px', 
              padding: '14px', 
              backgroundColor: '#f0f9ff', 
              borderRadius: '8px', 
              fontSize: '0.9rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              border: '1px solid #bae6fd'
            }}>
              <div style={{ 
                marginRight: '12px',
                backgroundColor: '#e0f2fe',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}>💡</div>
              <div>
                Click on any balance bar to view the individual expenses that make up this balance relationship.
              </div>
            </div>
          </>
        ) : (
          <div style={{ 
            padding: '30px 20px', 
            textAlign: 'center', 
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#edf2f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              color: '#a0aec0',
              marginBottom: '8px'
            }}>
              🤝
            </div>
            <p style={{ margin: '0', fontSize: '16px', fontWeight: '500', color: '#4a5568' }}>No balance relationships to display</p>
            {hideZeroBalances && (
              <div style={{ 
                fontSize: '0.9rem', 
                backgroundColor: '#ebf8ff', 
                color: '#2c5282',
                padding: '8px 16px',
                borderRadius: '6px',
                maxWidth: '80%',
                border: '1px solid #bee3f8'
              }}>
                Try toggling &quot;Show zero balances&quot; to see all connections
              </div>
            )}
          </div>
        )}
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
