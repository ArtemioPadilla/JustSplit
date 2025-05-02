import React, { useMemo } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';

const FinancialSummary = () => {
  const { state } = useAppContext();
  const { expenses } = state;

  // Calculate total expenses
  const totalAmount = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses]);

  // Group expenses by category
  const expensesByCategory = useMemo(() => {
    const categories = {};
    expenses.forEach(expense => {
      const category = expense.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = 0;
      }
      categories[category] += expense.amount;
    });
    return categories;
  }, [expenses]);

  // Format currency
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Financial Summary</h2>
      <div className={styles.financialSummaryContent}>
        <div className={styles.totalExpenses}>
          <span>Total Expenses:</span>
          <span data-testid="total-expenses" className={styles.totalAmount}>
            {formatCurrency(totalAmount)}
          </span>
        </div>
        
        {expenses.length > 0 ? (
          <div className={styles.categoryBreakdown}>
            <h3>Category Breakdown</h3>
            {Object.entries(expensesByCategory).map(([category, amount]) => (
              <div key={category} className={styles.categoryItem}>
                <span className={styles.categoryName}>{category}</span>
                <span 
                  data-testid={`category-${category}-amount`} 
                  className={styles.categoryAmount}
                >
                  {formatCurrency(Number(amount))}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No expense data available</p>
        )}
      </div>
    </div>
  );
};

export default FinancialSummary;
