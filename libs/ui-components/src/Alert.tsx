import React from 'react';
import styles from './Alert.module.css';

export interface AlertProps {
  children: React.ReactNode;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  type = 'info',
  onClose
}) => {
  return (
    <div className={`${styles.alert} ${styles[type]}`}>
      <div className={styles.content}>{children}</div>
      {onClose && (
        <button className={styles.closeButton} onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};