import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { notificationService } from './services/notificationService';
import { auth } from './lib/firebase';

// Global Bridge for Native Wrappers (WebToNative, GoNative, JSBridge etc)
(window as any).__NATIVE_BRIDGE__ = {
  setToken: async (token: string) => {
    if (!token || typeof token !== 'string') return;
    
    // Check if we've already synced this exact token to avoid redundant DB writes
    if (localStorage.getItem('last_synced_native_token') === token) return;
    
    if (token.length < 100) {
      console.log('[NativeBridge] Ignoring short token (likely OneSignal ID):', token);
      return;
    }

    console.log('[NativeBridge] Pulse Received from APK:', token.substring(0, 10) + '...');
    const user = auth.currentUser;
    if (user) {
      const success = await notificationService.updateFCMToken(user.uid, token);
      if (success) localStorage.setItem('last_synced_native_token', token);
    } else {
      localStorage.setItem('pending_native_token', token);
    }
  }
};

// Auto-scan for tokens if the wrapper already has them available
const scanForNativeToken = async () => {
  try {
    const w = window as any;
    
    // Global callbacks for standard Android/iOS WebToNative & GoNative injection
    const asyncCallback = (payload: string | object) => {
      try {
        let tokenStr = '';
        if (typeof payload === 'string') {
          if (payload.startsWith('{')) {
            const obj = JSON.parse(payload);
            tokenStr = obj.token || obj.registrationToken || obj.fcmToken || obj.oneSignalId || payload;
          } else {
            tokenStr = payload;
          }
        } else if (typeof payload === 'object' && payload !== null) {
          tokenStr = (payload as any).token || (payload as any).registrationToken || (payload as any).fcmToken || (payload as any).oneSignalId;
        }
        
        if (tokenStr && typeof tokenStr === 'string' && tokenStr.length > 5 && tokenStr !== '[object Object]') {
          w.__NATIVE_BRIDGE__.setToken(tokenStr);
        }
      } catch(e){}
    };
    
    w.onRegistrationToken = asyncCallback;
    w.returnRegistrationToken = asyncCallback;
    w.setRegistrationToken = asyncCallback;
    w.getRegistrationToken = asyncCallback;
    w.receivePushToken = asyncCallback;
    
    // Try WebToNativeInterface (Android JS Interface)
    if (w.WebToNativeInterface) {
       let w2n = w.WebToNativeInterface;
       try { 
         let r1 = w2n.requestNotificationPermission?.(); 
         if (r1) asyncCallback(r1);
       } catch(e){}
       
       try { 
         let t = w2n.getRegistrationToken ? w2n.getRegistrationToken() : null;
         if (t) asyncCallback(t);
       } catch(e){}
       
       try { 
         let r2 = w2n.registerNotification?.(); 
         if (r2) asyncCallback(r2);
       } catch(e){}
       
       try { w2n.registerNotification?.('onRegistrationToken'); } catch(e){}
       try { w2n.getRegistrationToken?.('onRegistrationToken'); } catch(e){}
    }

    // Specifically targeting the 'w2n' signature found in the UserAgent
    const bridge = w.w2n || w.webToNative || w.WTN;
    
    if (bridge && bridge.push && typeof bridge.push.getToken === 'function') {
      bridge.push.getToken((res: any) => {
        const token = res?.token || res;
        if (token && typeof token === 'string') {
          (window as any).__NATIVE_BRIDGE__.setToken(token);
        }
      });
    } else {
      // Fallback brute force for other wrappers
      const altToken = w.Native?.getFcmToken?.() || w.AppInterface?.getToken?.() || w.Android?.getFcmToken?.();
      if (altToken) (window as any).__NATIVE_BRIDGE__.setToken(altToken);
    }
  } catch (e) {}
};

// Check frequently for the first 60 seconds
let scanAttempts = 0;
const tokenScanInterval = setInterval(() => {
  scanForNativeToken();
  scanAttempts++;
  if (scanAttempts > 60) clearInterval(tokenScanInterval);
}, 1000);

// Register Service Worker for PWA/Notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(registration => {
      console.log('SW registered:', registration);
    }).catch(error => {
      console.warn('SW registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
