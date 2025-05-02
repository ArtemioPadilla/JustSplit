import { useState } from 'react';
import { User, Event } from '../../context/AppContext';
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
  // Debugging: Log processedTrends data
  console.log('Processed Trends:', processedTrends);
  
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
          const maxAmount = Math.max(...processedTrends.map(m => m.amount)) || 1;
          
          // Force minimum visible height for bars with values (10px)
          const heightPercentage = month.amount > 0
            ? Math.max(10, (month.amount / maxAmount) * 100)
            : 0;

          // logging: Log month data maximum amount and height percentage
          console.log(`Month: ${month.month}, Max Amount: ${maxAmount}, Height Percentage: ${heightPercentage}`);
          
          // Get the breakdown data based on selected coloring option
          const breakdown = colorBy === 'event' ? month.byEvent : month.byPayer;
          // If there's no data, show a simple bar
          if (!breakdown || breakdown.length === 0) {
            return (
              <div className={styles.barGroup} key={index}>
                {/* Añade este div para debug temporal */}
                <div className={styles.barDebug}>
                  {`${heightPercentage.toFixed(1)}%`}
                </div>
                <div className={styles.bar} 
                  style={{ 
                    height: `${heightPercentage}%`,
                    backgroundColor: month.amount > 0 ? 'var(--primary-color)' : '#e0e0e0',
                    border: month.amount === 0 ? '1px dashed #aaa' : 'none'
                  }}
                  title={`${preferredCurrency} ${month.amount.toFixed(2)} (${month.count} expenses)`}
                ></div>
                <div className={styles.barLabel}>{month.month}</div>
              </div>
            );
          }
          
          // Otherwise show a stacked bar with segments
          return (
            <div className={styles.barGroup} key={index}>
              <div className={styles.barDebug}>
                {`${heightPercentage.toFixed(1)}%`}
              </div>
              <div 
                className={styles.stackedBar}
                style={{ height: `${heightPercentage}%` }}
                title={`${preferredCurrency} ${month.amount.toFixed(2)} (${month.count} expenses)`}
              >
                {breakdown.map((segment, segIndex) => {
                  const segmentHeight = (segment.percentage / 100) * heightPercentage;
                  // logging: Log segment data
                  console.log(`Segment: ${segment.name}, Amount: ${segment.amount}, Percentage: ${segment.percentage}, Height: ${segmentHeight}`);
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
                      title={`${segment.name}: ${preferredCurrency} ${segment.amount.toFixed(2)} (${segment.percentage.toFixed(1)}%)`}
                    ></div>
                  );
                })}
              </div>
              <div className={styles.barLabel}>{month.month}</div>
            </div>
          );
        })}
      </div>
      
      <div className={styles.chartLegend}>
        <div className={styles.legendItems}>
          {colorBy === 'event' && events.length > 0 && (
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
            </>
          )}
        </div>
        <div className={styles.legendTotal}>
          <span>Last 6 Months Total:</span>
          <span className={styles.legendValue}>
            {preferredCurrency} {processedTrends.reduce((sum, month) => sum + month.amount, 0).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
