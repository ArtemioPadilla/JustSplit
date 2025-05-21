import React, { useState, useEffect } from 'react';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';
import { getCurrencySymbol } from '../../utils/currencyExchange';
import { CategoryData } from '../../types';

interface ExpenseDistributionProps {
  categoryDistribution: CategoryData[];
  preferredCurrency: string;
  isConvertingCurrencies: boolean;
}

const ExpenseDistribution = ({ 
  categoryDistribution, 
  preferredCurrency: propCurrency,
  isConvertingCurrencies: propIsConverting
}: ExpenseDistributionProps) => {
  const context = useAppContext();
  
  // Use props or context values
  const preferredCurrency = propCurrency || context?.preferredCurrency || 'USD';
  const isConvertingCurrencies = propIsConverting !== undefined ? propIsConverting : context?.isConvertingCurrencies ?? true;
  
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
