import React, { useState } from 'react';
import { User, Event } from '../../context/AppContext';
import { getCurrencySymbol } from '../../utils/currencyExchange';
import styles from '../../app/page.module.css';

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
  preferredCurrency,
  isConvertingCurrencies = true // Default value
}) => {
  const [colorBy, setColorBy] = useState<'event' | 'spender'>('event');
  
  // Helper for generating colors
  const getColorForIndex = (index: number, total: number) => {
    // Ensure we don't divide by zero
    const divisor = Math.max(total, 1);
    const hue = (index / divisor) * 360;
    return `hsl(${hue}, 70%, 50%)`;
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
                : users.findIndex(u => u.id === segment.id);
              
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
      backgroundColor: isActive ? 'var(--primary-color)' : '#f9fafb',
      color: isActive ? 'white' : '#374151', // Darker text for inactive state for better contrast
      fontWeight: isActive ? 'bold' : 'normal',
      textShadow: isActive ? '0px 1px 1px rgba(0, 0, 0, 0.2)' : 'none', // Text shadow for better readability
      border: isActive ? 'none' : '1px solid #e5e7eb',
    };
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Monthly Expense Trends</h2>
        <div className={styles.chartControls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Color by:</label>
            <div className={styles.buttonToggle}>
              <button
                className={styles.toggleButton}
                style={toggleButtonStyle(colorBy === 'event')}
                onClick={() => setColorBy('event')}
                data-testid="toggle-event"
              >
                Event
              </button>
              <button
                className={styles.toggleButton}
                style={toggleButtonStyle(colorBy === 'spender')}
                onClick={() => setColorBy('spender')}
                data-testid="toggle-spender"
              >
                Spender
              </button>
            </div>
          </div>
          {/* Currency conversion checkbox removed - now controlled at parent level */}
        </div>
      </div>
      
      {conversionError && (
        <div className={styles.conversionError} style={{ 
          color: '#e53e3e', 
          fontSize: '0.875rem',
          marginBottom: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#fff5f5',
          borderRadius: '0.25rem',
          border: '1px solid #feb2b2'
        }}>
          {conversionError}
        </div>
      )}
      
      <div className={styles.barChart}>
        {renderBarChart()}
      </div>
      
      <div className={styles.chartLegend}>
        <div className={styles.legendItems}>
          {colorBy === 'event' && (
            <>
              <div className={styles.legendItem}>
                <span 
                  className={styles.legendColor}
                  style={{ backgroundColor: getColorForIndex(events.length, events.length + 1) }}
                />
                <span>No Event</span>
              </div>
              {events.slice(0, 5).map((event, idx) => (
                <div key={event.id} className={styles.legendItem}>
                  <span 
                    className={styles.legendColor}
                    style={{ backgroundColor: getColorForIndex(idx, events.length + 1) }}
                  />
                  <span>{event.name}</span>
                </div>
              ))}
              {events.length > 5 && (
                <div className={styles.legendItem}>
                  <span>+{events.length - 5} more</span>
                </div>
              )}
            </>
          )}
          {colorBy === 'spender' && users.length > 0 && (
            <>
              {users.slice(0, 7).map((user, idx) => (
                <div key={user.id} className={styles.legendItem}>
                  <span 
                    className={styles.legendColor}
                    style={{ backgroundColor: getColorForIndex(idx, users.length) }}
                  />
                  <span>{user.name}</span>
                </div>
              ))}
              {users.length > 7 && (
                <div className={styles.legendItem}>
                  <span>+{users.length - 7} more</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className={styles.legendTotal}>
          <span>Last 6 Months Total:</span>
          <span className={styles.legendValue}>
            {currencySymbol}{total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTrendsChart;
