import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import styles from './styles.module.css';
import HoverCard, { HoverCardPosition } from '../HoverCard';
import { TimelineExpense, TimelineEvent } from '../../../types';
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
}

/**
 * Timeline component for displaying event progress and expenses
 */
const Timeline: React.FC<TimelineProps> = ({ 
  event, 
  expenses,
  className = '',
  progressColor,
}) => {
  const { state } = useAppContext();
  // State for hover card with expense details
  const [activeGroup, setActiveGroup] = useState<{
    position: HoverCardPosition,
    expenses: TimelineExpense[]
  } | null>(null);

  // Calculate timeline progress (percentage of time elapsed in event)
  const timelineProgress = calculateTimelineProgress(event.startDate, event.endDate);

  // Group expenses that are near each other on the timeline
  const groupedExpenses = groupNearbyExpenses(
    expenses.map(e => ({
      ...e,
      date: e.date instanceof Date ? e.date.toISOString() : e.date,
      description: e.title || '',
    })),
    {
      ...event,
      date: event.startDate || '',
      createdAt: event.createdAt || '',
      createdBy: event.createdBy || '',
      members: event.members || [],
      expenseIds: event.expenseIds || [],
    }
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

  // Handle click on expense marker
  const handleExpenseClick = (e: React.MouseEvent, expenses: any[]) => {
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
    // Map grouped expenses to TimelineExpense[]
    const timelineExpenses = expenses.map((exp: any) => ({
      ...exp,
      date: exp.date instanceof Date ? exp.date : new Date(exp.date),
      type: 'expense',
      title: exp.description,
      eventName: event.name,
      userNames: Object.fromEntries((exp.participants as string[]).map((pid: string) => {
        const user = state.users.find((u: any) => u.id === pid);
        return [pid, user ? user.name : 'Unknown'];
      })),
      category: exp.category ?? '',
    }));
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
          title={`Event Start: ${formatTimelineDate(event.startDate)}`}
        />
        {event.endDate && (
          <div 
            className={styles.timelineDot} 
            style={{ left: '100%' }} 
            title={`Event End: ${formatTimelineDate(event.endDate)}`}
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
              onClick={(e) => handleExpenseClick(e, group.expenses)}
              tabIndex={0}
              role="button"
              aria-label={tooltipContent}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleExpenseClick(e as any, group.expenses);
                }
              }}
            />
          );
        })}
      </div>
      
      <div className={styles.timelineDates}>
        <span>
          {formatTimelineDate(event.startDate)}
        </span>
        {event.endDate && (
          <span>
            {formatTimelineDate(event.endDate)}
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
          {expenses.some(exp => calculatePositionPercentage((exp.date instanceof Date ? exp.date.toISOString() : exp.date), event.startDate, event.endDate) < 0) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.preEventExpense}`}></div>
              <span>Pre-event</span>
            </div>
          )}
          {/* Post-event expenses */}
          {expenses.some(exp => 
            event.endDate && calculatePositionPercentage((exp.date instanceof Date ? exp.date.toISOString() : exp.date), event.startDate, event.endDate) > 100
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