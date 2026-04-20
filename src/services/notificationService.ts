import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

class NotificationService {
  private hasPermission: boolean = false;

  constructor() {
    this.checkPermission();
  }

  private async checkPermission() {
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }
    this.hasPermission = Notification.permission === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      return false;
    }
    
    // Check if we are in an iframe
    const inIframe = window.self !== window.top;
    if (inIframe) {
      console.warn('App is running in an iframe. Browser notifications may be blocked by security policies. Consider opening the app in a new tab for testing.');
    }

    if (Notification.permission === 'denied') {
      console.error('Notification permission already denied. User must reset preferences in browser settings.');
      return false;
    }
    
    if (Notification.permission === 'default') {
      try {
        console.log('Requesting notification permission via user gesture...');
        // Standard Promise-based API
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    
    this.hasPermission = Notification.permission === 'granted';
    return this.hasPermission;
  }

  public getPermissionStatus(): 'unsupported' | 'granted' | 'denied' | 'default' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as any;
  }

  public async notify(options: NotificationOptions) {
    if (!('Notification' in window)) return;

    // Standard check before sending
    if (Notification.permission !== 'granted') {
      // Force request if it hasn't been denied yet
      if (Notification.permission === 'default') {
        const granted = await this.requestPermission();
        if (!granted) return;
      } else {
        console.warn('Notification permission is denied. Cannot send notification.');
        return;
      }
    }

    try {
      console.log('Attempting to deliver notification:', options.title);
      
      // In mobile/standalone mode, service worker registration is preferred for reliability
      let registration = null;
      if ('serviceWorker' in navigator) {
        try {
          registration = await navigator.serviceWorker.getRegistration();
        } catch (swError) {
          console.warn('Could not retrieve service worker registration:', swError);
        }
      }

      const notificationOptions = {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        badge: '/favicon.ico',
        vibrate: [200, 100, 200],
        requireInteraction: false // Set to true if you want the notification to stay until user clicks
      };

      if (registration && 'showNotification' in registration) {
        await registration.showNotification(options.title, notificationOptions);
      } else {
        new Notification(options.title, notificationOptions);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
      // Fallback for debugging in restricted environments
      if (window.self !== window.top) {
        console.info('NOTIFICATION FALLBACK (Iframe):', options.title, options.body);
      }
    }
  }

  public async checkDeviceExpirations(userId: string) {
    if (!userId) return;

    try {
      const alerts = await this.getAlerts(userId);

      alerts.forEach(alert => {
        if (alert.type === 'inactive') {
          this.notify({
            title: 'Provisioning Required',
            body: `Device "${alert.deviceName}" needs an active subscription to start transmitting data.`,
            tag: `inactive-${alert.deviceId}`
          });
        } else if (alert.type === 'expired') {
          this.notify({
            title: 'Device Expired',
            body: `Your device "${alert.deviceName}" has expired. Please renew your subscription.`,
            tag: `expired-${alert.deviceId}`
          });
        } else if (alert.type === 'expiring') {
          this.notify({
            title: 'Subscription Expiring Soon',
            body: `Your device "${alert.deviceName}" will expire on ${alert.date.toLocaleDateString()}.`,
            tag: `expiring-${alert.deviceId}`
          });
        }
      });
    } catch (error) {
      console.error('Error checking device expirations:', error);
    }
  }

  public async getAlerts(userId: string) {
    if (!userId) return [];

    try {
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      const alerts: any[] = [];

      querySnapshot.forEach((doc) => {
        const device = { id: doc.id, ...doc.data() } as any;
        
        // Handle Inactive devices first
        if (device.subscriptionStatus === 'inactive') {
          alerts.push({
            type: 'inactive',
            deviceId: doc.id,
            deviceName: device.name,
            date: new Date(device.lastUpdated?.seconds * 1000 || Date.now()), // Use last updated as fallback for sorting
            message: 'Needs active subscription'
          });
          return;
        }

        let expirationDate: Date;
        if (!device.expirationDate) return;

        if (device.expirationDate?.toDate) {
          expirationDate = device.expirationDate.toDate();
        } else if (device.expirationDate?.seconds) {
          expirationDate = new Date(device.expirationDate.seconds * 1000);
        } else {
          expirationDate = new Date(device.expirationDate);
        }

        if (expirationDate < now) {
          alerts.push({
            type: 'expired',
            deviceId: doc.id,
            deviceName: device.name,
            date: expirationDate,
            message: 'Subscription has expired'
          });
        } else if (expirationDate < threeDaysFromNow) {
          alerts.push({
            type: 'expiring',
            deviceId: doc.id,
            deviceName: device.name,
            date: expirationDate,
            message: 'Subscription expiring soon'
          });
        }
      });

      return alerts.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }
}

export const notificationService = new NotificationService();
