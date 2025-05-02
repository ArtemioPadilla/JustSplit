import React from 'react';
import Link from 'next/link';
import styles from '../../app/page.module.css';
import { useAppContext } from '../../context/AppContext';

const RecentExpenses = () => {
  // Fix: Access expenses from state instead of directly
  const { state } = useAppContext();
  const { expenses, users } = state;

  // Function to find user name by ID
  const getUserName = (userId) => {
    const user = users.find(user => user.id === userId);
    return user ? user.name : 'Unknown User';
  };

  return (
    <div className={styles.dashboardCard}>
      <h2 className={styles.cardTitle}>Recent Expenses</h2>
      {expenses.length > 0 ? (
        <ul className={styles.expensesList}>
          {expenses.map(expense => (
            <li key={expense.id} className={styles.expenseItem}>
              <Link href={`/expenses/${expense.id}`}>
                <div className={styles.expenseDetails}>
                  <span className={styles.expenseDescription}>{expense.description}</span>
                  <span className={styles.expenseAmount}>
                    {expense.currency === 'USD' ? '$' : '€'}{expense.amount.toFixed(2)}
                  </span>
                  <span className={styles.expensePaidBy}>
                    {getUserName(expense.paidBy)}
                  </span>
                  <span className={styles.expenseDate}>
                    {expense.settled ? 'Settled' : new Date(expense.date).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>No expenses yet</p>
      )}
      <div className={styles.viewAllLink}>
        <Link href="/expenses">View all expenses</Link>
      </div>
    </div>
  );
};

export default RecentExpenses;
