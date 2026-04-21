import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

// Use a remote URL for the icon as some WebViews block local/data URLs in notifications
const APP_ICON_URL = 'https://picsum.photos/seed/iot/192/192';

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

  private showForegroundToast(title: string, body: string) {
    if (typeof document === 'undefined') return;

    // Create toast container if it doesn't exist
    let container = document.getElementById('iot-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'iot-toast-container';
      container.style.cssText = 'position:fixed;top:10px;left:0;right:0;z-index:99999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 12px;';
      document.body.appendChild(container);
    }

    // Create the toast (iOS Dynamic Island / Capsule style - LIGHT THEME WITH AMBER ALERT ACCENT)
    const toast = document.createElement('div');
    toast.style.cssText = `
      background: rgba(255, 255, 255, 0.92);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      backdrop-filter: blur(20px) saturate(180%);
      color: #1a1a1a;
      padding: 10px 14px;
      border-radius: 22px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08), 0 0 0 0.5px rgba(244, 63, 94, 0.25);
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      max-width: 360px;
      transform: translateY(-80px) scale(0.95);
      opacity: 0;
      transition: transform 0.6s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.4s ease;
      pointer-events: auto;
      user-select: none;
      cursor: grab;
      touch-action: none;
    `;
    
    // Icon (Improved Modern Logo Style)
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'width: 36px; height: 36px; background: #000; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; font-weight: 900; box-shadow: 0 4px 12px rgba(0,0,0,0.15); position: relative; overflow: hidden;';
    iconContainer.innerHTML = `
      <div style="position:absolute; inset:0; background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 100%);"></div>
      <span style="color:white; letter-spacing: -0.5px; position: relative; z-index: 1;">IoT</span>
    `;

    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'display: flex; flex-direction: column; overflow: hidden; flex: 1;';

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight: 800; font-size: 13.5px; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2; color: #f43f5e;';
    titleEl.innerText = title;

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size: 12.5px; color: #4b5563; font-weight: 500; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;';
    bodyEl.innerText = body;

    contentEl.appendChild(titleEl);
    contentEl.appendChild(bodyEl);
    toast.appendChild(iconContainer);
    toast.appendChild(contentEl);
    container.appendChild(toast);

    // Swipe / Dismissal Logic (Swipe Right)
    let startX = 0;
    let currentX = 0;
    let isDragging = false;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      isDragging = true;
      toast.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentX = e.touches[0].clientX - startX;
      if (currentX > 0) { // Only allow swiping right
        const rotation = Math.min(currentX * 0.03, 10);
        toast.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
        toast.style.opacity = `${1 - (currentX / 400)}`;
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      toast.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
      
      if (currentX > 100) {
        removeToast('right');
      } else {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.opacity = '1';
        currentX = 0;
      }
    };

    toast.addEventListener('touchstart', onTouchStart as any);
    window.addEventListener('touchmove', onTouchMove as any, { passive: false });
    window.addEventListener('touchend', onTouchEnd as any);

    // Animate in
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.opacity = '1';
      }, 50);
    });

    // Auto-remove
    const removeToast = (direction: 'auto' | 'right' = 'auto') => {
      if (direction === 'right') {
        toast.style.transform = `translateX(${window.innerWidth}px) rotate(15deg)`;
      } else {
        toast.style.transform = 'translateY(-100px) scale(0.9)';
      }
      
      toast.style.opacity = '0';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
        window.removeEventListener('touchmove', onTouchMove as any);
        window.removeEventListener('touchend', onTouchEnd as any);
      }, 500);
    };

    const timeoutId = setTimeout(() => removeToast(), 5000);

    // Click to dismiss fallback
    toast.onclick = (e) => {
      if (currentX > 10) return; // Ignore clicks if dragging
      clearTimeout(timeoutId);
      removeToast();
    };
  }

  public async notify(options: NotificationOptions) {
    // 0. Trigger immediate physical feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }

    const standalone = this.isStandalone();
    const isTest = options.tag === 'test-notification';

    // 1. Show in-app toast for Standalone/APK mode OR if it's a test push
    if (standalone || isTest) {
      this.showForegroundToast(options.title, options.body);
    }
    
    // 2. Try Native Bridges (WebToNative, etc)
    const nativeApp = (window as any).WTN || (window as any).TN || (window as any).JSBridge || (window as any).Android;
    const webkit = (window as any).webkit;
    
    if (nativeApp || (webkit && webkit.messageHandlers)) {
       try {
         // WebToNative / Bridge Path
         const method = nativeApp?.showNotification || nativeApp?.localNotification || nativeApp?.notify;
         if (typeof method === 'function') {
           method.call(nativeApp, options.title, options.body);
         } else if (webkit?.messageHandlers?.notification) {
           webkit.messageHandlers.notification.postMessage({ title: options.title, body: options.body });
         }
         
         // Don't return here if we want to also try standard paths for multi-targeting
       } catch (e) {
         console.warn('Native bridge notify failed:', e);
       }
    }

    // Simplified options for mobile/APK compatibility
    const swOptions: any = {
      body: options.body,
      tag: options.tag || 'iot-notif-' + Date.now(),
      vibrate: [200, 100, 200],
      requireInteraction: false
    };

    if (!standalone) {
      swOptions.icon = options.icon || APP_ICON_URL;
      swOptions.badge = APP_ICON_URL;
    }

    // 3. Service Worker Path (Recommended for Android/APK)
    // Chromium on Android explicitly forbids the 'new Notification()' constructor
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && 'showNotification' in registration) {
          await registration.showNotification(options.title, swOptions);
          return; // Exit successfully if SW handled it
        }
      } catch (swError) {
        console.warn('SW notification failed:', swError);
      }
    }

    // 4. Classic Fallback (Avoid on mobile browsers to prevent "Illegal constructor" errors)
    const isMobileBrowser = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    if (typeof Notification !== 'undefined' && !isMobileBrowser) {
      try {
        if (!standalone && (Notification.permission as string) !== 'granted') {
          await this.requestPermission();
          if ((Notification.permission as string) !== 'granted') return;
        }
        
        const fullOptions = {
          ...swOptions,
          icon: options.icon || APP_ICON_URL,
          silent: false,
          renotify: true
        };
        
        // This is where the "Illegal constructor" error usually happens
        new Notification(options.title, fullOptions);
      } catch (error) {
        console.warn('Classic Notification constructor failed (expected on some mobile browsers):', error);
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
