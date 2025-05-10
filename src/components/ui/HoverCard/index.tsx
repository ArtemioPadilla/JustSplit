import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import styles from './styles.module.css';
import { TimelineExpense, formatTimelineDate } from '../../../utils/timelineUtils';

export interface HoverCardPosition {
  x: number;
  y: number;
  targetRect?: DOMRect; // Add targetRect to track the position of the target element
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

type ArrowPosition = 'top' | 'bottom' | 'left' | 'right';

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
  const [mounted, setMounted] = useState(false);
  
  // Use fixed positioning to be independent of scroll containers
  const [cardStyle, setCardStyle] = useState({
    position: 'fixed' as const,
    top: '0px',
    left: '0px',
    opacity: 0,
    zIndex: 2000,
    pointerEvents: 'none',
  });
  const [arrowPosition, setArrowPosition] = useState<ArrowPosition>('top');
  const [isVisible, setIsVisible] = useState(false);

  // Ensure the portal is mounted before rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Position the hover card when it mounts or position changes
  useEffect(() => {
    if (!cardRef.current || !mounted) return;

    const calculatePosition = () => {
      const card = cardRef.current;
      if (!card) return;

      const cardRect = card.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (position.targetRect) {
        const targetRect = position.targetRect;

        // Calculate if we have enough space below the target
        const spaceBelow = viewportHeight - targetRect.bottom;
        const spaceNeeded = cardRect.height + 20;

        let newTop, newArrowPosition;

        // Position above or below based on available space
        if (spaceBelow >= spaceNeeded) {
          newTop = targetRect.bottom;
          newArrowPosition = 'top';
        } else {
          newTop = targetRect.top - cardRect.height;
          newArrowPosition = 'bottom';
        }

        // Center horizontally, but ensure it stays within viewport
        let newLeft = targetRect.left + targetRect.width / 2;
        const halfCardWidth = cardRect.width / 2;
        newLeft = Math.max(halfCardWidth, Math.min(viewportWidth - halfCardWidth, newLeft));

        setCardStyle({
          position: 'fixed',
          top: `${newTop}px`,
          left: `${newLeft}px`,
          transform: 'translateX(-50%)',
          opacity: 1,
          zIndex: 2000,
          pointerEvents: 'auto',
        });

        setArrowPosition(newArrowPosition);
      }
    };

    calculatePosition();
    setIsVisible(true);

    // Recalculate on window events
    window.addEventListener('scroll', calculatePosition);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [position, mounted]);

  // Handle click outside to close
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
  
  // Generate the arrow class name
  const getArrowClassName = () => {
    const capitalizedPosition = arrowPosition.charAt(0).toUpperCase() + arrowPosition.slice(1);
    return `${styles.arrow} ${styles['arrow' + capitalizedPosition]}`;
  };

  // Content of the hover card
  const hoverCardContent = (
    <div
      className={`${styles.hoverCard} ${isVisible ? styles.visible : ''} ${className}`}
      style={cardStyle}
      ref={cardRef}
      onClick={(e) => e.stopPropagation()}
    >
      <div className={getArrowClassName()} />
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
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>
      
      <ul className={styles.expensesList}>
        {expenses.map(expense => (
          <li key={expense.id} className={styles.expenseItem}>
            <button
              className={styles.expenseButton}
              onClick={() => handleExpenseClick(expense.id)}
              aria-label={`View expense: ${expense.description ?? 'Expense'}, ${expense.amount.toFixed(2)} ${expense.currency}, ${expense.settled ? 'Settled' : 'Unsettled'}`}
            >
              <div className={styles.expenseItemHeader}>
                <span className={styles.expenseName}>{expense.description ?? 'Expense'}</span>
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
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  // Render the hover card in a portal to avoid positioning constraints
  return mounted ? createPortal(hoverCardContent, document.body) : null;
};

export default HoverCard;