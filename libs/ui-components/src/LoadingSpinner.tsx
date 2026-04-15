import React from 'react';
import styles from './LoadingSpinner.module.css';

export interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  color = '#4f46e5'
}) => {
  return (
    <div className={`${styles.spinner} ${styles[size]}`}>
      <div className={styles.circle} style={{ borderTopColor: color }} />
    </div>
  );
};