import React, { useState } from 'react';
import styles from './styles.module.css';
import HoverCard, { HoverCardPosition } from '../HoverCard';
import { 
  TimelineEvent, 
  TimelineExpense, 
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
  // State for hover card with expense details
  const [activeGroup, setActiveGroup] = useState<{
    position: HoverCardPosition,
    expenses: TimelineExpense[]
  } | null>(null);

  // Calculate timeline progress (percentage of time elapsed in event)
  const timelineProgress = calculateTimelineProgress(event.startDate, event.endDate);

  // Group expenses that are near each other on the timeline
  const groupedExpenses = groupNearbyExpenses(expenses, event);

  // Handle click on expense marker
  const handleExpenseClick = (e: React.MouseEvent, expenses: TimelineExpense[]) => {
    e.stopPropagation();
    setActiveGroup({
      position: { 
        x: e.clientX, 
        y: e.clientY 
      },
      expenses
    });
  };

  return (
    <div className={`${styles.timelineContainer} ${className}`}>
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
          
          // If all expenses in the group are settled, use settled style (green)
          const allSettled = group.expenses.every(expense => expense.settled);
          // If some but not all expenses are settled, use mixed style
          const somesettled = group.expenses.some(expense => expense.settled);
          
          if (allSettled) {
            markerClass = styles.settledExpense;
          } else if (somesettled && group.expenses.length > 1) {
            markerClass = styles.mixedExpense;
          }
          
          // Prepare appropriate tooltip based on number of expenses
          const tooltipContent = group.expenses.length === 1 
            ? `${group.expenses[0].description || 'Expense'}: ${group.expenses[0].amount} ${group.expenses[0].currency} (${formatTimelineDate(group.expenses[0].date)})` 
            : `${group.expenses.length} expenses - ${group.expenses.filter(e => e.settled).length} settled, ${group.expenses.filter(e => !e.settled).length} unsettled`;
          
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
          {expenses.some(exp => calculatePositionPercentage(exp.date, event.startDate, event.endDate) < 0) && (
            <div className={styles.legendItem}>
              <div className={`${styles.legendColor} ${styles.preEventExpense}`}></div>
              <span>Pre-event</span>
            </div>
          )}
          {/* Post-event expenses */}
          {expenses.some(exp => 
            event.endDate && calculatePositionPercentage(exp.date, event.startDate, event.endDate) > 100
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
          onClose={() => setActiveGroup(null)}
        />
      )}
    </div>
  );
};

export default Timeline;