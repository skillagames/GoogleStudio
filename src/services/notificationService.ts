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
    if (!('Notification' in window)) return false;
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }
    
    this.hasPermission = Notification.permission === 'granted';
    return this.hasPermission;
  }

  public async notify(options: NotificationOptions) {
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      // In mobile/standalone mode, service worker registration is preferred
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration && 'showNotification' in registration) {
        registration.showNotification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
        });
      } else {
        new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          tag: options.tag,
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
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
