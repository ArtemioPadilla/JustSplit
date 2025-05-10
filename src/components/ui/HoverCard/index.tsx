import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './styles.module.css';
import { TimelineExpense, formatTimelineDate } from '../../../utils/timelineUtils';

export interface HoverCardPosition {
  x: number;
  y: number;
}

export interface HoverCardProps {
  /**
   * Position where the hover card should appear
   */
  position: HoverCardPosition;
  /**
   * Expenses to show in the hover card
   */
  expenses: TimelineExpense[];
  /**
   * Callback when the hover card is closed
   */
  onClose: () => void;
  /**
   * Additional class name
   */
  className?: string;
}

/**
 * HoverCard component for displaying grouped expenses
 */
const HoverCard: React.FC<HoverCardProps> = ({
  position,
  expenses,
  onClose,
  className = '',
}) => {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);

  // Close hover card when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // Handle navigation to expense detail
  const handleExpenseClick = (expenseId: string) => {
    router.push(`/expenses/${expenseId}`);
    onClose();
  };

  return (
    <div
      className={`${styles.hoverCard} ${className}`}
      style={{
        position: 'fixed',
        top: `${position.y}px`,
        left: `${position.x}px`,
        transform: 'translate(-50%, -100%)',
        zIndex: 1000
      }}
      ref={cardRef}
    >
      <div className={styles.hoverCardHeader}>
        <h4>
          {expenses.length > 1 ? (
            <>
              {expenses.length} Expenses
              <span className={styles.expenseSummary}>
                {expenses.filter(e => e.settled).length} settled, 
                {expenses.filter(e => !e.settled).length} unsettled
              </span>
            </>
          ) : (
            'Expense Details'
          )}
        </h4>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      
      <ul className={styles.expensesList}>
        {expenses.map(expense => (
          <li 
            key={expense.id} 
            className={styles.expenseItem}
            onClick={() => handleExpenseClick(expense.id)}
          >
            <div className={styles.expenseItemHeader}>
              <span className={styles.expenseName}>{expense.description || 'Expense'}</span>
              <span className={`${styles.expenseStatus} ${expense.settled ? styles.settled : styles.unsettled}`}>
                {expense.settled ? 'Settled' : 'Unsettled'}
              </span>
            </div>
            <div className={styles.expenseAmount}>
              {expense.amount.toFixed(2)} {expense.currency}
            </div>
            <div className={styles.expenseDate}>
              {formatTimelineDate(expense.date)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HoverCard;