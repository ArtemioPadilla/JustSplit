'use client';

import NotificationModule from '../../context/NotificationContext';

export default function TestNotificationPage() {
  const { showNotification } = NotificationModule.useNotification();
  
  return (
    <div>
      <h1>Test Notification</h1>
      <button onClick={() => showNotification('This is a test notification', 'info')}>
        Show Notification
      </button>
    </div>
  );
}
