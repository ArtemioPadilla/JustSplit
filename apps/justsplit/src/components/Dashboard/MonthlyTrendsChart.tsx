import React, { useState, useEffect } from 'react';
import { User, Event, TimelineExpense } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { getCurrencySymbol } from '../../utils/currencyExchange';
import styles from '../../app/page.module.css';
import HoverCard, { HoverCardPosition } from '../ui/HoverCard';

interface ChartData {
  month: string;
  amount: number;
  count: number;
  byEvent: { id: string; name: string; amount: number; percentage: number }[];
  byPayer: { id: string; name: string; amount: number; percentage: number }[];
}

interface MonthlyTrendsChartProps {
  processedTrends: ChartData[];
  users: User[];
  events: Event[];
  isLoadingRates: boolean;
  conversionError: string | null;
  preferredCurrency: string;
  isConvertingCurrencies?: boolean; // Making it optional with default in component
}

const MonthlyTrendsChart: React.FC<MonthlyTrendsChartProps> = ({
  processedTrends,
  users,
  events,
  isLoadingRates,
  conversionError,
  preferredCurrency
}) => {
  const { state } = useAppContext();
  const [colorBy, setColorBy] = useState<'event' | 'spender'>('event');
  const [hoverCardPosition, setHoverCardPosition] = useState<HoverCardPosition | null>(null);
  const [hoverExpenses, setHoverExpenses] = useState<TimelineExpense[]>([]);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [isHoveringCard, setIsHoveringCard] = useState(false);
  
  // Effect to update hover card visibility based on active segment
  useEffect(() => {
    if (!activeSegment && !isHoveringCard) {
      // If there's no active segment and not hovering the card,
      // start a short timer to hide the hover card
      // This allows time for the mouse to move to the hover card before hiding
      const timer = setTimeout(() => {
        setShowHoverCard(false);
      }, 300); // Increased delay to give more time to reach the hover card
      
      return () => clearTimeout(timer);
    }
  }, [activeSegment, isHoveringCard]);
  
  // Helper for generating colors
  const getColorForIndex = (index: number, total: number) => {
    // Ensure we don't divide by zero
    const divisor = Math.max(total, 1);
    const hue = (index / divisor) * 360;
    return `hsl(${hue}, 70%, 50%)`;
  };
  
  // Handle mouse enter on a bar segment
  const handleSegmentHover = (
    event: React.MouseEvent, 
    month: ChartData, 
    segment: { id: string; name: string; amount: number; percentage: number }
  ) => {
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    const segmentIdentifier = `${month.month}-${segment.id}`;
    setActiveSegment(segmentIdentifier);

    const parts = month.month.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1] || `${currentYear}`);
    const monthNum = monthNameToNumber(monthName);
    
    const startDate = new Date(year, monthNum, 1);
    const endDate = new Date(year, monthNum + 1, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    let filteredExpensesSource = state.expenses.filter(expense => {
      const expenseDate = expense.date.split('T')[0];
      return expenseDate >= startDateStr && expenseDate <= endDateStr;
    });
    
    if (colorBy === 'event') {
      if (segment.id === 'no-event') {
        filteredExpensesSource = filteredExpensesSource.filter(expense => !expense.eventId);
      } else {
        filteredExpensesSource = filteredExpensesSource.filter(expense => expense.eventId === segment.id);
      }
    } else {
      filteredExpensesSource = filteredExpensesSource.filter(expense => expense.paidBy === segment.id);
    }
    
    // Convert AppContext.Expense[] to the detailed TimelineExpense[] (from src/types)
    const expensesToShow: TimelineExpense[] = filteredExpensesSource.map(expense => {
      const eventForExpense = events.find(e => e.id === expense.eventId);
      const userNamesMap: Record<string, string> = {};

      // Populate userNamesMap for participants
      expense.participants?.forEach(pid => {
        const user = users.find(u => u.id === pid);
        if (user) userNamesMap[pid] = user.name;
      });
      // Ensure paidBy user is in userNamesMap
      if (expense.paidBy && !userNamesMap[expense.paidBy]) {
          const paidByUser = users.find(u => u.id === expense.paidBy);
          if (paidByUser) userNamesMap[expense.paidBy] = paidByUser.name;
      }

      return {
        id: expense.id,
        type: 'expense', // Default type, adjust if settlements are also handled
        date: expense.date, // Keep as string
        title: expense.description, // Use description as title
        amount: expense.amount,
        currency: expense.currency,
        category: expense.category || 'Uncategorized', // This should now work as category is in the Expense interface
        eventName: eventForExpense ? eventForExpense.name : 'N/A',
        eventId: expense.eventId,
        settled: expense.settled,
        paidBy: expense.paidBy,
        participants: expense.participants || [],
        userNames: userNamesMap,
      };
    });
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Default to positioning on the right side of the bar
    let x = targetRect.right + 10; // 10px offset from the bar
    
    // Check if there's enough space on the right, otherwise place on the left
    if (x + 300 > viewportWidth) { // Assuming hover card width of ~300px
      x = targetRect.left - 10; // Position to the left with a small offset
    }
    
    // For vertical positioning, try to center with the mouse pointer
    const y = Math.min(targetRect.top + targetRect.height / 2, viewportHeight - 20);
    
    setHoverExpenses(expensesToShow);
    setHoverCardPosition({
      x,
      y,
      targetRect,
      preferredPlacement: 'side' // Add a hint for preferred placement
    });
    setShowHoverCard(true);
  };
  
  // Helper to convert month name to number (0-11)
  const monthNameToNumber = (month: string): number => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return monthNames.indexOf(month);
  };
  
  // Handle mouse leave
  const handleMouseLeave = (e: React.MouseEvent) => {
    // Clear the active segment only if it's not a click event
    // This prevents the hover card from disappearing when clicking
    if (e.type !== 'click') {
      setActiveSegment(null);
    }
  };
  
  // Handle click on segment to keep hover card visible
  const handleSegmentClick = (e: React.MouseEvent, month: ChartData, segment: { id: string; name: string; amount: number; percentage: number }) => {
    // Prevent the default action and stop propagation
    e.preventDefault();
    e.stopPropagation();
    
    // Keep the hover card visible
    const segmentIdentifier = `${month.month}-${segment.id}`;
    setActiveSegment(segmentIdentifier);
    
    // Ensure we're showing the hover card
    if (!showHoverCard) {
      handleSegmentHover(e, month, segment);
    }
  };
  
  // Handle hover card close
  const handleHoverCardClose = () => {
    setShowHoverCard(false);
    setActiveSegment(null);
  };
  
  if (isLoadingRates) {
    return (
      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Monthly Expense Trends</h2>
        </div>
        <div className={styles.chartLoading}>
          <div className={styles.loadingIndicator}>Loading exchange rates...</div>
        </div>
      </div>
    );
  }

  // Calculate max amount for proper scaling, ensure we handle NaN values
  const validAmounts = processedTrends.map(m => isNaN(m.amount) ? 0 : m.amount);
  const maxAmount = Math.max(...validAmounts, 1);
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  
  // Get current date for comparing with future months
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  // Create bar chart elements
  const renderBarChart = () => {
    return processedTrends.map((month, index) => {
      // Handle NaN values
      const safeAmount = isNaN(month.amount) ? 0 : month.amount;
      
      // Parse month string to get month and year
      // Format expected: "Jan 2025"
      const parts = month.month.split(' ');
      const monthName = parts[0];
      const yearStr = parts[1] || `${currentYear}`;
      const year = parseInt(yearStr);
      
      // Get month number from name
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthNum = monthNames.indexOf(monthName);
      
      // Check if month is in the future
      const isFutureMonth = (year > currentYear) || (year === currentYear && monthNum > currentMonth);
      
      // Calculate the height percentage of the bar
      const heightPercentage = safeAmount > 0 ? Math.max(5, (safeAmount / maxAmount) * 100) : 0;
      
      // Get the breakdown data based on selected coloring option
      const breakdown = colorBy === 'event' ? month.byEvent : month.byPayer;
      
      // For zero or empty data, show a minimal placeholder
      if (!breakdown || breakdown.length === 0 || safeAmount === 0) {
        return (
          <div className={styles.barGroup} key={index}>
            <div 
              className={styles.bar} 
              style={{ 
                height: safeAmount > 0 ? `${heightPercentage}%` : '1px',
                backgroundColor: isFutureMonth ? '#e0e0e0' : (safeAmount > 0 ? 'var(--primary-color)' : '#e0e0e0'),
                border: safeAmount === 0 ? '1px dashed #aaa' : 'none',
                opacity: isFutureMonth ? 0.5 : (safeAmount > 0 ? 1 : 0.3),
                marginTop: 'auto', 
                minHeight: safeAmount > 0 ? '4px' : '1px'
              }}
              title={`${currencySymbol}${safeAmount.toFixed(2)} (${month.count} expenses)${isFutureMonth ? ' - Future month' : ''}`}
            />
            <div className={styles.barLabel}>{monthName}</div>
            <div className={styles.barValue}>
              {currencySymbol}{safeAmount.toFixed(0)}
            </div>
          </div>
        );
      }
      
      // Otherwise show a stacked bar with segments
      return (
        <div className={styles.barGroup} key={index}>
          <div 
            className={styles.stackedBar}
            style={{ 
              height: `${heightPercentage}%`,
              minHeight: safeAmount > 0 ? '4px' : '1px',
              opacity: isFutureMonth ? 0.5 : 1,
              marginTop: 'auto'
            }}
            title={`${currencySymbol}${safeAmount.toFixed(2)} (${month.count} expenses)${isFutureMonth ? ' - Future month' : ''}`}
          >
            {breakdown.map((segment, segIndex) => {
              const colorIndex = colorBy === 'event' 
                ? (segment.id === 'no-event' ? events.length : events.findIndex(e => e.id === segment.id))
                // Ensure users array is not empty before finding index
                : (users.length > 0 ? users.findIndex(u => u.id === segment.id) : -1);
              
              return (
                <div 
                  key={segIndex}
                  className={styles.barSegment}
                  style={{ 
                    height: `${segment.percentage}%`,
                    backgroundColor: getColorForIndex(
                      colorIndex >= 0 ? colorIndex : segIndex, 
                      colorBy === 'event' ? Math.max(events.length + 1, 1) : Math.max(users.length, 1)
                    )
                  }}
                  title={`${segment.name}: ${currencySymbol}${segment.amount.toFixed(2)} (${segment.percentage.toFixed(1)}%)`}
                  onMouseEnter={(e) => handleSegmentHover(e, month, segment)}
                  onMouseLeave={handleMouseLeave}
                  onClick={(e) => handleSegmentClick(e, month, segment)}
                />
              );
            })}
          </div>
          <div className={styles.barLabel}>{monthName}</div>
          <div className={styles.barValue}>
            {currencySymbol}{safeAmount.toFixed(0)}
          </div>
        </div>
      );
    });
  };

  // Calculate total, handling NaN values
  const total = processedTrends.reduce((sum, month) => {
    const safeAmount = isNaN(month.amount) ? 0 : month.amount;
    return sum + safeAmount;
  }, 0);

  // Enhanced custom toggle style with better contrast
  const toggleButtonStyle = (isActive: boolean) => {
    return {
      backgroundColor: isActive ? '#1a56db' : '#f9fafb', // Darker blue for active state
      color: isActive ? '#ffffff' : '#374151', // White text on active, dark gray on inactive
      fontWeight: isActive ? 'bold' : '500', // Bold for active, medium for inactive
      textShadow: isActive ? 'none' : 'none', // Remove text shadow
      border: isActive ? '1px solid #1a56db' : '1px solid #e5e7eb', // Add border to active state
      padding: '0.4rem 0.75rem', // Slightly more padding
      boxShadow: isActive ? '0 2px 4px rgba(0,0,0,0.1)' : 'none', // Add subtle shadow to active state
      transition: 'all 0.2s ease', // Smooth transition between states
    };
  };

  return React.createElement(
    'div',
    { className: styles.dashboardCard },
    React.createElement(
      'div',
      { className: styles.cardHeader },
      React.createElement('h2', { className: styles.cardTitle }, 'Monthly Expense Trends'),
      React.createElement(
        'div',
        { className: styles.chartControls },
        React.createElement(
          'div',
          { className: styles.controlGroup },
          React.createElement('label', { className: styles.controlLabel }, 'Color by:'),
          React.createElement(
            'div',
            { className: styles.buttonToggle },
            React.createElement(
              'button',
              {
                className: styles.toggleButton,
                style: toggleButtonStyle(colorBy === 'event'),
                onClick: () => setColorBy('event'),
                'data-testid': 'toggle-event'
              },
              'Event'
            ),
            React.createElement(
              'button',
              {
                className: styles.toggleButton,
                style: toggleButtonStyle(colorBy === 'spender'),
                onClick: () => setColorBy('spender'),
                'data-testid': 'toggle-spender'
              },
              'Spender'
            )
          )
        )
      )
    ),
    conversionError && React.createElement(
      'div',
      {
        className: styles.conversionError,
        style: {
          color: '#e53e3e',
          fontSize: '0.875rem',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#fff5f5',
          borderRadius: '0.25rem',
          border: '1px solid #feb2b2'
        }
      },
      conversionError
    ),
    React.createElement('div', { className: styles.barChart }, renderBarChart()),
    React.createElement(
      'div',
      { className: styles.chartLegend },
      React.createElement(
        'div',
        { className: styles.legendItems },
        colorBy === 'event' && [
          React.createElement(
            'div',
            { className: styles.legendItem, key: 'no-event' },
            React.createElement('span', {
              className: styles.legendColor,
              style: { backgroundColor: getColorForIndex(events.length, events.length + 1) }
            }),
            React.createElement('span', {}, 'No Event')
          ),
          ...events.slice(0, 5).map((event, idx) =>
            React.createElement(
              'div',
              { key: event.id, className: styles.legendItem },
              React.createElement('span', {
                className: styles.legendColor,
                style: { backgroundColor: getColorForIndex(idx, events.length + 1) }
              }),
              React.createElement('span', {}, event.name)
            )
          ),
          events.length > 5 && React.createElement(
            'div',
            { className: styles.legendItem, key: 'more-events' },
            React.createElement('span', {}, `+${events.length - 5} more`)
          )
        ],
        colorBy === 'spender' && users.length > 0 && [
          ...users.slice(0, 7).map((user, idx) =>
            React.createElement(
              'div',
              { key: user.id, className: styles.legendItem },
              React.createElement('span', {
                className: styles.legendColor,
                style: { backgroundColor: getColorForIndex(idx, users.length) }
              }),
              React.createElement('span', {}, user.name)
            )
          ),
          users.length > 7 && React.createElement(
            'div',
            { className: styles.legendItem, key: 'more-users' },
            React.createElement('span', {}, `+${users.length - 7} more`)
          )
        ]
      ),
      React.createElement(
        'div',
        { className: styles.legendTotal },
        React.createElement('span', {}, 'Total:'),
        React.createElement('span', { className: styles.legendValue }, `${currencySymbol}${total.toFixed(2)}`)
      )
    ),
    showHoverCard && hoverCardPosition && React.createElement(HoverCard, {
      position: hoverCardPosition,
      expenses: hoverExpenses,
      onClose: handleHoverCardClose,
      onMouseEnter: () => setIsHoveringCard(true),
      onMouseLeave: () => setIsHoveringCard(false)
    })
  );
};

export default MonthlyTrendsChart;
