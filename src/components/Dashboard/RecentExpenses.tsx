import Link from 'next/link';
import { Expense, User } from '../../context/AppContext';
import styles from '../../app/page.module.css';

interface RecentExpensesProps {
  expenses: Expense[];
  users: User[];
}

export default function RecentExpenses({ expenses, users }: RecentExpensesProps) {
  // Get user name by ID
  const getUserName = (userId: string) => {
    const user = users.find(user => user.id === userId);
    return user ? user.name : 'Unknown';
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Expenses</h2>
      {expenses.length > 0 ? (
        <ul className={styles.expensesList}>
          {expenses.map(expense => (
            <li key={expense.id} className={styles.expenseItem}>
              <Link href={`/expenses/${expense.id}`}>
                <div className={styles.expenseName}>{expense.description}</div>
                <div className={styles.expenseDetails}>
                  <span>{new Date(expense.date).toLocaleDateString()}</span>
                  <span className={styles.expenseAmount}>
                    {expense.currency} {expense.amount.toFixed(2)}
                  </span>
                </div>
                <div className={styles.expensePaidBy}>
                  Paid by {getUserName(expense.paidBy)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>No expenses yet</p>
      )}
      <Link href="/expenses/list" className={styles.viewAllLink}>
        View all expenses
      </Link>
    </div>
  );
}
