import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

// Custom SVG Data URL matching the app's "IoT" logo
const APP_ICON_URL = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjUxMiIgaGVpZ2h0PSI1MTIiIHp4PSI4MCIgZmlsbD0iYmxhY2siLz48dGV4dCB4PSIyNTYiIHk9IjI3NSIgZm9udC1mYW1pbHk9InN5c3RlbS11aSwgc2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9IjkwMCIgZm9udC1zaXplPSIyNDAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj5Jb1Q8L3RleHQ+PC9zdmc+`;

class NotificationService {
  private hasPermission: boolean = false;

  constructor() {
    this.checkPermission();
  }

  private isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 1. Check for explicit PWA standalone mode (Standard)
    const nav = window.navigator as any;
    const isPWA = (window as any).matchMedia && (window as any).matchMedia('(display-mode: standalone)').matches;
    const isStandaloneNav = nav.standalone;
    
    // 2. Check for Native Bridges & Flags (WebToNative, GoNative, etc)
    const hasNativeBridge = !!((window as any).WTN || (window as any).JSBridge || (window as any).Android || 
                             ((window as any).webkit && (window as any).webkit.messageHandlers));
    const isNativeAppFlag = (window as any).isNativeApp === true || (window as any).isNative === true;
    
    // 3. Advanced UserAgent Sniffing for WebViews
    // 'wv' is a common marker for Android WebViews.
    const ua = navigator.userAgent || '';
    const isWebView = /WebToNative|WebView|wv|Android.*Version\/[.0-9]+|iPhone.*AppleWebKit.*(?!.*Safari)/i.test(ua);
    
    // 4. If we are in the AI Studio preview environment (iframe), we are NOT standalone
    const inIframe = window.self !== window.top;
    const isAISPreview = window.location.hostname.includes('europe-west2.run.app') || 
                        window.location.hostname.includes('localhost');
    
    if (inIframe && isAISPreview) return false;

    // 5. If we are in a production domain and on mobile, and NOT in a standard Safari/Chrome browser wrapper, 
    // we are likely in an APK or high-level WebView.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
    const isProduction = !isAISPreview;
    const isStandardBrowser = /Safari|Chrome|Firefox/i.test(ua) && !/wv|WebView/i.test(ua);

    return !!(isPWA || isStandaloneNav || hasNativeBridge || isNativeAppFlag || isWebView || (isProduction && isMobile && !isStandardBrowser));
  }

  private async checkPermission() {
    if (this.isStandalone()) {
      this.hasPermission = true; // Assume granted in native wrapper environment
      return;
    }

    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notification');
      return;
    }
    this.hasPermission = Notification.permission === 'granted';
  }

  public async requestPermission(): Promise<boolean> {
    // If in a native wrapper/standalone app, permissions are usually handled by the APK shell
    if (this.isStandalone()) return true;

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
        
        // Some mobile browsers require service worker interaction for permissions
        if ('serviceWorker' in navigator && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && 'pushManager' in registration) {
             // Try to trigger via push manager if available
             await registration.pushManager.getSubscription();
          }
        }

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

  public getPermissionStatus(): 'unsupported' | 'granted' | 'denied' | 'default' | 'pwa-required' {
    const standalone = this.isStandalone();

    // 1. If we are in an APK/Standalone app, bypass browser checks
    if (standalone) {
      if ('Notification' in window) {
        return Notification.permission as any;
      }
      return 'granted';
    }

    // 2. Browser-specific checks
    if (!('Notification' in window)) {
      // Check if it's a mobile device (iOS/Android browsers usually need PWA mode)
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) return 'pwa-required';
      return 'unsupported';
    }
    
    return Notification.permission as any;
  }

  public async notify(options: NotificationOptions) {
    // 0. Trigger immediate vibration (restored as requested)
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    const standalone = this.isStandalone();
    
    // 1. Try Native Bridges (WebToNative, etc)
    const nativeApp = (window as any).WTN || (window as any).TN || (window as any).JSBridge || (window as any).Android;
    if (nativeApp) {
       const method = nativeApp.showNotification || nativeApp.localNotification || nativeApp.pushNotification || nativeApp.notify;
       if (typeof method === 'function') {
         try {
           method.call(nativeApp, options.title, options.body);
           return; 
         } catch (e) {
           console.warn('Native bridge failed:', e);
         }
       }
    }

    const notificationOptions: any = {
      body: options.body,
      icon: options.icon || APP_ICON_URL,
      tag: options.tag || 'iot-connect-default',
      badge: APP_ICON_URL,
      vibrate: [200, 100, 200],
      silent: false, // Ensure sound
      renotify: true, // Ensure vibration on repeat
      requireInteraction: true 
    };

    // 2. Try Service Worker (Recommended for Android/APK)
    if ('serviceWorker' in navigator) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) registration = await navigator.serviceWorker.ready;
        
        if (registration && 'showNotification' in registration) {
          await (registration as any).showNotification(options.title, notificationOptions);
          return;
        }
      } catch (swError) {
        console.warn('SW notification failed:', swError);
      }
    }

    // 3. Fallback to standard Browser Notification API
    if (!('Notification' in window)) {
      console.error('Notification API not found.');
      return;
    }

    // Bypass permission check for standalone
    if (!standalone && Notification.permission !== 'granted') {
      if (Notification.permission === 'default') {
        const granted = await this.requestPermission();
        if (!granted) return;
      } else {
        return;
      }
    }

    try {
      const n = new Notification(options.title, notificationOptions);
      n.onclick = () => { window.focus(); n.close(); };
    } catch (error) {
      console.error('Notification delivery failed:', error);
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
