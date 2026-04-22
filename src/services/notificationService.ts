import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

// High-fidelity SVG Data URL for the IoT App Icon (Black background, bold white "IoT" text)
// This uses a robust vector format that scales perfectly for system notifications.
const APP_ICON_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiB2aWV3Qm94PSIwIDAgMTkyIDE5MiI+PHJlY3Qgd2lkdGg9IjE5MiIgaGVpZ2h0PSIxOTIiIHJ4PSI0MCIgZmlsbD0iYmxhY2siLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXdlaWdodD0iOTAwIiBmb250LXNpemU9IjcwIiBmaWxsPSJ3aGl0ZSI+SW9UPC90ZXh0Pjwvc3ZnPg==';

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
    if (!('Notification' in window)) {
      console.warn('Notifications not supported in this browser');
      // If we are in Native wrapper but no Notification API exists, assume true for custom native bridges
      return this.isStandalone();
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
          try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && 'pushManager' in registration) {
               // Try to trigger via push manager if available
               await registration.pushManager.getSubscription();
            }
          } catch(e) {}
        }

        // Standard Promise-based API - EXECUTED EVEN IN STANDALONE APKs TO FORCE THE WEBVIEW DIALOG
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
        this.hasPermission = permission === 'granted';
        return this.hasPermission;
      } catch (error) {
        console.error('Error requesting notification permission (Falling back to standalone assumption):', error);
        // If the permission request explicitly crashes (common in strict WebViews without permission delegates),
        // fallback to assuming it works via the SW message bus or custom bridges.
        if (this.isStandalone()) {
           this.hasPermission = true;
           return true; 
        }
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
      container.style.cssText = 'position:fixed;top:12px;left:0;right:0;z-index:999999;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none;padding:0 12px;';
      document.body.appendChild(container);
    }

    // Create the toast (iOS Notification Style)
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: relative;
      background: rgba(241, 245, 249, 0.85);
      -webkit-backdrop-filter: blur(40px) saturate(220%);
      backdrop-filter: blur(40px) saturate(220%);
      border-radius: 26px;
      padding: 16px 18px;
      box-shadow: 
        0 8px 32px rgba(15, 23, 42, 0.12), 
        0 1px 4px rgba(15, 23, 42, 0.05), 
        inset 0 0 0 1px rgba(255, 255, 255, 0.6);
      display: flex;
      align-items: flex-start;
      gap: 14px;
      width: 100%;
      max-width: 380px;
      transform: translateY(-120px) scale(0.9);
      opacity: 0;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
      pointer-events: auto;
      user-select: none;
      cursor: grab;
      touch-action: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;
    
    // Icon (iOS Style App Icon)
    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = 'width: 44px; height: 44px; background: #0f172a; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 2px 8px rgba(15,23,42,0.2), inset 0 0 0 1px rgba(255,255,255,0.1); margin-top: 2px;';
    iconContainer.innerHTML = `
      <span style="color:white; font-size: 15px; font-weight: 900; letter-spacing: -0.5px;">IoT</span>
    `;

    const contentEl = document.createElement('div');
    contentEl.style.cssText = 'display: flex; flex-direction: column; flex: 1;';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;';
    headerRow.innerHTML = `
      <span style="font-size: 13px; font-weight: 700; color: #3b82f6; letter-spacing: -0.2px;">IOT APP</span>
      <span style="font-size: 13px; font-weight: 500; color: #94a3b8;">now</span>
    `;

    const titleEl = document.createElement('div');
    titleEl.style.cssText = 'font-weight: 700; font-size: 15px; letter-spacing: -0.2px; line-height: 1.3; color: #0f172a; margin-bottom: 2px;';
    titleEl.innerText = title;

    const bodyEl = document.createElement('div');
    bodyEl.style.cssText = 'font-size: 15px; font-weight: 500; color: #475569; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;';
    bodyEl.innerText = body;

    contentEl.appendChild(headerRow);
    contentEl.appendChild(titleEl);
    contentEl.appendChild(bodyEl);
    toast.appendChild(iconContainer);
    toast.appendChild(contentEl);
    container.appendChild(toast);

    // Swipe / Dismissal Logic (Swipe Up)
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      toast.style.transition = 'none';
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY - startY;
      if (currentY < 0) { // Only allow swiping up
        toast.style.transform = `translateY(${currentY}px) scale(1)`;
        toast.style.opacity = `${1 - (Math.abs(currentY) / 200)}`;
      }
    };

    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      toast.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
      
      if (currentY < -40) {
        removeToast('up');
      } else {
        toast.style.transform = 'translateY(0) scale(1)';
        toast.style.opacity = '1';
        currentY = 0;
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
    const removeToast = (direction: 'auto' | 'up' = 'auto') => {
      toast.style.transform = `translateY(${direction === 'up' ? '-150px' : '-100px'}) scale(0.9)`;
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
      if (Math.abs(currentY) > 10) return; // Ignore clicks if dragging
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
        if (registration) {
          // Force permission check directly before SW trigger if missing
          if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
             await this.requestPermission();
          }

          let handledViaSW = false;

          // Strategy A: Message Bus Bypass (Extremely reliable for wrapped WebViews)
          if (registration.active) {
            registration.active.postMessage({
              type: 'SHOW_NOTIFICATION',
              title: options.title,
              options: swOptions
            });
            handledViaSW = true;
          }

          // Strategy B: Standard Registration Call
          if ('showNotification' in registration) {
            // Some strict browsers crash here if permissions were stealth-blocked
            await registration.showNotification(options.title, swOptions).catch(e => console.warn('showNotification failed:', e));
            handledViaSW = true;
          }

          if (handledViaSW) {
            return; // Exit successfully if SW handled it
          }
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
      if (alerts.length === 0) return;

      // Group alerts by type to provide a clean summary
      const inactive = alerts.filter(a => a.type === 'inactive');
      const expired = alerts.filter(a => a.type === 'expired');
      const expiring = alerts.filter(a => a.type === 'expiring');

      const totalAlerts = alerts.length;

      // If we have multiple alerts, just show ONE summary toast to avoid clutter
      if (totalAlerts > 1) {
        let summaryBody = '';
        if (expired.length > 0) summaryBody += `${expired.length} expired, `;
        if (inactive.length > 0) summaryBody += `${inactive.length} inactive, `;
        if (expiring.length > 0) summaryBody += `${expiring.length} expiring soon`;
        summaryBody = summaryBody.replace(/, $/, '');

        this.notify({
          title: 'Device Maintenance Required',
          body: `You have ${totalAlerts} devices that require attention: ${summaryBody}.`,
          tag: 'summary-alert'
        });
      } else if (totalAlerts === 1) {
        // Single alert path
        const alert = alerts[0];
        let title = 'Device Alert';
        let body = '';

        if (alert.type === 'inactive') {
          title = 'Activation Required';
          body = `Device "${alert.deviceName}" needs a subscription to start transmitting.`;
        } else if (alert.type === 'expired') {
          title = 'Device Expired';
          body = `Your device "${alert.deviceName}" has expired and needs renewal.`;
        } else if (alert.type === 'expiring') {
          title = 'Expiring Soon';
          body = `Your device "${alert.deviceName}" expires on ${alert.date.toLocaleDateString()}.`;
        }

        this.notify({
          title,
          body,
          tag: `${alert.type}-${alert.deviceId}`
        });
      }
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

  public dismissAllAlerts(alertIds: string[]) {
    const dismissed = this.getDismissedAlerts();
    let updated = false;
    
    alertIds.forEach(id => {
      if (!dismissed.includes(id)) {
        dismissed.push(id);
        updated = true;
      }
    });

    if (updated) {
      localStorage.setItem('dismissed_alerts', JSON.stringify(dismissed));
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
