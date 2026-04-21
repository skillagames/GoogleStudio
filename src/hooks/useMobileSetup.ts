import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Device } from '@capacitor/device';

export const useMobileSetup = () => {
  useEffect(() => {
    const initializeMobile = async () => {
      const info = await Device.getInfo();
      if (info.platform !== 'android' && info.platform !== 'ios') return;

      console.log('Initializing mobile context...');

      // Request/check push notifications
      let permStatus = await PushNotifications.checkPermissions();
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive === 'granted') {
        // Only register if granted
        try {
          await PushNotifications.register();
        } catch (err) {
          console.error('Push registration fail', err);
        }
      }

      // Add listeners for registration errors
      PushNotifications.addListener('registrationError', (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      // Add listener for notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });
    };

    initializeMobile();
  }, []);
};
