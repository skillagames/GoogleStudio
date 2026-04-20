import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notificationService';

const NotificationManager: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Small delay to ensure everything is settled
      const timeoutId = setTimeout(() => {
        notificationService.checkDeviceExpirations(user.uid);
      }, 5000);

      // Also set up a periodic check every 6 hours
      const intervalId = setInterval(() => {
        notificationService.checkDeviceExpirations(user.uid);
      }, 6 * 60 * 60 * 1000);

      return () => {
        clearTimeout(timeoutId);
        clearInterval(intervalId);
      };
    }
  }, [user]);

  return null; // This component doesn't render anything
};

export default NotificationManager;
