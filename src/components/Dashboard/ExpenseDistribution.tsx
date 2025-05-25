import React, { useState, useEffect } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { getCurrencySymbol } from '../../utils/currencyExchange';
import { CategoryData, Expense } from '../../types';

interface ExpenseDistributionProps {
  categoryDistribution?: CategoryData[];
  expenses?: Expense[];
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
}

const ExpenseDistribution = ({ 
  categoryDistribution: propCategoryDistribution, 
  expenses: propExpenses,
  preferredCurrency: propCurrency
}: ExpenseDistributionProps) => {
  const context = useAppContext();
  const [processedCategoryData, setProcessedCategoryData] = useState<CategoryData[]>([]);
  
  // Use props or context values
  const preferredCurrency = propCurrency || context?.preferredCurrency || 'USD';

  // Process expenses into category distribution if expenses are provided
  useEffect(() => {
    if (propExpenses && propExpenses.length > 0) {
      const categoryTotals: Record<string, number> = {};
      let totalAmount = 0;

      // Calculate totals by category
      propExpenses.forEach(expense => {
        const category = expense.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
        totalAmount += expense.amount;
      });

      // Convert to CategoryData format with percentages
      const categoryData: CategoryData[] = Object.entries(categoryTotals)
        .map(([name, amount]) => ({
          name,
          amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount); // Sort by amount descending

      setProcessedCategoryData(categoryData);
    } else if (propCategoryDistribution) {
      setProcessedCategoryData(propCategoryDistribution);
    } else {
      setProcessedCategoryData([]);
    }
  }, [propExpenses, propCategoryDistribution]);

  // Use processed data or provided category distribution
  const categoryDistribution = processedCategoryData;
  
  // Simple component to display expense distribution
  return (
    <div className={styles.dashboardCard}>
      <h2>Expense Distribution</h2>
      
      {categoryDistribution.length > 0 ? (
        <div className={styles.categoryList}>
          {categoryDistribution.map((category, index) => (
            <div key={index} className={styles.categoryItem}>
              <div className={styles.categoryName}>{category.name}</div>
              <div className={styles.categoryBar}>
                <div 
                  className={styles.categoryFill} 
                  style={{ width: `${Math.min(100, category.percentage)}%` }}
                />
              </div>
              <div className={styles.categoryAmount}>
                {getCurrencySymbol(preferredCurrency)}{category.amount.toFixed(2)}
                <span className={styles.percentage}>({category.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyMessage}>No expense data available</div>
      )}
    </div>
  );
};

export default ExpenseDistribution;
