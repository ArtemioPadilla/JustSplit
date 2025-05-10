import React from 'react';
import styles from './ProgressBar.module.css';

type ProgressBarProps = {
  /**
   * The value of the progress bar (0-100)
   */
  value: number;
  /**
   * The variant/color of the progress bar
   */
  variant?: 'success' | 'info' | 'warning' | 'danger';
  /**
   * The height of the progress bar in pixels
   */
  height?: number;
  /**
   * Show percentage text inside the bar
   */
  showPercentage?: boolean;
};

/**
 * A customizable progress bar component that visualizes percentages
 */
const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  variant = 'info',
  height = 10,
  showPercentage = true
}) => {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.min(Math.max(0, value), 100);
  
  return (
    <div 
      className={styles.progressContainer}
      style={{ height: `${height}px` }}
    >
      <div 
        className={`${styles.progressBar} ${styles[variant]}`}
        style={{ width: `${normalizedValue}%` }}
      >
        {showPercentage && normalizedValue >= 10 && (
          <span className={styles.progressText}>
            {Math.round(normalizedValue)}%
          </span>
        )}
      </div>
      {showPercentage && normalizedValue < 10 && (
        <span className={styles.externalProgressText}>
          {Math.round(normalizedValue)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;