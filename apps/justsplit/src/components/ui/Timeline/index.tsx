import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import styles from './styles.module.css';
import HoverCard, { HoverCardPosition } from '../HoverCard';
import { TimelineExpense, TimelineEvent, User, Expense, Event } from '../../../types';
import {
  calculateTimelineProgress,
  calculatePositionPercentage,
  groupNearbyExpenses,
  formatTimelineDate
} from '../../../utils/timelineUtils';


export interface TimelineProps {
  /**
   * The event data
   */
  event: TimelineEvent;
  /**
   * Expenses associated with the event
   */
  expenses: TimelineExpense[];
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Custom progress color (default is blue)
   */
  progressColor?: string;
  /**
   * Callback when an expense is clicked
   */
  onExpenseClick?: (expense: TimelineExpense) => void;
}

/**
 * Timeline component for displaying event progress and expenses
 */
const Timeline: React.FC<TimelineProps> = ({ 
  event, 
  expenses,
  className = '',
  progressColor,
  onExpenseClick,
}) => {
  const { state } = useAppContext();
  // State for hover card with expense details
  const [activeGroup, setActiveGroup] = useState<{
    position: HoverCardPosition,
    expenses: TimelineExpense[]
  } | null>(null);

  // Calculate timeline progress (percentage of time elapsed in event)
  const startDate: string = event?.startDate || new Date().toISOString();
  const endDate: string | undefined = event?.endDate;
  const timelineProgress = calculateTimelineProgress(startDate, endDate);

  // Group expenses that are near each other on the timeline
  const expensesForGrouping = expenses.map(e => ({
    id: e.id,
    description: e.title || '',
    amount: e.amount,
    currency: e.currency,
    date: e.date,
    paidBy: e.paidBy,
    participants: e.participants,
    eventId: e.eventId,
    settled: e.settled,
    category: e.category,
  }));
  
  const groupedExpenses = groupNearbyExpenses(
    expensesForGrouping,
    {
      id: event?.id || '',
      name: event?.name || '',
      date: startDate,
      startDate: startDate,
      endDate: endDate,
      createdAt: event?.createdAt || new Date().toISOString(),
      createdBy: event?.createdBy || '',
      members: event?.members || [],
      expenseIds: event?.expenseIds || [],
    } as Event
  );

  // Close hover card on escape key or when clicking elsewhere
  const closeHoverCard = useCallback(() => setActiveGroup(null), []);
  
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeGroup) {
        closeHoverCard();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [activeGroup, closeHoverCard]);

  // Handle keyboard navigation on expense marker
  const handleExpenseKeyPress = (e: React.KeyboardEvent, expenses: TimelineExpense[]) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      
      const targetElement = e.currentTarget as HTMLElement;
      const targetRect = targetElement.getBoundingClientRect();
      
      // expenses are already TimelineExpense[]
      const timelineExpenses = expenses;
      
      setActiveGroup({
        position: { 
          x: targetRect.left + targetRect.width / 2, 
          y: targetRect.top,
          targetRect: targetRect
        },
        expenses: timelineExpenses
      });
    }
  };

  // Handle click on expense marker
  const handleExpenseClick = (e: React.MouseEvent, expenses: TimelineExpense[]) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    const targetElement = e.currentTarget as HTMLElement;
    const targetRect = targetElement.getBoundingClientRect();
    
    // If we're already showing details for this marker, close it instead
    if (activeGroup && 
        activeGroup.position.targetRect &&
        targetRect.left === activeGroup.position.targetRect.left && 
        targetRect.top === activeGroup.position.targetRect.top) {
      closeHoverCard();
      return;
    }
    
    // expenses are already TimelineExpense[]
    const timelineExpenses = expenses;
    
    // Call the optional onExpenseClick callback if provided
    if (onExpenseClick && timelineExpenses.length > 0) {
      onExpenseClick(timelineExpenses[0]);
    }
    setActiveGroup({
      position: { 
        x: e.clientX, 
        y: e.clientY,
        targetRect: targetRect // Pass the target element's bounding rectangle
      },
      expenses: timelineExpenses
    });
  };

  return (
    <div 
      className={`${styles.timelineContainer} ${className}`}
      onClick={(e) => {
        // Only close if clicking the container itself, not its children
        if (e.target === e.currentTarget && activeGroup) {
          closeHoverCard();
        }
      }}
    >
      <div className={styles.timeline}>
        <div 
          className={styles.timelineProgress} 
          style={{ 
            width: `${timelineProgress}%`,
            backgroundColor: progressColor || undefined
          }}
        />
        <div 
          className={styles.timelineDot} 
          style={{ left: '0%' }} 
          title={`Event Start: ${formatTimelineDate(startDate)}`}
        />
        {endDate && (
          <div 
            className={styles.timelineDot} 
            style={{ left: '100%' }} 
            title={`Event End: ${formatTimelineDate(endDate)}`}
          />
        )}
        
        {/* Map grouped expenses to markers on the timeline */}
        {groupedExpenses.map((group, index) => {
          const position = group.position;
          const isPreEvent = position < 0;
          const absolutePosition = Math.abs(position);
          
          // Determine expense marker class based on settlement status
          let markerClass = styles.unsettledExpense; // Default to unsettled (red)
          let settlementStatus = 'unsettled';
          
          // If all expenses in the group are settled, use settled style (green)
          const allSettled = group.expenses.every(expense => expense.settled);
          // If some but not all expenses are settled, use mixed style
          const somesettled = group.expenses.some(expense => expense.settled);
          
          if (allSettled) {
            markerClass = styles.settledExpense;
            settlementStatus = 'settled';
          } else if (somesettled && group.expenses.length > 1) {
            markerClass = styles.mixedExpense;
            settlementStatus = 'partially settled';
          }
          
          // Prepare appropriate tooltip based on number of expenses
          const tooltipContent = group.expenses.length === 1 
            ? `${group.expenses[0].description || 'Expense'} (${settlementStatus}): ${group.expenses[0].amount} ${group.expenses[0].currency} (${formatTimelineDate(group.expenses[0].date)})` 
            : `${group.expenses.length} expenses (${settlementStatus}) - ${group.expenses.filter(e => e.settled).length} settled, ${group.expenses.filter(e => !e.settled).length} unsettled`;
          
          return (
            <div 
              key={`group-${index}`}
              className={`${styles.expenseMarker} 
                        ${markerClass}
                        ${isPreEvent ? styles.preEventExpense : ''}
                        ${position > 100 ? styles.postEventExpense : ''}
                        ${group.expenses.length > 1 ? styles.groupedExpense : ''}`}
              style={{ 
                left: `${isPreEvent ? 0 : position > 100 ? 100 : absolutePosition}%`,
                transform: `translate(${isPreEvent ? '-50%' : position > 100 ? '50%' : '-50%'}, -50%) ${group.expenses.length > 1 ? 'scale(1.2)' : ''}`
              }}
              title={tooltipContent}
              onClick={(e) => {
                const timelineExpensesForGroup = group.expenses.map(exp => 
                  expenses.find(te => te.id === exp.id)!
                );
                handleExpenseClick(e, timelineExpensesForGroup);
              }}
              tabIndex={0}
              role="button"
              aria-label={tooltipContent}
              onKeyPress={(e) => {
                const timelineExpensesForGroup = group.expenses.map(exp => 
                  expenses.find(te => te.id === exp.id)!
                );
                handleExpenseKeyPress(e, timelineExpensesForGroup);
              }}
            />
          );
        })}
      </div>
      
      <div className={styles.timelineDates}>
        <span>
          {formatTimelineDate(startDate)}
        </span>
        {endDate && (
          <span>
            {formatTimelineDate(endDate)}
          </span>
        )}
      </div>
      
      {/* Timeline legend with conditional rendering */}
      {expenses.length > 0 && (
        <div className={styles.timelineLegend}>
          {expenses.some(exp => exp.settled) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.settledExpense}`}></div>
              <span>Settled</span>
            </div>
          )}
          {expenses.some(exp => !exp.settled) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.unsettledExpense}`}></div>
              <span>Unsettled</span>
            </div>
          )}
          {/* Only show mixed legend if there's at least one group with mixed settlement status */}
          {groupedExpenses.some(group => 
            group.expenses.length > 1 && 
            group.expenses.some(exp => exp.settled) && 
            group.expenses.some(exp => !exp.settled)
          ) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.mixedExpense}`}></div>
              <span>Mixed Settlement</span>
            </div>
          )}
          {/* Pre-event expenses */}
          {expenses.some(exp => calculatePositionPercentage(exp.date, startDate, endDate) < 0) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.preEventExpense}`}></div>
              <span>Pre-event</span>
            </div>
          )}
          {/* Post-event expenses */}
          {expenses.some(exp => 
            endDate && calculatePositionPercentage(exp.date, startDate, endDate) > 100
          ) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.postEventExpense}`}></div>
              <span>Post-event</span>
            </div>
          )}
          {/* Multiple expenses */}
          {groupedExpenses.some(group => group.expenses.length > 1) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.groupedExpense}`}></div>
              <span>Multiple expenses</span>
            </div>
          )}
        </div>
      )}

      {/* HoverCard for expense details when a marker is clicked */}
      {activeGroup && (
        <HoverCard
          position={activeGroup.position}
          expenses={activeGroup.expenses}
          onClose={closeHoverCard}
        />
      )}
    </div>
  );
};

export default Timeline;