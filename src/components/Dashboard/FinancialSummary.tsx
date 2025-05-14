import React from 'react';
import styles from './FinancialSummary.module.css';
import { useAppContext } from '../../context/AppContext';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '../../utils/formatters';

interface FinancialSummaryProps {
  totalSpent: number;
  unsettledCount: number;
  totalPendingAmount: number;
  preferredCurrency: string;
  isConvertingCurrencies: boolean;
  compareWithLastMonth?: number; // Optional comparison with last month
  activeEvents?: number;
  activeParticipants?: number;
  inactiveParticipants?: number;
  youOwe?: number;
  othersOwe?: number;
  mostExpensiveCategory?: { name: string; amount: number };
  highestExpense?: number;
  avgPerDay?: number;
}

export default function FinancialSummary({
  totalSpent,
  unsettledCount,
  totalPendingAmount,
  preferredCurrency,
  isConvertingCurrencies,
  compareWithLastMonth = 0,
  activeEvents = 0,
  activeParticipants = 0,
  inactiveParticipants = 0,
  youOwe = 0,
  othersOwe = 0,
  mostExpensiveCategory = { name: 'Uncategorized', amount: 0 },
  highestExpense = 0,
  avgPerDay = 0,
}: FinancialSummaryProps) {
  const { state } = useAppContext();
  const router = useRouter();
  
  const netBalance = othersOwe - youOwe;
  const currentMonth = new Date().toLocaleString('default', { month: 'long' });
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
    .toLocaleString('default', { month: 'long' });

  return (
    <div className={styles.financialSummary}>
      {/* BLOCK 1: Current Period Summary */}
      <div className={styles.summaryBlock}>
        <h3 className={styles.blockTitle}>Period Summary</h3>
        
        <div className={styles.metric}>
          <div className={styles.metricIcon}>💸</div>
          <div className={styles.metricContent}>
            <div className={styles.metricValue}>
              {formatCurrency(totalSpent, preferredCurrency)}
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
            {unsettledCount > 0 && (
              <div className={styles.metricNote}>
                {unsettledCount} with unsettled expenses
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
                {inactiveParticipants} haven't added expenses
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* BLOCK 2: Balance Situation */}
      <div className={styles.summaryBlock}>
        <h3 className={styles.blockTitle}>Balance Situation</h3>
        
        <div className={styles.balanceOverview}>
          <div className={`${styles.balanceItem} ${youOwe > 0 ? styles.negative : ''}`}>
            <div className={styles.balanceLabel}>You Owe</div>
            <div className={styles.balanceValue}>
              {formatCurrency(youOwe, preferredCurrency)}
            </div>
          </div>
          
          <div className={styles.balanceDivider}>•</div>
          
          <div className={`${styles.balanceItem} ${othersOwe > 0 ? styles.positive : ''}`}>
            <div className={styles.balanceLabel}>Owed to You</div>
            <div className={styles.balanceValue}>
              {formatCurrency(othersOwe, preferredCurrency)}
            </div>
          </div>
        </div>
        
        <div className={`${styles.netBalance} ${netBalance >= 0 ? styles.positive : styles.negative}`}>
          Net Balance: {formatCurrency(netBalance, preferredCurrency)}
        </div>
        
        {unsettledCount > 0 && (
          <div className={styles.pendingSettlements}>
            <div className={styles.pendingLabel}>
              {unsettledCount} pending {unsettledCount === 1 ? 'settlement' : 'settlements'}
            </div>
            <div className={styles.pendingAmount}>
              {formatCurrency(totalPendingAmount, preferredCurrency)}
            </div>
            <button 
              className={styles.settlementButton}
              onClick={() => router.push('/settlements')}
            >
              Settle Up
            </button>
          </div>
        )}
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
        
        {totalSpent === 0 && (
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
    </div>
  );
}
