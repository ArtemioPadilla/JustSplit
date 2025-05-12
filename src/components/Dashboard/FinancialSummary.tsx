import React, { useMemo, useEffect, useState } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { convertCurrency } from '../../utils/currencyExchange';

const FinancialSummary = ({ preferredCurrency = 'USD', isConvertingCurrencies = true }) => {
  const { state } = useAppContext();
  const { expenses, events, settlements } = state;
  const [convertedExpenses, setConvertedExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Convert all expenses to preferred currency if needed
  useEffect(() => {
    let isMounted = true;
    const convertAll = async () => {
      setIsLoading(true);
      const results = await Promise.all(expenses.map(async (exp) => {
        if (!isConvertingCurrencies || exp.currency === preferredCurrency) {
          return { ...exp, convertedAmount: exp.amount };
        }
        try {
          const { convertedAmount } = await convertCurrency(exp.amount, exp.currency, preferredCurrency);
          return { ...exp, convertedAmount };
        } catch {
          return { ...exp, convertedAmount: exp.amount };
        }
      }));
      if (isMounted) setConvertedExpenses(results);
      setIsLoading(false);
    };
    convertAll();
    return () => { isMounted = false; };
  }, [expenses, preferredCurrency, isConvertingCurrencies]);

  // Format currency
  const formatCurrency = (amount) => {
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate total expenses
  const totalAmount = useMemo(() => {
    return convertedExpenses.reduce((sum, expense) => sum + (expense.convertedAmount || 0), 0);
  }, [convertedExpenses]);

  // Calculate averages
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastYear = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const expensesLastMonth = convertedExpenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth();
  });
  const expensesLastYear = convertedExpenses.filter(exp => {
    const d = new Date(exp.date);
    return d.getFullYear() === lastYear.getFullYear();
  });

  const avgExpenseAll = convertedExpenses.length ? totalAmount / convertedExpenses.length : 0;
  const avgExpenseLastMonth = expensesLastMonth.length ? expensesLastMonth.reduce((sum, e) => sum + e.convertedAmount, 0) / expensesLastMonth.length : 0;
  const avgExpenseLastYear = expensesLastYear.length ? expensesLastYear.reduce((sum, e) => sum + e.convertedAmount, 0) / expensesLastYear.length : 0;

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const categories = {};
    convertedExpenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += expense.convertedAmount;
    });
    return categories;
  }, [convertedExpenses]);

  // KPI: Events
  const totalEvents = events.length;
  // KPI: Settlements
  const totalSettlements = settlements.length;
  const unsettledSettlements = settlements.filter(s => s.status !== 'completed').length;

  // Largest and smallest expense
  const largestExpense = useMemo(() => convertedExpenses.length ? Math.max(...convertedExpenses.map(e => e.convertedAmount)) : 0, [convertedExpenses]);
  const smallestExpense = useMemo(() => convertedExpenses.length ? Math.min(...convertedExpenses.map(e => e.convertedAmount)) : 0, [convertedExpenses]);
  // Most frequent category
  const mostFrequentCategory = useMemo(() => {
    if (!convertedExpenses.length) return '—';
    const counts = {};
    convertedExpenses.forEach(e => {
      const cat = e.category || 'Uncategorized';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [convertedExpenses]);
  // Most frequent payer
  const mostFrequentPayer = useMemo(() => {
    if (!convertedExpenses.length) return '—';
    const counts = {};
    convertedExpenses.forEach(e => {
      counts[e.paidBy] = (counts[e.paidBy] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '—';
    return (state.users.find(u => u.id === top[0])?.name) || 'Unknown';
  }, [convertedExpenses, state.users]);
  // Event with most expenses
  const eventWithMostExpenses = useMemo(() => {
    if (!events.length) return '—';
    const counts = {};
    convertedExpenses.forEach(e => {
      if (e.eventId) counts[e.eventId] = (counts[e.eventId] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (!top) return '—';
    return (events.find(ev => ev.id === top[0])?.name) || 'Unknown';
  }, [convertedExpenses, events]);
  // Average settlement amount
  const avgSettlement = useMemo(() => settlements.length ? settlements.reduce((sum, s) => sum + s.amount, 0) / settlements.length : 0, [settlements]);
  // Largest settlement
  const largestSettlement = useMemo(() => settlements.length ? Math.max(...settlements.map(s => s.amount)) : 0, [settlements]);
  // Pending settlements value
  const pendingSettlementsValue = useMemo(() => settlements.filter(s => s.status !== 'completed').reduce((sum, s) => sum + s.amount, 0), [settlements]);
  // Total participants
  const uniqueParticipants = useMemo(() => {
    const ids = new Set();
    convertedExpenses.forEach(e => e.participants?.forEach(id => ids.add(id)));
    return ids.size;
  }, [convertedExpenses]);
  // Expense per participant
  const expensePerParticipant = uniqueParticipants ? totalAmount / uniqueParticipants : 0;
  // Expense per day
  const expenseDates = useMemo(() => Array.from(new Set(convertedExpenses.map(e => e.date.split('T')[0]))), [convertedExpenses]);
  const expensePerDay = expenseDates.length ? totalAmount / expenseDates.length : 0;

  if (isLoading) {
    return <div className={styles.dashboardCard}><h2 className={styles.cardTitle}>Financial Summary</h2><div>Converting currencies...</div></div>;
  }

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Financial Summary</h2>
      <div className={styles.financialSummaryKPIGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 18, marginBottom: 24 }}>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Expenses</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(totalAmount)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Avg. Expense (All Time)</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(avgExpenseAll)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Avg. Expense (Last Month)</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(avgExpenseLastMonth)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Avg. Expense (Last Year)</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(avgExpenseLastYear)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Events</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{totalEvents}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Settlements</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{totalSettlements}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Unsettled Settlements</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: unsettledSettlements > 0 ? '#eab308' : '#16a34a' }}>{unsettledSettlements}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Largest Expense</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(largestExpense)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Smallest Expense</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(smallestExpense)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Most Frequent Category</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{mostFrequentCategory}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Most Frequent Payer</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{mostFrequentPayer}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Event with Most Expenses</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{eventWithMostExpenses}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Avg. Settlement</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(avgSettlement)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Largest Settlement</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(largestSettlement)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Pending Settlements Value</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(pendingSettlementsValue)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Total Participants</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{uniqueParticipants}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Expense per Participant</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(expensePerParticipant)}</div>
        </div>
        <div className={styles.kpiBox} style={{ background: '#f8fafc', borderRadius: 10, padding: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#888' }}>Expense per Day</div>
          <div style={{ fontWeight: 700, fontSize: 22 }}>{formatCurrency(expensePerDay)}</div>
        </div>
      </div>
      <div className={styles.financialSummaryContent}>
        <div className={styles.categoryBreakdown} style={{ marginTop: 12 }}>
          <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 10 }}>Category Breakdown</h3>
          {Object.entries(expensesByCategory).length > 0 ? (
            Object.entries(expensesByCategory).map(([category, amount]) => (
              <div key={category} className={styles.categoryItem} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f1f1' }}>
                <span className={styles.categoryName} style={{ fontWeight: 500 }}>{category}</span>
                <span data-testid={`category-${category}-amount`} className={styles.categoryAmount} style={{ fontWeight: 600 }}>{formatCurrency(Number(amount))}</span>
              </div>
            ))
          ) : (
            <p>No expense data available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialSummary;
