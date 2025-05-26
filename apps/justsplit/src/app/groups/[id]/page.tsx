'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppContext } from '../../../context/AppContext';
import EditableText from '../../../components/ui/EditableText';
import Button from '../../../components/ui/Button';
import CurrencySelector from '../../../components/ui/CurrencySelector';
import { 
  DEFAULT_CURRENCY, 
  formatCurrency, 
  convertCurrency, 
  clearExchangeRateCache 
} from '../../../utils/currencyExchange';
import styles from './page.module.css';

export default function GroupDetail() {
  const router = useRouter();
  const params = useParams();
  const { state, updateGroup, deleteGroup, addEventToGroup, addExpenseToGroup, addMemberToGroup } = useAppContext();
  const groupId = params?.id ? (params.id as string) : '';
  
  // All hooks must be called unconditionally at the top
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('members');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Find the group - do this before any conditional rendering
  const group = state.groups.find(g => g.id === groupId);

  // Define derived variables unconditionally - they might be empty arrays if group is not found
  const members = useMemo(() => 
    group ? state.users.filter(user => group.members.includes(user.id)) : []
  , [group, state.users]);
  
  const expenses = useMemo(() => 
    group ? state.expenses.filter(expense => group.expenseIds.includes(expense.id)) : []
  , [group, state.expenses]);
  
  const events = group ? state.events.filter(event => group.eventIds.includes(event.id)) : [];
  const availableEvents = group ? state.events.filter(event => !group.eventIds.includes(event.id)) : [];
  const availableExpenses = group ? state.expenses.filter(expense => !group.expenseIds.includes(expense.id)) : [];
  const availableUsers = group ? state.users.filter(user => !group.members.includes(user.id)) : [];

  // Use ref to track initial mount and prevent useEffect from running twice
  const isInitialMount = useRef(true);
  
  // Use refs to save the previous dependency values for comparison
  const prevExpensesRef = useRef<typeof expenses>([]);
  const prevTargetCurrencyRef = useRef(targetCurrency);
  const prevGroupRef = useRef(group);
  
  // Define financialSummary with useMemo - will be an empty object if group not found
  const financialSummary = useMemo(() => {
    // Don't process if no group or empty expenses
    if (!group || expenses.length === 0) {
      return {
        byCurrency: {},
        unsettledByCurrency: {},
        byMember: {},
        totalExpenses: 0,
        settledCount: 0,
        settledPercentage: 0,
        totalExpenseAmount: 0,
        totalUnsettledAmount: 0,
        monetarySettlementPercentage: 0,
      };
    }
    
    // Track totals by currency
    const byCurrency: Record<string, number> = {};
    const unsettledByCurrency: Record<string, number> = {};
    const byMember: Record<string, { 
      paid: number, 
      share: number,
      balance: number, 
      byCurrency: Record<string, { paid: number, share: number, balance: number }>
    }> = {};
    let settledCount = 0;
    let totalExpenseAmount = 0;
    let totalUnsettledAmount = 0;
    
    // Initialize member balances
    members.forEach(member => {
      byMember[member.id] = { 
        paid: 0, 
        share: 0, 
        balance: 0, 
        byCurrency: {}
      };
    });
    
    // Process all expenses
    expenses.forEach(expense => {
      // Add to currency totals
      byCurrency[expense.currency] = (byCurrency[expense.currency] || 0) + expense.amount;
      totalExpenseAmount += expense.amount;
      
      // Track unsettled expenses
      if (!expense.settled) {
        unsettledByCurrency[expense.currency] = (unsettledByCurrency[expense.currency] || 0) + expense.amount;
        totalUnsettledAmount += expense.amount;
      } else {
        // Track settled expenses
        settledCount++;
      }
      
      // Calculate individual amounts
      const paidBy = expense.paidBy;
      const participants = expense.participants || [];
      const sharePerPerson = expense.amount / participants.length;
      
      // Update payer's amounts
      if (byMember[paidBy]) {
        byMember[paidBy].paid += expense.amount;
        if (!byMember[paidBy].byCurrency[expense.currency]) {
          byMember[paidBy].byCurrency[expense.currency] = { paid: 0, share: 0, balance: 0 };
        }
        byMember[paidBy].byCurrency[expense.currency].paid += expense.amount;
      }
      
      // Update each participant's share
      participants.forEach(participantId => {
        if (byMember[participantId]) {
          byMember[participantId].share += sharePerPerson;
          
          if (!byMember[participantId].byCurrency[expense.currency]) {
            byMember[participantId].byCurrency[expense.currency] = { paid: 0, share: 0, balance: 0 };
          }
          byMember[participantId].byCurrency[expense.currency].share += sharePerPerson;
        }
      });
    });
    
    // Calculate balance for each member and currency
    Object.entries(byMember).forEach(([memberId, data]) => {
      // Calculate overall balance
      byMember[memberId].balance = data.paid - data.share;
      
      // Calculate balance by currency
      Object.keys(data.byCurrency).forEach(currency => {
        const currencyData = data.byCurrency[currency];
        currencyData.balance = currencyData.paid - currencyData.share;
      });
    });
    
    // Calculate settlement percentage
    const settledPercentage = expenses.length > 0 
      ? Math.round((settledCount / expenses.length) * 100) 
      : 0;
    
    // Calculate monetary settlement percentage
    const monetarySettlementPercentage = totalExpenseAmount > 0
      ? Math.round(((totalExpenseAmount - totalUnsettledAmount) / totalExpenseAmount) * 100)
      : 0;
    
    return {
      byCurrency,
      unsettledByCurrency, 
      byMember,
      totalExpenses: expenses.length,
      settledCount,
      settledPercentage,
      totalExpenseAmount,
      totalUnsettledAmount,
      monetarySettlementPercentage,
    };
  }, [expenses, members, group]);
  
  // Convert performConversion to useCallback with graceful handling of missing group
  const performConversion = useCallback(async () => {
    if (!group || expenses.length === 0) return;
    
    // Extract only what we need from financialSummary to avoid circular dependencies
    const byCurrency = financialSummary.byCurrency;
    const unsettledByCurrency = financialSummary.unsettledByCurrency;
    
    setIsConverting(true);
    const newConvertedAmounts: Record<string, number> = {};
    
    try {
      // Convert expense amounts
      for (const expense of expenses) {
        if (expense.currency === targetCurrency) {
          newConvertedAmounts[expense.id] = expense.amount;
        } else {
          try {
            const { convertedAmount } = await convertCurrency(
              expense.amount,
              expense.currency,
              targetCurrency
            );
            newConvertedAmounts[expense.id] = convertedAmount;
          } catch (error) {
            console.error(`Error converting expense ${expense.id}:`, error);
            newConvertedAmounts[expense.id] = expense.amount;
          }
        }
      }
      
      // Add converted totals for each currency
      for (const [currency, amount] of Object.entries(byCurrency)) {
        if (currency === targetCurrency) {
          newConvertedAmounts[`total_${currency}`] = amount;
        } else {
          try {
            const { convertedAmount } = await convertCurrency(
              amount,
              currency,
              targetCurrency
            );
            newConvertedAmounts[`total_${currency}`] = convertedAmount;
          } catch (error) {
            console.error(`Error converting total for ${currency}:`, error);
            newConvertedAmounts[`total_${currency}`] = amount;
          }
        }
      }
      
      // Add converted totals for each unsettled currency
      for (const [currency, amount] of Object.entries(unsettledByCurrency)) {
        if (currency === targetCurrency) {
          newConvertedAmounts[`unsettled_${currency}`] = amount;
        } else {
          try {
            const { convertedAmount } = await convertCurrency(
              amount,
              currency,
              targetCurrency
            );
            newConvertedAmounts[`unsettled_${currency}`] = convertedAmount;
          } catch (error) {
            console.error(`Error converting unsettled total for ${currency}:`, error);
            newConvertedAmounts[`unsettled_${currency}`] = amount;
          }
        }
      }
      
      // Set converted amounts
      setConvertedAmounts(newConvertedAmounts);
    } catch (error) {
      console.error('Error in currency conversion:', error);
    } finally {
      setIsConverting(false);
    }
  }, [expenses, targetCurrency, group, financialSummary.byCurrency, financialSummary.unsettledByCurrency]);
  
  // Handle refreshing rates
  const handleRefreshRates = useCallback(async () => {
    if (!group) return;
    
    setIsRefreshing(true);
    try {
      clearExchangeRateCache();
      await performConversion();
    } catch (error) {
      console.error('Error refreshing rates:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [group, performConversion]);
  
  // useEffect for currency conversion - prevent infinite updates
  useEffect(() => {
    let isMounted = true;
    
    // Skip the effect if initial mount or if no significant dependencies changed
    if (
      isInitialMount.current ||
      (!group && !prevGroupRef.current) ||
      (
        expenses.length === prevExpensesRef.current.length && 
        targetCurrency === prevTargetCurrencyRef.current &&
        group === prevGroupRef.current
      )
    ) {
      // Update refs for future comparisons
      isInitialMount.current = false;
      prevExpensesRef.current = expenses;
      prevTargetCurrencyRef.current = targetCurrency;
      prevGroupRef.current = group;
      return;
    }
    
    const runConversion = async () => {
      if (!isMounted || !group) return;
      await performConversion();
    };
    
    runConversion();
    
    // Update refs for future comparisons
    prevExpensesRef.current = expenses;
    prevTargetCurrencyRef.current = targetCurrency;
    prevGroupRef.current = group;
    
    return () => {
      isMounted = false;
    };
  }, [group, expenses, targetCurrency, performConversion]);
  
  // Now do the conditional rendering AFTER all hooks have been called
  if (!group) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Group Not Found</h1>
        <p>The group you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        <Link href="/groups/list" className={styles.backButton}>
          Return to Groups List
        </Link>
      </div>
    );
  }
  
  // Regular function definitions (not hooks) go here
  const getTotalInTargetCurrency = () => {
    if (isConverting) return null;
    
    if (Object.keys(financialSummary.byCurrency).length === 0) {
      return formatCurrency(0, targetCurrency);
    }
    
    if (Object.keys(financialSummary.byCurrency).length === 1 && 
        Object.keys(financialSummary.byCurrency)[0] === targetCurrency) {
      // No conversion needed
      return formatCurrency(
        Object.values(financialSummary.byCurrency)[0], 
        targetCurrency
      );
    }
    
    // Sum up converted totals
    let total = 0;
    Object.entries(financialSummary.byCurrency).forEach(([currency, amount]) => {
      const convertedKey = `total_${currency}`;
      if (convertedAmounts[convertedKey]) {
        total += convertedAmounts[convertedKey];
      } else {
        total += amount; // Fallback to original if conversion not available
      }
    });
    
    return formatCurrency(total, targetCurrency);
  };
  
  // Get total unsettled expenses in target currency
  const getUnsettledInTargetCurrency = () => {
    if (isConverting) return null;
    
    if (Object.keys(financialSummary.unsettledByCurrency).length === 0) {
      return formatCurrency(0, targetCurrency);
    }
    
    if (Object.keys(financialSummary.unsettledByCurrency).length === 1 && 
        Object.keys(financialSummary.unsettledByCurrency)[0] === targetCurrency) {
      // No conversion needed
      return formatCurrency(
        Object.values(financialSummary.unsettledByCurrency)[0], 
        targetCurrency
      );
    }
    
    // Sum up converted totals
    let total = 0;
    Object.entries(financialSummary.unsettledByCurrency).forEach(([currency, amount]) => {
      const convertedKey = `unsettled_${currency}`;
      if (convertedAmounts[convertedKey]) {
        total += convertedAmounts[convertedKey];
      } else {
        total += amount; // Fallback to original if conversion not available
      }
    });
    
    return formatCurrency(total, targetCurrency);
  };
  
  const handleGroupNameUpdate = async (newName: string) => {
    setIsUpdating(true);
    
    try {
      const updatedGroup = { name: newName };
      updateGroup(groupId, updatedGroup);
    } catch (error) {
      console.error('Error updating group name:', error);
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  };
  
  const handleGroupDescriptionUpdate = async (newDescription: string) => {
    setIsUpdating(true);
    
    try {
      const updatedGroup = { description: newDescription };
      updateGroup(groupId, updatedGroup);
    } catch (error) {
      console.error('Error updating group description:', error);
    } finally {
      setTimeout(() => {
        setIsUpdating(false);
      }, 500);
    }
  };
  
  const handleDeleteGroup = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    
    deleteGroup(groupId);
    router.push('/groups/list');
  };
  
  const handleAddEvent = (eventId: string) => {
    addEventToGroup(groupId, eventId);
  };
  
  const handleAddExpense = (expenseId: string) => {
    addExpenseToGroup(groupId, expenseId);
  };
  
  const handleAddMember = (userId: string) => {
    addMemberToGroup(groupId, userId);
  };
  
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <EditableText
          as="h1"
          value={group.name}
          onSave={handleGroupNameUpdate}
          className={`${styles.title} ${isUpdating ? styles.updating : ''}`}
        />
        <div className={styles.headerActions}>
          {/* Add CurrencySelector */}
          <CurrencySelector
            value={targetCurrency}
            onChange={setTargetCurrency}
            showRefreshButton={true}
            onRefresh={handleRefreshRates}
            isRefreshing={isRefreshing}
            disabled={isConverting}
            compact={true}
            label="Display Currency:"
          />
          <Link href="/groups/list" className={styles.backButton}>
            Back to Groups
          </Link>
        </div>
      </div>
      
      <div className={styles.description}>
        <EditableText
          as="p"
          value={group.description || 'No description provided. Click to add one.'}
          onSave={handleGroupDescriptionUpdate}
          className={`${styles.descriptionText} ${isUpdating ? styles.updating : ''}`}
          placeholder="Click to add a description"
        />
      </div>
      
      {/* Add financial summary section */}
      {expenses.length > 0 && (
        <div className={styles.financialSummary}>
          <h2 className={styles.sectionTitle}>Financial Summary</h2>
          
          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>💰</div>
              <div className={styles.cardTitle}>Total Expenses</div>
              <div className={styles.cardValue}>
                {isConverting ? (
                  <span className={styles.converting}>Converting...</span>
                ) : (
                  getTotalInTargetCurrency()
                )}
              </div>
              {Object.entries(financialSummary.byCurrency).length > 0 && !isConverting && (
                <div className={styles.cardBreakdown}>
                  {Object.entries(financialSummary.byCurrency).map(([currency, amount]) => (
                    <div key={currency} className={styles.breakdownItem}>
                      <span>{formatCurrency(amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Add unsettled expenses card */}
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>⚠️</div>
              <div className={styles.cardTitle}>Unsettled Expenses</div>
              <div className={styles.cardValue}>
                {isConverting ? (
                  <span className={styles.converting}>Converting...</span>
                ) : (
                  getUnsettledInTargetCurrency()
                )}
              </div>
              {Object.entries(financialSummary.unsettledByCurrency).length > 0 && !isConverting && (
                <div className={styles.cardBreakdown}>
                  {Object.entries(financialSummary.unsettledByCurrency).map(([currency, amount]) => (
                    <div key={currency} className={styles.breakdownItem}>
                      <span>{formatCurrency(amount, currency)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className={styles.summaryCard}>
              <div className={styles.cardIcon}>📊</div>
              <div className={styles.cardTitle}>Settlement Progress</div>
              <div className={styles.cardValue}>
                {financialSummary.settledPercentage}%
              </div>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${financialSummary.settledPercentage}%` }}
                ></div>
              </div>
              <div className={styles.cardDetail}>
                {financialSummary.settledCount} of {financialSummary.totalExpenses} expenses settled
              </div>
              
              {/* Add monetary settlement percentage */}
              <div className={styles.cardSubdetail}>
                <span className={styles.cardSubtitle}>Amount settled:</span>
                <span className={styles.cardSubvalue}>{financialSummary.monetarySettlementPercentage}%</span>
                <div className={styles.miniProgressBar}>
                  <div 
                    className={styles.miniProgressFill}
                    style={{ width: `${financialSummary.monetarySettlementPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'members' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({members.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'events' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Events ({events.length})
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'expenses' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses ({expenses.length})
        </button>
        {expenses.length > 0 && (
          <button
            className={`${styles.tabButton} ${activeTab === 'balances' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('balances')}
          >
            Balances
          </button>
        )}
      </div>
      
      <div className={styles.tabContent}>
        {activeTab === 'members' && (
          <div className={styles.membersTab}>
            <h2 className={styles.sectionTitle}>Members</h2>
            
            {members.length > 0 ? (
              <ul className={styles.membersList}>
                {members.map(member => (
                  <li key={member.id} className={styles.memberItem}>
                    <div className={styles.memberInfo}>
                      <span className={styles.memberName}>{member.name}</span>
                      {financialSummary.byMember[member.id] && 
                        financialSummary.byMember[member.id].balance !== 0 && (
                        <span className={`${styles.memberBalance} ${
                          financialSummary.byMember[member.id].balance > 0 
                            ? styles.positive 
                            : styles.negative
                        }`}>
                          {financialSummary.byMember[member.id].balance > 0 
                            ? 'receives ' 
                            : 'owes '}
                          {Object.entries(financialSummary.byMember[member.id].byCurrency).map(
                            ([currency, data], index, arr) => (
                              <span key={currency}>
                                {formatCurrency(Math.abs(data.balance), currency)}
                                {index < arr.length - 1 ? ', ' : ''}
                              </span>
                            )
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No members in this group yet.</p>
            )}
            
            {availableUsers.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Members</h3>
                <div className={styles.addList}>
                  {availableUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleAddMember(user.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {user.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'events' && (
          <div className={styles.eventsTab}>
            <h2 className={styles.sectionTitle}>Events</h2>
            
            {events.length > 0 ? (
              <ul className={styles.eventsList}>
                {events.map(event => (
                  <li key={event.id} className={styles.eventItem}>
                    <div className={styles.eventInfo}>
                      <span className={styles.eventName}>{event.name}</span>
                      {event.startDate && (
                        <span className={styles.eventDate}>
                          {new Date(event.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <Link href={`/events/${event.id}`} className={styles.viewButton}>
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No events in this group yet.</p>
            )}
            
            {availableEvents.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Events</h3>
                <div className={styles.addList}>
                  {availableEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => handleAddEvent(event.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {event.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'expenses' && (
          <div className={styles.expensesTab}>
            <h2 className={styles.sectionTitle}>Expenses</h2>
            
            {expenses.length > 0 ? (
              <ul className={styles.expensesList}>
                {expenses.map(expense => {
                  const convertedAmount = convertedAmounts[expense.id];
                  const needsConversion = expense.currency !== targetCurrency;
                  
                  return (
                    <li key={expense.id} className={styles.expenseItem}>
                      <div className={styles.expenseInfo}>
                        <span className={styles.expenseName}>{expense.description}</span>
                        <span className={styles.expenseAmount}>
                          {isConverting ? (
                            <span className={styles.converting}>Converting...</span>
                          ) : needsConversion && convertedAmount ? (
                            <>
                              {formatCurrency(convertedAmount, targetCurrency)}
                              <span className={styles.originalAmount}>
                                (Original: {formatCurrency(expense.amount, expense.currency)})
                              </span>
                            </>
                          ) : (
                            formatCurrency(expense.amount, expense.currency)
                          )}
                        </span>
                      </div>
                      <div className={styles.expenseDetails}>
                        <span className={styles.expensePayer}>
                          Paid by: {members.find(m => m.id === expense.paidBy)?.name || 'Unknown'}
                        </span>
                        <span className={styles.expenseDate}>
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                        <span className={`${styles.expenseStatus} ${
                          expense.settled ? styles.settled : styles.unsettled
                        }`}>
                          {expense.settled ? 'Settled' : 'Unsettled'}
                        </span>
                      </div>
                      <Link href={`/expenses/${expense.id}`} className={styles.viewButton}>
                        View
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.emptyMessage}>No expenses in this group yet.</p>
            )}
            
            {availableExpenses.length > 0 && (
              <div className={styles.addSection}>
                <h3 className={styles.addSectionTitle}>Add Expenses</h3>
                <div className={styles.addList}>
                  {availableExpenses.map(expense => (
                    <button
                      key={expense.id}
                      onClick={() => handleAddExpense(expense.id)}
                      className={styles.addButton}
                    >
                      <span className={styles.addIcon}>+</span> {expense.description} ({expense.amount} {expense.currency})
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className={styles.createNewExpenseContainer}>
              <Link href={`/expenses/new?group=${groupId}`}>
                <Button variant="primary">Create New Expense</Button>
              </Link>
            </div>
          </div>
        )}
        
        {activeTab === 'balances' && (
          <div className={styles.balancesTab}>
            <h2 className={styles.sectionTitle}>Member Balances</h2>
            
            {members.length > 0 ? (
              <div className={styles.balancesTable}>
                <table className={styles.balanceTable}>
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Paid</th>
                      <th>Share</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(member => {
                      const memberData = financialSummary.byMember[member.id] || {
                        paid: 0, share: 0, balance: 0, byCurrency: {}
                      };
                      
                      return (
                        <tr key={member.id}>
                          <td>{member.name}</td>
                          <td className={styles.amountCell}>
                            {Object.entries(memberData.byCurrency).map(([currency, data], idx, arr) => (
                              <div key={currency}>
                                {formatCurrency(data.paid, currency)}
                                {idx < arr.length - 1 ? ', ' : ''}
                              </div>
                            ))}
                          </td>
                          <td className={styles.amountCell}>
                            {Object.entries(memberData.byCurrency).map(([currency, data], idx, arr) => (
                              <div key={currency}>
                                {formatCurrency(data.share, currency)}
                                {idx < arr.length - 1 ? ', ' : ''}
                              </div>
                            ))}
                          </td>
                          <td className={`${styles.amountCell} ${
                            memberData.balance > 0 
                              ? styles.positive 
                              : memberData.balance < 0 
                                ? styles.negative 
                                : ''
                          }`}>
                            {Object.entries(memberData.byCurrency).map(([currency, data], idx, arr) => (
                              <div key={currency}>
                                {formatCurrency(data.balance, currency)}
                                {idx < arr.length - 1 ? ', ' : ''}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.emptyMessage}>No members in this group yet.</p>
            )}
            
            {/* Add a settlements section */}
            {expenses.length > 0 && (
              <div className={styles.settlementActions}>
                <h3>Settle Group Expenses</h3>
                <Link href={`/settlements?group=${groupId}`}>
                  <Button variant="primary">View Settlement Options</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.dangerZone}>
        <h2 className={styles.dangerZoneTitle}>Danger Zone</h2>
        <div className={styles.dangerZoneContent}>
          <p>Deleting this group will not delete its members, events, or expenses.</p>
          <button
            onClick={handleDeleteGroup}
            className={styles.deleteButton}
          >
            {isConfirmingDelete ? 'Confirm Delete' : 'Delete Group'}
          </button>
          {isConfirmingDelete && (
            <button
              onClick={() => setIsConfirmingDelete(false)}
              className={styles.cancelButton}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
