import { useState } from 'react';
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
}


export default function MonthlyTrendsChart({ 
  processedTrends, 
  users, 
  events,
  isLoadingRates,
  conversionError,
  preferredCurrency
}: MonthlyTrendsChartProps) {
  const [colorBy, setColorBy] = useState<'event' | 'spender'>('event');
  const [isConvertingCurrencies, setIsConvertingCurrencies] = useState(true);
  
  // Helper for generating colors
  const getColorForIndex = (index: number, total: number) => {
    const hue = (index / total) * 360;
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

  // Calculate max amount for proper scaling
  const maxAmount = Math.max(...processedTrends.map(m => m.amount), 1);
  const currencySymbol = getCurrencySymbol(preferredCurrency);
  
  return (
    <div className={styles.dashboardCard}>
      <div className={styles.cardHeader}>
        <h2 className={styles.cardTitle}>Monthly Expense Trends</h2>
        <div className={styles.chartControls}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel}>Color by:</label>
            <div className={styles.buttonToggle}>
              <button 
                className={`${styles.toggleButton} ${colorBy === 'event' ? styles.toggleActive : ''}`}
                onClick={() => setColorBy('event')}
              >
                Event
              </button>
              <button 
                className={`${styles.toggleButton} ${colorBy === 'spender' ? styles.toggleActive : ''}`}
                onClick={() => setColorBy('spender')}
              >
                Spender
              </button>
            </div>
          </div>
          <div className={styles.controlGroup}>
            <label className={styles.switchControl}>
              <input
                type="checkbox"
                checked={isConvertingCurrencies}
                onChange={() => setIsConvertingCurrencies(!isConvertingCurrencies)}
              />
              <span className={styles.switchLabel}>Convert currencies</span>
            </label>
          </div>
        </div>
      </div>
      
      {conversionError && (
        <div className={styles.conversionError}>{conversionError}</div>
      )}
      
      <div className={styles.barChart}>
        {processedTrends.map((month, index) => {
          // Calculate the height percentage of the bar (as percentage of the chart height)
          const heightPercentage = maxAmount > 0 ? Math.max(1, (month.amount / maxAmount) * 100) : 0;
          
          // Get the breakdown data based on selected coloring option
          const breakdown = colorBy === 'event' ? month.byEvent : month.byPayer;
          
          // If there's no data, show a simple bar
          if (!breakdown || breakdown.length === 0 || month.amount === 0) {
            return (
              <div className={styles.barGroup} key={index}>
                <div className={styles.bar} 
                  style={{ 
                    height: `${heightPercentage}%`,
                    backgroundColor: month.amount > 0 ? 'var(--primary-color)' : '#e0e0e0',
                    border: month.amount === 0 ? '1px dashed #aaa' : 'none'
                  }}
                  title={`${currencySymbol}${month.amount.toFixed(2)} (${month.count} expenses)`}
                ></div>
                <div className={styles.barLabel}>{month.month}</div>
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
                  // Fix issue with zero height bars
                  minHeight: month.amount > 0 ? '4px' : '0'
                }}
                title={`${currencySymbol}${month.amount.toFixed(2)} (${month.count} expenses)`}
              >
                {breakdown.map((segment, segIndex) => {
                  // Calculate segment height as a percentage of the total bar
                  const segmentHeight = segment.percentage; // We use the precomputed percentage directly
                  return (
                    <div 
                      key={segIndex}
                      className={styles.barSegment}
                      style={{ 
                        height: `${segmentHeight}%`,
                        backgroundColor: getColorForIndex(
                          segIndex, 
                          colorBy === 'event' ? events.length + 1 : users.length
                        )
                      }}
                      title={`${segment.name}: ${currencySymbol}${segment.amount.toFixed(2)} (${segment.percentage.toFixed(1)}%)`}
                    ></div>
                  );
                })}
              </div>
              <div className={styles.barLabel}>{month.month}</div>
              {/* Show amount below each bar */}
              <div className={styles.barValue}>
                {currencySymbol}{month.amount.toFixed(0)}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className={styles.chartLegend}>
        <div className={styles.legendItems}>
          {colorBy === 'event' && (
            <>
              <div className={styles.legendItem}>
                <span 
                  className={styles.legendColor}
                  style={{ backgroundColor: getColorForIndex(events.length, events.length + 1) }}
                ></span>
                <span>No Event</span>
              </div>
              {events.slice(0, 5).map((event, idx) => (
                <div key={event.id} className={styles.legendItem}>
                  <span 
                    className={styles.legendColor}
                    style={{ backgroundColor: getColorForIndex(idx, events.length + 1) }}
                  ></span>
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
                  ></span>
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
            {currencySymbol}{processedTrends.reduce((sum, month) => sum + month.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
