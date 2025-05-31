'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification, { NotificationType } from '../components/ui/Notification';

interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (message: string, type: NotificationType, duration?: number) => string;
  hideNotification: (id: string) => void;
}

// Create a dummy implementation for the default context
const defaultShowNotification = (message: string, type: NotificationType, duration?: number) => {
  console.log('Notification outside provider:', message, type, duration);
  return 'dummy-id';
};

const NotificationContext = createContext<NotificationContextType>({
  showNotification: defaultShowNotification,
  hideNotification: () => {},
});

export const useNotification = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType, duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    
    setNotifications(prev => [...prev, {
      id,
      message,
      type,
      duration
    }]);
    
    return id;
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);
  
  // Use React.useMemo to prevent context value from changing on every render
  const contextValue = React.useMemo(() => ({
    showNotification,
    hideNotification
  }), [showNotification, hideNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={() => hideNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// Export both the provider and the hook
const NotificationModule = {
  Provider: NotificationProvider,
  useNotification
};

export default NotificationModule;
