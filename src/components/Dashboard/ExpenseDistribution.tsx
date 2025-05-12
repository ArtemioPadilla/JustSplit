import React, { useEffect, useState } from 'react';
import styles from '../../app/page.module.css';
import { convertCurrency } from '../../utils/currencyExchange';

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
}

interface ExpenseDistributionProps {
  categoryDistribution: CategoryData[];
  preferredCurrency?: string;
  isConvertingCurrencies?: boolean;
}

export default function ExpenseDistribution({ categoryDistribution, preferredCurrency = 'USD', isConvertingCurrencies = true }: ExpenseDistributionProps) {
  const [convertedCategories, setConvertedCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const convertAll = async () => {
      setIsLoading(true);
      const results = await Promise.all(categoryDistribution.map(async (cat) => {
        if (!isConvertingCurrencies || cat.currency === preferredCurrency) {
          return { ...cat, amount: cat.amount, percentage: cat.percentage };
        }
        try {
          const { convertedAmount } = await convertCurrency(cat.amount, cat.currency, preferredCurrency);
          return { ...cat, amount: convertedAmount, percentage: cat.percentage };
        } catch {
          return { ...cat, amount: cat.amount, percentage: cat.percentage };
        }
      }));
      if (isMounted) setConvertedCategories(results);
      setIsLoading(false);
    };
    convertAll();
    return () => { isMounted = false; };
  }, [categoryDistribution, preferredCurrency, isConvertingCurrencies]);

  if (isLoading) {
    return <div className={styles.dashboardCard}><h2 className={styles.cardTitle}>Expense Distribution</h2><div>Converting currencies...</div></div>;
  }

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Expense Distribution</h2>
      {convertedCategories.length > 0 ? (
        <div className={styles.distributionChart}>
          {convertedCategories.slice(0, 5).map((category, index) => (
            <div key={index} className={styles.distributionItem}>
              <div className={styles.distributionLabel}>
                <span className={styles.categoryColor} style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}></span>
                <span className={styles.categoryName}>{category.name}</span>
              </div>
              <div className={styles.distributionBar}>
                <div 
                  className={styles.distributionFill} 
                  style={{ 
                    width: `${category.percentage}%`,
                    backgroundColor: `hsl(${index * 60}, 70%, 50%)` 
                  }}
                ></div>
              </div>
              <div className={styles.distributionValue}>
                {preferredCurrency} {category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyMessage}>No expenses to categorize</p>
      )}
    </div>
  );
}
