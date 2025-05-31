'use client';

import { useState, useEffect } from 'react';
import styles from './styles.module.css';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationProps {
  message: string;
  type: NotificationType;
  duration?: number;
  onClose?: () => void;
  isVisible?: boolean;
}

const Notification: React.FC<NotificationProps> = ({
  message,
  type,
  duration = 3000,
  onClose,
  isVisible = true,
}) => {
  const [visible, setVisible] = useState(isVisible);

  useEffect(() => {
    setVisible(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div 
      className={`${styles.notification} ${styles[type]} ${visible ? styles.visible : ''}`}
      role="alert"
    >
      <div className={styles.message}>{message}</div>
      <button 
        className={styles.closeButton} 
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
