import React, { useEffect, useState } from 'react';
import styles from './FinancialSummary.module.css';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../utils/formatters';
import { calculateSettlementsWithConversion } from '../../utils/expenseCalculator';
import { convertCurrency } from '../../utils/currencyExchange';
import { Expense, User, TimelineExpense as MainTimelineExpense } from '../../types'; // Changed: Import TimelineExpense as MainTimelineExpense from ../../types
import HoverCard, { HoverCardPosition } from '../ui/HoverCard'; // Import HoverCard
// Removed: import { TimelineExpense } from '../../utils/timelineUtils';

interface FinancialSummaryProps {
  // Props to be removed:
  // totalSpent: number;
  // unsettledCount: number;
  // totalPendingAmount: number;
  // preferredCurrency: string; // Will get from context
  // isConvertingCurrencies: boolean; // Will get from context
  // youOwe?: number;
  // othersOwe?: number;

  // Remaining props
  compareWithLastMonth?: number;
  activeEvents?: number;
  activeParticipants?: number;
  inactiveParticipants?: number;
  mostExpensiveCategory?: { name: string; amount: number }; // Will keep as prop for now
  highestExpense?: number; // Will keep as prop for now
  avgPerDay?: number; // Will keep as prop for now
}

export default function FinancialSummary({
  compareWithLastMonth = 0,
  activeEvents = 0,
  activeParticipants = 0,
  inactiveParticipants = 0,
  mostExpensiveCategory = { name: 'Uncategorized', amount: 0 },
  highestExpense = 0,
  avgPerDay = 0,
}: FinancialSummaryProps) {
  const { state, preferredCurrency, isConvertingCurrencies } = useAppContext();
  const { users, expenses, events } = state; 
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true); // Initialize isLoading to true
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [calculatedTotalSpent, setCalculatedTotalSpent] = useState(0);
  const [calculatedYouOwe, setCalculatedYouOwe] = useState(0);
  const [calculatedOthersOwe, setCalculatedOthersOwe] = useState(0);
  const [numOutgoingSettlements, setNumOutgoingSettlements] = useState(0); // Number of payments current user makes (globally simplified)
  const [numCreditors, setNumCreditors] = useState(0); // Number of distinct users current user owes
  const [numDebtors, setNumDebtors] = useState(0); // Number of distinct users who owe the current user

  // State for Hover Card
  const [hoverCardPosition, setHoverCardPosition] = useState<HoverCardPosition | null>(null);
  const [detailedHoverExpenses, setDetailedHoverExpenses] = useState<MainTimelineExpense[]>([]); // Changed: Use MainTimelineExpense
  const [showDetailedHoverCard, setShowDetailedHoverCard] = useState(false);
  const [isHoveringDetailedCard, setIsHoveringDetailedCard] = useState(false);
  let hoverTimeout: NodeJS.Timeout | null = null;


  useEffect(() => {
    if (users && users.length > 0) { // Check if users exists before accessing length
      const identifiedUser = users[0]; 
      setCurrentUser(identifiedUser);
    } else {
      setCurrentUser(null);
    }
  }, [users]);

  useEffect(() => {
    const performCalculations = async () => {
      // setIsLoading(true); // No longer needed here as it starts true
      try {
        // Explicitly check if expenses is an array before proceeding with calculations.
        // This is a safeguard, though the calling useEffect condition should also ensure this.
        if (!Array.isArray(expenses)) {
          console.error("FinancialSummary: expenses is not an array in performCalculations.");
          // Set to zero or error state, similar to the main catch block
          setCalculatedTotalSpent(0);
          setCalculatedYouOwe(0);
          setCalculatedOthersOwe(0);
          setNumOutgoingSettlements(0);
          setNumCreditors(0);
          setNumDebtors(0);
          return; // Exit if expenses is not an array
        }

        const unsettledExpenses = expenses.filter(exp => !exp.settled);
        const validUsers = Array.isArray(users) ? users : []; // users is already checked by outer condition

        // currentUser is asserted non-null by the outer if condition.
        // validUsers.length > 0 is also asserted by the outer if condition.

        let tempYouOwe = 0;
        let tempOthersOwe = 0;
        let distinctCreditorsCount = 0; 
        let distinctDebtorsCount = 0; // Initialize counter for distinct debtors

        for (const otherUser of validUsers) { // Use validUsers
          if (otherUser.id === currentUser!.id) continue; 

          let balanceWithOtherUser = 0;
          for (const exp of unsettledExpenses) { // Use unsettledExpenses
            const participants = exp.participants || [];

            let amountInPreferredCurrency = exp.amount;
            if (isConvertingCurrencies && exp.currency !== preferredCurrency) {
              try {
                const conversionResult = await convertCurrency(exp.amount, exp.currency, preferredCurrency);
                amountInPreferredCurrency = conversionResult.convertedAmount;
              } catch (error) {
                console.error(`Failed to convert currency for expense ${exp.id} in FinancialSummary`, error);
              }
            }
            const shareAmount = amountInPreferredCurrency / participants.length;

            if (exp.paidBy === currentUser!.id && participants.includes(otherUser.id)) {
              balanceWithOtherUser += shareAmount;
            } else if (exp.paidBy === otherUser.id && participants.includes(currentUser!.id)) {
              balanceWithOtherUser -= shareAmount;
            }
          }

          if (balanceWithOtherUser > 0) {
            tempOthersOwe += balanceWithOtherUser;
            distinctDebtorsCount++; // Increment if this otherUser owes currentUser
          } else if (balanceWithOtherUser < 0) {
            tempYouOwe += Math.abs(balanceWithOtherUser);
            distinctCreditorsCount++; // Increment if current user owes this otherUser
          }
        }
        setCalculatedYouOwe(tempYouOwe);
        setCalculatedOthersOwe(tempOthersOwe);
        setNumCreditors(distinctCreditorsCount); // Set the count of distinct creditors
        setNumDebtors(distinctDebtorsCount); // Set the count of distinct debtors

        // Calculate number of outgoing settlements (globally simplified payments currentUser needs to make)
        const settlements = await calculateSettlementsWithConversion(
          unsettledExpenses,  // First argument should be expenses, not users
          validUsers,         // Second argument should be users
          preferredCurrency   // Third argument is the target currency
        );
        let paymentsToMakeCount = 0;
        settlements.forEach(settlement => {
          if (settlement.fromUser === currentUser!.id) {
            paymentsToMakeCount++;
          }
        });
        setNumOutgoingSettlements(paymentsToMakeCount);

        // Calculate Total Spent by currentUser this month (existing logic)
        let currentMonthTotalSpent = 0;
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const currentUserExpensesThisMonth = (Array.isArray(expenses) ? expenses : []).filter(exp => { // Guard expenses again
          const expenseDate = new Date(exp.date);
          return exp.paidBy === currentUser!.id &&
                 expenseDate >= firstDayOfMonth &&
                 expenseDate <= lastDayOfMonth;
        });

        for (const exp of currentUserExpensesThisMonth) {
          let amount = exp.amount;
          if (isConvertingCurrencies && exp.currency !== preferredCurrency) {
            try {
              const conversionResult = await convertCurrency(exp.amount, exp.currency, preferredCurrency);
              amount = conversionResult.convertedAmount;
            } catch (error) {
              console.error(`Failed to convert currency for expense ${exp.id}`, error);
              // Decide handling: skip, use original, or mark as error
            }
          }
          currentMonthTotalSpent += amount;
        }
        setCalculatedTotalSpent(currentMonthTotalSpent);

      } catch (error) {
        console.error("Error calculating financial summary:", error);
        // Set to zero or error state
        setCalculatedTotalSpent(0);
        setCalculatedYouOwe(0);
        setCalculatedOthersOwe(0);
        setNumOutgoingSettlements(0);
        setNumCreditors(0);
        setNumDebtors(0); // Reset numDebtors on error
      } finally {
        setIsLoading(false); // Set loading false when calculations complete or fail
      }
    };

    if (currentUser && users && users.length > 0 && Array.isArray(expenses)) { // Ensure expenses is an array
      performCalculations();
    } else {
      // Not ready or data cleared: reset values and ensure not loading.
      setCalculatedTotalSpent(0);
      setCalculatedYouOwe(0);
      setCalculatedOthersOwe(0);
      setNumOutgoingSettlements(0);
      setNumCreditors(0);
      setNumDebtors(0);
      setIsLoading(false); // Ensure loading is false if we can't perform calculations
    }
  }, [currentUser, expenses, users, preferredCurrency, isConvertingCurrencies]);

  const mapExpensesToTimelineExpenses = (expensesToMap: Expense[]): MainTimelineExpense[] => { // Changed: Return MainTimelineExpense[]
    return expensesToMap.map(exp => {
      const eventDetails = Array.isArray(events) ? events.find(e => e.id === exp.eventId) : undefined; // Guard events
      return {
        id: exp.id,
        type: 'expense', // Field for MainTimelineExpense
        date: exp.date, // Use string date as defined in TimelineExpense interface
        title: exp.description, // Field for MainTimelineExpense
        amount: exp.amount,
        currency: exp.currency,
        category: exp.category || 'Other', // Field for MainTimelineExpense - provide default value
        eventName: eventDetails ? eventDetails.name : 'N/A', // Field for MainTimelineExpense
        eventId: exp.eventId,
        settled: exp.settled,
        paidBy: exp.paidBy,
        participants: exp.participants || [], // Field for MainTimelineExpense
        userNames: Array.isArray(users) ? users.reduce((acc, user) => { // Guard users // Field for MainTimelineExpense
          acc[user.id] = user.name;
          return acc;
        }, {} as Record<string, string>) : {},
      };
    });
  };

  const handleMetricHover = (event: React.MouseEvent, metricType: 'owe' | 'owed') => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    if (!currentUser) return;

    let relevantExpenses: Expense[] = [];
    const unsettledExpenses = expenses.filter(exp => !exp.settled);

    if (metricType === 'owed') {
      // Show expenses paid by current user, contributing to what others owe them (net positive balances)
      relevantExpenses = unsettledExpenses.filter(exp => {
        if (exp.paidBy !== currentUser.id) return false;
        // Check if this expense contributes to a net positive balance with any participant
        return (exp.participants || []).some(participantId => {
          if (participantId === currentUser.id) return false;
          let balanceWithThisParticipant = 0;
          unsettledExpenses.forEach(e => {
            if (!e.participants || e.participants.length === 0) return;
            const share = e.amount / e.participants.length; // Assuming same currency for simplicity here, conversion handled broadly
            if (e.paidBy === currentUser.id && e.participants.includes(participantId)) balanceWithThisParticipant += share;
            if (e.paidBy === participantId && e.participants.includes(currentUser.id)) balanceWithThisParticipant -= share;
          });
          return balanceWithThisParticipant > 0 && exp.participants.includes(participantId);
        });
      });
    } else if (metricType === 'owe') {
      // Show expenses current user participated in and owes for (net negative balances)
      relevantExpenses = unsettledExpenses.filter(exp => {
        if (!exp.participants?.includes(currentUser.id) || exp.paidBy === currentUser.id) return false;
        // Check if this expense contributes to a net negative balance with the payer
        const payerId = exp.paidBy;
        let balanceWithPayer = 0;
        unsettledExpenses.forEach(e => {
          if (!e.participants || e.participants.length === 0) return;
          const share = e.amount / e.participants.length;
          if (e.paidBy === currentUser.id && e.participants.includes(payerId)) balanceWithPayer += share;
          if (e.paidBy === payerId && e.participants.includes(currentUser.id)) balanceWithPayer -= share;
        });
        return balanceWithPayer < 0;
      });
    }
    
    setDetailedHoverExpenses(mapExpensesToTimelineExpenses(relevantExpenses));

    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setHoverCardPosition({
      x: targetRect.left, 
      y: targetRect.bottom + 5,
      targetRect,
      preferredPlacement: 'bottom',
    });
    setShowDetailedHoverCard(true);
  };

  const handleMetricLeave = () => {
    if (hoverTimeout) clearTimeout(hoverTimeout);
    hoverTimeout = setTimeout(() => {
      if (!isHoveringDetailedCard) {
        setShowDetailedHoverCard(false);
      }
    }, 200);
  };

  const handleHoverCardClose = () => {
    setShowDetailedHoverCard(false);
    setIsHoveringDetailedCard(false);
  };
  
  const netBalance = calculatedOthersOwe - calculatedYouOwe;
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toLocaleString('default', { month: 'long' });

  if (isLoading) {
    return <div className={styles.loading}>Loading financial summary...</div>;
  }

  return (
    <div className={styles.financialSummary}>
      {/* BLOCK 1: Current Period Summary */}
      <div className={styles.summaryBlock}>
        <h3 className={styles.blockTitle}>Period Summary</h3>
        
        <div className={styles.metric}>
          <div className={styles.metricIcon}>💸</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>
              {formatCurrency(calculatedTotalSpent, preferredCurrency)}
            </div>
            <div className={styles.metricLabel}>
              Total this {currentMonth}
            </div>
            {compareWithLastMonth !== 0 && (
              <div className={`${styles.comparison} ${compareWithLastMonth > 0 ? styles.increased : styles.decreased}`}>
                {compareWithLastMonth > 0 ? '↑' : '↓'} 
                {formatCurrency(Math.abs(compareWithLastMonth), preferredCurrency)} vs {lastMonth}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.metric}>
          <div className={styles.metricIcon}>🎉</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{activeEvents}</div>
            <div className={styles.metricLabel}>Active Events</div>
            {numOutgoingSettlements > 0 && (
              <div className={styles.metricNote}>
                {numOutgoingSettlements} with unsettled expenses 
                {/* This label might need future clarification; it currently means "X payments you need to make" */}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.metric}>
          <div className={styles.metricIcon}>👥</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>{activeParticipants}</div>
            <div className={styles.metricLabel}>Active Participants</div>
            {inactiveParticipants > 0 && (
              <div className={styles.metricNote}>
                {inactiveParticipants} haven&apos;t added expenses
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* BLOCK 2: Balance Situation */}
      <div className={styles.summaryBlock}>
        <h3 className={styles.blockTitle}>Balance Situation</h3>
        
        <div className={styles.balanceOverview}>
          <div 
            className={`${styles.balanceItem} ${calculatedYouOwe > 0 ? styles.negative : ''}`}
            onMouseEnter={(e) => calculatedYouOwe > 0 && handleMetricHover(e, 'owe')}
            onMouseLeave={handleMetricLeave}
          >
            <div className={styles.balanceLabel}>You Owe</div>
            <div className={styles.balanceValue}>
              {formatCurrency(calculatedYouOwe, preferredCurrency)}
            </div>
          </div>
          
          <div className={styles.balanceDivider}>•</div>
          
          <div 
            className={`${styles.balanceItem} ${calculatedOthersOwe > 0 ? styles.positive : ''}`}
            onMouseEnter={(e) => calculatedOthersOwe > 0 && handleMetricHover(e, 'owed')}
            onMouseLeave={handleMetricLeave}
          >
            <div className={styles.balanceLabel}>Owed to You</div>
            <div className={styles.balanceValue}>
              {formatCurrency(calculatedOthersOwe, preferredCurrency)}
            </div>
          </div>
        </div>
        
        <div className={`${styles.netBalance} ${netBalance >= 0 ? styles.positive : styles.negative}`}>
          Net Balance: {formatCurrency(netBalance, preferredCurrency)}
        </div>
        
        <div className={styles.pendingActionsContainer}> {/* New wrapper div */}
          {calculatedYouOwe > 0 && (
            <div className={styles.pendingSettlements}>
              <div className={styles.pendingLabel}>
                {numCreditors} pending {numCreditors === 1 ? 'settlement' : 'settlements'}
              </div>
              <div className={styles.pendingAmount}>
                {formatCurrency(calculatedYouOwe, preferredCurrency)}
              </div>
              <button 
                className={styles.settlementButton}
                onClick={() => router.push('/settlements')}
              >
                Settle Up
              </button>
            </div>
          )}

          {calculatedOthersOwe > 0 && (
            <div className={`${styles.pendingSettlements} ${styles.pendingReceipts}`}> {/* Re-using pendingSettlements for base styling, pendingReceipts for specifics */}
              <div className={styles.pendingLabel}>
                {numDebtors} pending {numDebtors === 1 ? 'receipt' : 'receipts'}
              </div>
              <div className={styles.pendingAmount}>
                {formatCurrency(calculatedOthersOwe, preferredCurrency)}
              </div>
              <button
                className={`${styles.settlementButton} ${styles.remindButton}`} 
                onClick={() => console.log('Remind users action triggered')} 
              >
                Remind
              </button>
            </div>
          )}
        </div> {/* End of new wrapper div */}
      </div>
      
      {/* BLOCK 3: Personal Insights */}
      <div className={styles.summaryBlock}>
        <h3 className={styles.blockTitle}>Your Insights</h3>
        
        {highestExpense > 0 && (
          <div className={styles.insight}>
            <div className={styles.insightIcon}>💰</div>
            <div className={styles.insightContent}>
              <div className={styles.insightLabel}>Highest Expense</div>
              <div className={styles.insightValue}>
                {formatCurrency(highestExpense, preferredCurrency)}
              </div>
            </div>
          </div>
        )}
        
        {mostExpensiveCategory.amount > 0 && (
          <div className={styles.insight}>
            <div className={styles.insightIcon}>
              {mostExpensiveCategory.name === 'Travel' ? '✈️' : 
               mostExpensiveCategory.name === 'Food' ? '🍕' : 
               mostExpensiveCategory.name === 'Housing' ? '🏠' : '📊'}
            </div>
            <div className={styles.insightContent}>
              <div className={styles.insightLabel}>Top Category</div>
              <div className={styles.insightValue}>
                {mostExpensiveCategory.name} - {formatCurrency(mostExpensiveCategory.amount, preferredCurrency)}
              </div>
            </div>
          </div>
        )}
        
        {avgPerDay > 0 && (
          <div className={styles.insight}>
            <div className={styles.insightIcon}>📅</div>
            <div className={styles.insightContent}>
              <div className={styles.insightLabel}>Daily Average (30 days)</div>
              <div className={styles.insightValue}>
                {formatCurrency(avgPerDay, preferredCurrency)}
              </div>
            </div>
          </div>
        )}
        
        {calculatedTotalSpent === 0 && !isLoading && (
          <div className={styles.noActivityPrompt}>
            <div className={styles.promptIcon}>📝</div>
            <div className={styles.promptMessage}>
              No expenses recorded this month. Add your first expense to start tracking!
            </div>
            <button 
              className={styles.promptButton}
              onClick={() => router.push('/expenses/new')}
            >
              Add Expense
            </button>
          </div>
        )}
      </div>
      {showDetailedHoverCard && hoverCardPosition && detailedHoverExpenses.length > 0 && (
        <HoverCard
          position={hoverCardPosition}
          expenses={detailedHoverExpenses}
          onClose={handleHoverCardClose}
          onMouseEnter={() => {
            if (hoverTimeout) clearTimeout(hoverTimeout);
            setIsHoveringDetailedCard(true);
          }}
          onMouseLeave={() => {
            setIsHoveringDetailedCard(false);
            handleMetricLeave(); // Re-evaluate if card should close
          }}
        />
      )}
    </div>
  );
}
