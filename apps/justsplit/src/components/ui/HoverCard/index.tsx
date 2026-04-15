import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import styles from './styles.module.css';
import { formatTimelineDate } from '../../../utils/timelineUtils'; // Keep formatTimelineDate if it's correctly sourced here
import { TimelineExpense } from '../../../types'; // Import TimelineExpense directly from the main types file
import Button from '../Button';
import { useAppContext } from '../../../context/AppContext';
import { convertCurrency, formatCurrency } from '../../../utils/currencyExchange';

export interface HoverCardPosition {
  x: number;
  y: number;
  targetRect?: DOMRect; // Add targetRect to track the position of the target element
  preferredPlacement?: 'top' | 'bottom' | 'left' | 'right' | 'side'; // Add preferred placement
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
  /**
   * Mouse enter event handler
   */
  onMouseEnter?: () => void;
  /**
   * Mouse leave event handler
   */
  onMouseLeave?: () => void;
  /**
   * Children to render inside the hover card
   */
  children?: React.ReactNode;
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
  onMouseEnter,
  onMouseLeave,
  children
}) => {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const { state, preferredCurrency: contextPreferredCurrency } = useAppContext(); // Destructure preferredCurrency directly
  const preferredCurrency = contextPreferredCurrency || 'USD'; // Use the destructured value
  const [convertedAmounts, setConvertedAmounts] = useState<Record<string, { amount: number, isFallback: boolean }>>({});

  // Use fixed positioning to be independent of scroll containers
  const [cardStyle, setCardStyle] = useState<{
    position: 'fixed';
    top: string;
    left: string;
    opacity: number;
    zIndex: number;
    pointerEvents: 'none' | 'auto'; // Allow both 'none' and 'auto'
    transform: string;
  }>({
    position: 'fixed',
    top: '0px',
    left: '0px',
    opacity: 0,
    zIndex: 2000,
    pointerEvents: 'none', // Initial value
    transform: '',
  });
  const [arrowPosition, setArrowPosition] = useState<ArrowPosition>('top');
  const [isVisible, setIsVisible] = useState(false);

  // Ensure the portal is mounted before rendering
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Fetch converted amounts when expenses or preferredCurrency changes
  useEffect(() => {
    let isMounted = true;
    const fetchConversions = async () => {
      const conversions: Record<string, { amount: number, isFallback: boolean }> = {};
      await Promise.all(
        expenses.map(async (expense) => {
          if (expense.currency === preferredCurrency) {
            conversions[expense.id] = { amount: expense.amount, isFallback: false };
          } else {
            try {
              const { convertedAmount, isFallback } = await convertCurrency(
                expense.amount,
                expense.currency,
                preferredCurrency
              );
              conversions[expense.id] = { amount: convertedAmount, isFallback };
            } catch {
              conversions[expense.id] = { amount: expense.amount, isFallback: true };
            }
          }
        })
      );
      if (isMounted) setConvertedAmounts(conversions);
    };
    fetchConversions();
    return () => { isMounted = false; };
  }, [expenses, preferredCurrency]);

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
        let newTop, newLeft, newArrowPosition, newTransform = '';
        
        // Handle side placement if requested 
        if (position.preferredPlacement === 'side') {
          // Check if we have enough space on the right side
          const spaceOnRight = viewportWidth - targetRect.right - 20; // 20px margin
          const spaceOnLeft = targetRect.left - 20; // 20px margin
          
          if (spaceOnRight >= cardRect.width) {
            // Position on the right
            newLeft = targetRect.right + 10; // 10px gap
            newTop = Math.max(20, Math.min(
              position.y - (cardRect.height / 2), 
              viewportHeight - cardRect.height - 20
            ));
            newArrowPosition = 'left';
            newTransform = '';
          } else if (spaceOnLeft >= cardRect.width) {
            // Position on the left
            newLeft = targetRect.left - cardRect.width - 10; // 10px gap
            newTop = Math.max(20, Math.min(
              position.y - (cardRect.height / 2), 
              viewportHeight - cardRect.height - 20
            ));
            newArrowPosition = 'right';
            newTransform = '';
          } else {
            // Fallback to top/bottom placement
            if (position.y > viewportHeight / 2) {
              // Position above
              newTop = Math.max(20, targetRect.top - cardRect.height - 10);
              newArrowPosition = 'bottom';
            } else {
              // Position below
              newTop = Math.min(viewportHeight - cardRect.height - 20, targetRect.bottom + 10);
              newArrowPosition = 'top';
            }
            // Center horizontally
            newLeft = Math.max(cardRect.width / 2 + 20, 
                      Math.min(targetRect.left + (targetRect.width / 2), 
                              viewportWidth - (cardRect.width / 2) - 20));
            newTransform = 'translateX(-50%)';
          }
        } else {
          // Original top/bottom placement logic
          const spaceBelow = viewportHeight - targetRect.bottom;
          const spaceNeeded = cardRect.height + 20;

          // Position above or below based on available space
          if (spaceBelow >= spaceNeeded) {
            newTop = targetRect.bottom + 10; // 10px gap
            newArrowPosition = 'top';
          } else {
            newTop = targetRect.top - cardRect.height - 10; // 10px gap
            newArrowPosition = 'bottom';
          }

          // Center horizontally, but ensure it stays within viewport
          newLeft = targetRect.left + targetRect.width / 2;
          newTransform = 'translateX(-50%)';
        }

        // Ensure card stays within viewport boundaries
        newTop = Math.max(20, Math.min(viewportHeight - cardRect.height - 20, newTop));
        
        setCardStyle({
          position: 'fixed',
          top: `${newTop}px`,
          left: `${newLeft}px`,
          transform: newTransform,
          opacity: 1,
          zIndex: 2000,
          pointerEvents: 'auto',
        });

        setArrowPosition(newArrowPosition as ArrowPosition);
      } else {
        // Fallback for when targetRect is not provided
        setCardStyle({
          position: 'fixed',
          top: `${position.y}px`,
          left: `${position.x}px`,
          transform: '', // Added missing transform property
          opacity: 1,
          zIndex: 2000,
          pointerEvents: 'auto', // Ensure this is also allowed by the type
        });
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={getArrowClassName()} />
      {children ? (
        children
      ) : (
        <>
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
            <Button 
              onClick={(e) => {
                if (e) {
                  e.stopPropagation();
                }
                onClose();
              }}
              variant="primary"
              aria-label="Close"
            >
              ✕
            </Button>
          </div>
          <ul className={styles.expensesList}>
            {expenses.map(expense => {
              // Calculate how much the user owes/is owed for this expense
              let userShare = null;
              if (expense.participants && expense.paidBy) {
                const n = expense.participants.length;
                // Find the two users involved in the relative balance (if any)
                // For relative balance, show the share for the current user vs the other
                // For general, show the share for the current user
                // Try to infer from props if possible
                // We'll show the share for each participant
                userShare = expense.participants.map(pid => {
                  const user = state.users.find(u => u.id === pid);
                  let share = 0;
                  if (expense.paidBy === pid) {
                    // Payer: paid for others, so receives from each
                    share = expense.amount / n * (n - 1);
                  } else {
                    // Owes their share
                    share = -expense.amount / n;
                  }
                  return { name: user?.name || pid, share };
                });
              }
              return (
                <li key={expense.id} className={styles.expenseItem}>
                  <button
                    className={styles.expenseButton}
                    onClick={() => handleExpenseClick(expense.id)}
                    aria-label={`View expense: ${expense.title ?? 'Expense'}, ${expense.amount.toFixed(2)} ${expense.currency}, ${expense.settled ? 'Settled' : 'Unsettled'}`}
                  >
                    <div className={styles.expenseItemHeader}>
                      <span className={styles.expenseName}>{expense.title ?? 'Expense'}</span>
                      <span className={`${styles.expenseStatus} ${expense.settled ? styles.settled : styles.unsettled}`}>
                        {expense.settled ? 'Settled' : 'Unsettled'}
                      </span>
                    </div>
                    <div className={styles.expenseAmount}>
                      {formatCurrency(expense.amount, expense.currency)}
                      {expense.currency !== preferredCurrency && convertedAmounts[expense.id] && (
                        <span style={{ marginLeft: 8, color: '#888', fontSize: '0.95em' }}>
                          (≈ {formatCurrency(convertedAmounts[expense.id].amount, preferredCurrency)}
                          {convertedAmounts[expense.id].isFallback ? ' *' : ''})
                        </span>
                      )}
                    </div>
                    <div className={styles.expenseDate}>
                      {formatTimelineDate(expense.date)}
                    </div>
                    <div className={styles.expensePaidBy}>
                      Paid by: {state.users.find(user => user.id === expense.paidBy)?.name ?? 'Unknown'}
                    </div>
                    {userShare && (
                      <div className={styles.expenseShares}>
                        {userShare.map((s, idx) => (
                          <div key={idx} style={{ color: s.share < 0 ? '#F44336' : '#4CAF50', fontSize: '0.85em' }}>
                            {s.name}: {s.share > 0 ? '+' : ''}{s.share.toFixed(2)} {expense.currency}
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );

  // Render the hover card in a portal to avoid positioning constraints
  return mounted ? createPortal(hoverCardContent, document.body) : null;
};

export default HoverCard;