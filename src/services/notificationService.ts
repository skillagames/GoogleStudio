import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

// Custom SVG Data URL matching the app's "IoT" logo (Black rounded square with white bold text)
const APP_ICON_URL = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHJ4PSI4MCIgZmlsbD0iYmxhY2siLz48dGV4dCB4PSIyNTYiIHk9IjI3NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyNDAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5Jb1Q8L3RleHQ+PC9zdmc+`;

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
    if (!('Notification' in window)) {
      console.error('Notification API not found in this browser.');
      return;
    }

    // Standard check before sending
    if (Notification.permission !== 'granted') {
      console.warn('Notification permission state:', Notification.permission);
      if (Notification.permission === 'default') {
        const granted = await this.requestPermission();
        if (!granted) return;
      } else {
        return;
      }
    }

    try {
      console.log('--- NOTIFICATION DEBUG ---');
      console.log('Title:', options.title);
      console.log('Body:', options.body);
      
      const notificationOptions: NotificationOptions & any = {
        body: options.body,
        icon: options.icon || APP_ICON_URL,
        tag: options.tag || 'iot-connect-default',
        badge: APP_ICON_URL,
        vibrate: [200, 100, 200],
        silent: false,
        renotify: true,
        requireInteraction: true 
      };

      // Try Service Worker registration first (more reliable on mobile/standalone)
      let swSuccess = false;
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && 'showNotification' in registration) {
            console.log('Attempting delivery via ServiceWorkerRegistration...');
            await registration.showNotification(options.title, notificationOptions);
            swSuccess = true;
            console.log('SW Notification sent.');
          }
        } catch (swError) {
          console.warn('SW notification failed, falling back:', swError);
        }
      }

      // If SW failed or wasn't available, use the standard constructor
      if (!swSuccess) {
        console.log('Attempting delivery via new Notification() constructor...');
        const n = new Notification(options.title, notificationOptions);
        n.onclick = () => {
          window.focus();
          n.close();
        };
        console.log('Constructor Notification instance created.');
      }
      
      // Also trigger haptic feedback if available (for mobile web)
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

    } catch (error) {
      console.error('CRITICAL NOTIFICATION FAILURE:', error);
    }
  }

  public async checkDeviceExpirations(userId: string) {
    if (!userId) return;

    try {
      const alerts = await this.getAlerts(userId);

      alerts.forEach(alert => {
        if (alert.type === 'inactive') {
          this.notify({
            title: 'Activation Required',
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

  public dismissAlert(alertId: string) {
    const dismissed = this.getDismissedAlerts();
    if (!dismissed.includes(alertId)) {
      dismissed.push(alertId);
      localStorage.setItem('dismissed_alerts', JSON.stringify(dismissed));
      // Notify other parts of the app that alerts have changed
      window.dispatchEvent(new CustomEvent('alerts_updated'));
    }
  }

  public resetAlerts() {
    localStorage.removeItem('dismissed_alerts');
    window.dispatchEvent(new CustomEvent('alerts_updated'));
  }

  private getDismissedAlerts(): string[] {
    try {
      const data = localStorage.getItem('dismissed_alerts');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
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

      const dismissed = this.getDismissedAlerts();
      const alerts: any[] = [];

      querySnapshot.forEach((doc) => {
        const device = { id: doc.id, ...doc.data() } as any;
        const alertId = `${doc.id}-${device.subscriptionStatus === 'inactive' ? 'inactive' : 'expired'}`;
        
        // Skip if this specific type of alert for this device is dismissed
        if (dismissed.includes(alertId)) return;
        
        // Handle Inactive devices first
        if (device.subscriptionStatus === 'inactive') {
          alerts.push({
            id: alertId,
            type: 'inactive',
            deviceId: doc.id,
            deviceName: device.name,
            date: new Date(device.lastUpdated?.seconds * 1000 || Date.now()),
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
            id: alertId,
            type: 'expired',
            deviceId: doc.id,
            deviceName: device.name,
            date: expirationDate,
            message: 'Subscription has expired'
          });
        } else if (expirationDate < threeDaysFromNow) {
          alerts.push({
            id: `${doc.id}-expiring`,
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
