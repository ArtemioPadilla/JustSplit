import React from 'react';
import styles from './styles.module.css';

export interface ProgressBarProps {
  /**
   * The value to display, from 0 to 100
   */
  value: number;
  /**
   * Label to show on the left side
   */
  label?: string;
  /**
   * Value to show on the right side (defaults to percentage)
   */
  valueLabel?: string;
  /**
   * Variant of the progress bar
   */
  variant?: 'default' | 'success' | 'info' | 'warning' | 'danger';
  /**
   * Additional className for the container
   */
  className?: string;
  /**
   * Custom height in pixels
   */
  height?: number;
  /**
   * Whether to show percentage text
   */
  showPercentage?: boolean;
}

/**
 * ProgressBar component for displaying progress or completion percentage
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  label,
  valueLabel,
  variant = 'default',
  className = '',
  height,
  showPercentage = true,
}) => {
  // Ensure value is between 0 and 100
  const safeValue = Math.min(100, Math.max(0, value));
  
  return (
    <div 
      className={`${styles.progressContainer} ${className}`}
      style={height ? { height: `${height}px` } : undefined}
    >
      {(label || (valueLabel !== undefined && showPercentage)) && (
        <div className={styles.progressLabel}>
          {label && <span>{label}</span>}
          {showPercentage && <span>{valueLabel !== undefined ? valueLabel : `${Math.round(safeValue)}%`}</span>}
        </div>
      )}
      <div 
        className={`${styles.progressBar} ${variant !== 'default' ? styles[variant] : ''}`}
      >
        <div 
          className={styles.progressFill} 
          style={{ width: `${safeValue}%` }}
          role="progressbar"
          aria-valuenow={safeValue}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
};

export default ProgressBar;