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
      const devicesRef = collection(db, 'devices');
      const q = query(devicesRef, where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);

      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(now.getDate() + 3);

      querySnapshot.forEach((doc) => {
        const device = doc.data();
        let expirationDate: Date;

        if (device.expirationDate?.toDate) {
          expirationDate = device.expirationDate.toDate();
        } else if (device.expirationDate?.seconds) {
          expirationDate = new Date(device.expirationDate.seconds * 1000);
        } else {
          expirationDate = new Date(device.expirationDate);
        }
        
        if (expirationDate < now) {
          if (device.subscriptionStatus !== 'expired') {
            // This should probably be handled by a cloud function to sync status,
            // but we can at least notify the user here.
            this.notify({
              title: 'Device Expired',
              body: `Your device "${device.name}" has expired. Please renew your subscription.`,
              tag: `expired-${doc.id}`
            });
          }
        } else if (expirationDate < threeDaysFromNow) {
          this.notify({
            title: 'Subscription Expiring Soon',
            body: `Your device "${device.name}" will expire on ${expirationDate.toLocaleDateString()}.`,
            tag: `expiring-${doc.id}`
          });
        }
      });
    } catch (error) {
      console.error('Error checking device expirations:', error);
    }
  }
}

export const notificationService = new NotificationService();
