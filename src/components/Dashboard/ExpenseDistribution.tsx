import styles from '../../app/page.module.css';

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
}

interface ExpenseDistributionProps {
  categoryDistribution: CategoryData[];
}

export default function ExpenseDistribution({ categoryDistribution }: ExpenseDistributionProps) {
  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Expense Distribution</h2>
      {categoryDistribution.length > 0 ? (
        <div className={styles.distributionChart}>
          {categoryDistribution.slice(0, 5).map((category, index) => (
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
                ${category.amount.toFixed(2)} ({category.percentage.toFixed(1)}%)
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
