'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '../../../components/ui/Button';
import { useRouter } from 'next/navigation';
import EditableText from '../../../components/ui/EditableText';
import CurrencySelector from '../../../components/ui/CurrencySelector';
import { 
  DEFAULT_CURRENCY, 
  formatCurrency, 
  convertCurrency, 
  clearExchangeRateCache 
} from '../../../utils/currencyExchange';

export default function GroupsList() {
  const { state, updateGroup } = useAppContext();
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [updatingGroups, setUpdatingGroups] = useState<Record<string, boolean>>({});
  
  // Add currency state and conversion states
  const [targetCurrency, setTargetCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, number>>({});
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Memoize the filtered groups to prevent unnecessary recalculations
  const filteredGroups = useMemo(() => 
    state.groups?.filter(group => 
      group.name.toLowerCase().includes(filter.toLowerCase())
    ) || [],
    [state.groups, filter]
  );

  // Calculate total expenses for each group - memoized
  const groupTotals = useMemo(() => {
    const totals: Record<string, { 
      amount: number, 
      currencyBreakdown: Record<string, number>,
      expenseCount: number,
      unsettledAmount: number, // Add unsettled tracking
      unsettledCurrencyBreakdown: Record<string, number>, // Add currency breakdown for unsettled
      unsettledCount: number // Add count of unsettled expenses
    }> = {};

    filteredGroups.forEach(group => {
      let totalAmount = 0;
      let unsettledAmount = 0;
      let unsettledCount = 0;
      const currencyBreakdown: Record<string, number> = {};
      const unsettledCurrencyBreakdown: Record<string, number> = {}; // Track unsettled by currency
      
      // Get all expenses for this group
      const groupExpenses = state.expenses.filter(expense => 
        group.expenseIds.includes(expense.id)
      );
      
      // Calculate total and breakdown by currency
      groupExpenses.forEach(expense => {
        totalAmount += expense.amount;
        currencyBreakdown[expense.currency] = (currencyBreakdown[expense.currency] || 0) + expense.amount;
        
        // Track unsettled expenses
        if (!expense.settled) {
          unsettledAmount += expense.amount;
          unsettledCurrencyBreakdown[expense.currency] = (unsettledCurrencyBreakdown[expense.currency] || 0) + expense.amount;
          unsettledCount++;
        }
      });
      
      totals[group.id] = {
        amount: totalAmount,
        currencyBreakdown,
        expenseCount: groupExpenses.length,
        unsettledAmount,
        unsettledCurrencyBreakdown,
        unsettledCount
      };
    });
    
    return totals;
  }, [filteredGroups, state.expenses]);
  
  // Make performConversion a useCallback to prevent recreation on every render
  const performConversion = useCallback(async () => {
    if (filteredGroups.length === 0) return;
    
    setIsConverting(true);
    const newConvertedAmounts: Record<string, number> = {};
    
    try {
      for (const group of filteredGroups) {
        // Get all expenses for this group
        const groupExpenses = state.expenses.filter(expense => 
          group.expenseIds.includes(expense.id)
        );
        
        let totalConverted = 0;
        let unsettledConverted = 0; // Add unsettled conversion
        
        // Convert each expense
        for (const expense of groupExpenses) {
          const isUnsettled = !expense.settled;
          
          if (expense.currency === targetCurrency) {
            totalConverted += expense.amount;
            if (isUnsettled) unsettledConverted += expense.amount;
          } else {
            try {
              const { convertedAmount } = await convertCurrency(
                expense.amount,
                expense.currency,
                targetCurrency
              );
              totalConverted += convertedAmount;
              if (isUnsettled) unsettledConverted += convertedAmount;
            } catch (error) {
              console.error('Error converting currency:', error);
              totalConverted += expense.amount;
              if (isUnsettled) unsettledConverted += expense.amount;
            }
          }
        }
        
        newConvertedAmounts[group.id] = totalConverted;
        newConvertedAmounts[`unsettled_${group.id}`] = unsettledConverted; // Store unsettled amount
      }
      
      setConvertedAmounts(newConvertedAmounts);
    } catch (error) {
      console.error('Error in currency conversion:', error);
    } finally {
      setIsConverting(false);
    }
  }, [filteredGroups, state.expenses, targetCurrency]);
  
  // Handle refreshing rates - also memoized with useCallback
  const handleRefreshRates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      clearExchangeRateCache();
      await performConversion();
    } catch (error) {
      console.error('Error refreshing rates:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [performConversion]);
  
  // Effect to handle currency conversion when dependencies change
  useEffect(() => {
    let isMounted = true;
    
    const runConversion = async () => {
      if (!isMounted) return;
      await performConversion();
    };
    
    runConversion();
    
    return () => {
      isMounted = false;
    };
  }, [performConversion]);

  const handleGroupNameUpdate = async (groupId: string, newName: string) => {
    setUpdatingGroups({ ...updatingGroups, [groupId]: true });
    
    // Find the group to update
    const groupToUpdate = state.groups.find(group => group.id === groupId);
    
    if (groupToUpdate) {
      try {
        // Update in database
        await updateGroup(groupId, { name: newName });
      } catch (error) {
        console.error('Error updating group name:', error);
        alert('Failed to update group name. Please try again.');
      } finally {
        // Clear updating status after a short delay to show feedback
        setTimeout(() => {
          setUpdatingGroups(prev => ({ ...prev, [groupId]: false }));
        }, 500);
      }
    }
  };

  const handleGroupDescriptionUpdate = async (groupId: string, newDescription: string) => {
    setUpdatingGroups({ ...updatingGroups, [groupId]: true });
    
    const groupToUpdate = state.groups.find(group => group.id === groupId);
    
    if (groupToUpdate) {
      try {
        await updateGroup(groupId, { description: newDescription });
      } catch (error) {
        console.error('Error updating group description:', error);
        alert('Failed to update group description. Please try again.');
      } finally {
        setTimeout(() => {
          setUpdatingGroups(prev => ({ ...prev, [groupId]: false }));
        }, 500);
      }
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Your Groups</h1>
      
      {(!state.groups || state.groups.length === 0) ? (
        <div className={styles.emptyState}>
          <p>You haven&apos;t created any groups yet.</p>
          <Button 
            variant="primary" 
            onClick={() => router.push('/groups/new')}
          >
            Create New Group
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.topActions}>
            <Button 
              variant="primary" 
              onClick={() => router.push('/groups/new')}
            >
              Create New Group
            </Button>
            
            <div className={styles.filterContainer}>
              <input
                type="text"
                placeholder="Filter groups..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={styles.filterInput}
              />
            </div>
            
            {/* Add CurrencySelector */}
            <div className={styles.currencySelector}>
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
            </div>
          </div>
          
          <div className={styles.groupsList}>
            {filteredGroups.map((group) => {
              const isUpdating = updatingGroups[group.id] || false;
              const groupTotal = groupTotals[group.id];
              const convertedAmount = convertedAmounts[group.id];
              const convertedUnsettledAmount = convertedAmounts[`unsettled_${group.id}`];
              const hasMultipleCurrencies = groupTotal && 
                Object.keys(groupTotal.currencyBreakdown).length > 1;
              
              // Calculate settlement percentage
              const settlementPercentage = groupTotal && groupTotal.expenseCount > 0 
                ? Math.round(((groupTotal.expenseCount - groupTotal.unsettledCount) / groupTotal.expenseCount) * 100)
                : 100;
              
              return (
                <div key={group.id} className={styles.groupCard}>
                  <EditableText 
                    as="h2"
                    value={group.name}
                    onSave={(newName) => handleGroupNameUpdate(group.id, newName)}
                    className={`${styles.groupName} ${isUpdating ? styles.updating : ''}`}
                    placeholder="Group Name"
                  />
                  
                  <EditableText 
                    as="p"
                    value={group.description || ''}
                    onSave={(newDescription) => handleGroupDescriptionUpdate(group.id, newDescription)}
                    className={`${styles.groupDescription} ${isUpdating ? styles.updating : ''}`}
                    placeholder="Click to add a description"
                  />
                  
                  {/* Enhanced financial information */}
                  {groupTotal && groupTotal.expenseCount > 0 && (
                    <div className={styles.financialSummary}>
                      <div className={styles.totalExpenses}>
                        <span className={styles.totalLabel}>Total Expenses:</span>
                        <span className={styles.totalValue}>
                          {isConverting ? (
                            <span className={styles.convertingText}>Converting...</span>
                          ) : (
                            <>
                              {formatCurrency(convertedAmount || 0, targetCurrency)}
                              {hasMultipleCurrencies && (
                                <span className={styles.originalAmounts}>
                                  (Original: {Object.entries(groupTotal.currencyBreakdown)
                                    .map(([currency, amount]) => 
                                      `${formatCurrency(amount, currency)}`
                                    ).join(', ')})
                                </span>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      
                      {/* Add unsettled amount display */}
                      {groupTotal.unsettledCount > 0 && (
                        <div className={styles.unsettledExpenses}>
                          <span className={styles.unsettledLabel}>Unsettled:</span>
                          <span className={styles.unsettledValue}>
                            {isConverting ? (
                              <span className={styles.convertingText}>Converting...</span>
                            ) : (
                              <>
                                {formatCurrency(convertedUnsettledAmount || 0, targetCurrency)}
                                {Object.keys(groupTotal.unsettledCurrencyBreakdown).length > 0 && (
                                  <span className={styles.originalAmounts}>
                                    (Original: {Object.entries(groupTotal.unsettledCurrencyBreakdown)
                                      .map(([currency, amount]) => 
                                        `${formatCurrency(amount, currency)}`
                                      ).join(', ')})
                                  </span>
                                )}
                              </>
                            )}
                          </span>
                        </div>
                      )}
                      
                      {/* Add settlement progress bar */}
                      <div className={styles.settlementProgress}>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ 
                              width: `${settlementPercentage}%`,
                              backgroundColor: settlementPercentage === 100 
                                ? 'var(--color-success)' 
                                : settlementPercentage > 50 
                                  ? 'var(--color-warning)' 
                                  : 'var(--color-danger)'
                            }}
                          ></div>
                        </div>
                        <div className={styles.progressLabel}>
                          {settlementPercentage}% settled
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className={styles.groupStats}>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>👥</span>
                      <span className={styles.statLabel}>Members:</span>
                      <span className={styles.statValue}>{group.members.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>📅</span>
                      <span className={styles.statLabel}>Events:</span>
                      <span className={styles.statValue}>{group.eventIds.length}</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statIcon}>💰</span>
                      <span className={styles.statLabel}>Expenses:</span>
                      <span className={styles.statValue}>
                        {groupTotal ? groupTotal.expenseCount : 0}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.createdInfo}>
                    <span className={styles.createdDate}>
                      Created: {new Date(group.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className={styles.actions}>
                    <Link href={`/groups/${group.id}`}>
                      <Button variant="secondary">View Details</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
