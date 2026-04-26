import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Calendar, LogOut, Terminal, Database, RefreshCw, CheckCircle2, Trash2, AlertTriangle, ChevronDown, Edit3, Save, X, Eye, EyeOff, Bell, BellOff, BellRing, Server, Key, Activity, LifeBuoy } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { deviceService } from '../services/deviceService';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { LocalNotifications } from '@capacitor/local-notifications';

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDevExpanded, setIsDevExpanded] = useState(false);
  const [showToasts, setShowToasts] = useState(() => localStorage.getItem('showFallbackToasts') === 'true');

  const toggleToasts = () => {
    const newVal = !showToasts;
    setShowToasts(newVal);
    localStorage.setItem('showFallbackToasts', newVal ? 'true' : 'false');
  };
  
  // Edit Profile State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = () => {
    auth.signOut();
  };

  const toggleDevTools = () => {
    const nextState = !isDevExpanded;
    setIsDevExpanded(nextState);
    if (nextState) {
      refreshVibeDiag();
    }
  };

  const handleOpenEdit = () => {
    setEditName(profile?.displayName || '');
    setShowEditModal(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: editName
      });
      await refreshProfile();
      setShowEditModal(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleInsights = async () => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        showInsights: profile?.showInsights === false ? true : false
      });
      await refreshProfile();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await deviceService.seedDevices(user.uid);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevices = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deviceService.deleteAllDevices(user.uid);
      setShowConfirmDelete(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const [notifSuccess, setNotifSuccess] = useState(false);

  const buildDeviceAlertMessage = async () => {
    if (!user) return { title: 'Pipeline Test', body: 'System operational.' };
    const alerts = await notificationService.getAlerts(user.uid);
    const totalAlerts = alerts.length;

    if (totalAlerts === 0) {
      return { title: 'Systems Nominal', body: 'All devices are healthy and active. Test complete.' };
    }

    const inactive = alerts.filter(a => a.type === 'inactive');
    const expired = alerts.filter(a => a.type === 'expired');
    const expiring = alerts.filter(a => a.type === 'expiring');

    if (totalAlerts > 1) {
      let summaryBody = '';
      if (expired.length > 0) summaryBody += `${expired.length} expired, `;
      if (inactive.length > 0) summaryBody += `${inactive.length} inactive, `;
      if (expiring.length > 0) summaryBody += `${expiring.length} expiring soon`;
      summaryBody = summaryBody.replace(/, $/, '');

      return {
        title: 'Device Maintenance Required',
        body: `You have ${totalAlerts} devices that require attention: ${summaryBody}.`
      };
    } else {
      const alert = alerts[0];
      if (alert.type === 'inactive') {
        return { title: 'Activation Required', body: `Device "${alert.deviceName}" needs a subscription.` };
      } else if (alert.type === 'expired') {
        return { title: 'Device Expired', body: `Subscription for "${alert.deviceName}" has expired.` };
      } else {
        return { title: 'Device Expiring Soon', body: `Subscription for "${alert.deviceName}" expires soon.` };
      }
    }
  };

  const handleTestNotification = async () => {
    if (!user) return;
    const alertMsg = await buildDeviceAlertMessage();

    await notificationService.notify({
      title: alertMsg.title,
      body: alertMsg.body,
      tag: 'test-notification'
    });
    
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2000);
  };

  const [fcmSuccess, setFcmSuccess] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [fcmStatusMsg, setFcmStatusMsg] = useState('');
  
  const [pureFbSuccess, setPureFbSuccess] = useState(false);
  const [pureFbLoading, setPureFbLoading] = useState(false);
  const [pureFbStatusMsg, setPureFbStatusMsg] = useState('');

  const [capTitle, setCapTitle] = useState('Local Payload');
  const [capNotifMsg, setCapNotifMsg] = useState('This is a local Capacitor notification test.');
  const [capSuccess, setCapSuccess] = useState(false);
  const [webPushDisabled, setWebPushDisabled] = useState(true);

  const [vibeDiag, setVibeDiag] = useState<any>(null);
  const [isAndroidDebugExpanded, setIsAndroidDebugExpanded] = useState(false);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PUSH_ECHO') {
        localStorage.setItem('lastPushResult', JSON.stringify({
          targetId: event.data.targetId,
          vibrated: event.data.vibrated
        }));
      }
    };
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);

  const [bridgeStatus, setBridgeStatus] = useState<Record<string, boolean>>({});
  const [rawStatus, setRawStatus] = useState<string>('Initializing Scanner...');

  useEffect(() => {
    const checkBridges = () => {
      // Direct raw status check - check logs array or single status
      const logs = (window as any).__W2N_LOGS__;
      if (Array.isArray(logs) && logs.length > 0) {
        setRawStatus(logs.join(' | '));
      } else {
        setRawStatus((window as any).__W2N_RAW_STATUS || 'Searching...');
      }

      // Check if a stolen token appeared
      const stolen = (window as any).__NATIVE_TOKEN_STOLEN || localStorage.getItem('native_fcm_token');
      if (stolen && stolen !== localStorage.getItem('last_stolen_fcm')) {
        localStorage.setItem('last_stolen_fcm', stolen);
        // Save back to user profile quickly
        if (user) {
          notificationService.updateFCMToken(user.uid, stolen).catch(console.error);
        }
        setRawStatus('Extracted Token: ' + stolen.substring(0, 15) + '...');
      }
      
      const status: Record<string, boolean> = {};
      ['webToNative', 'w2n', 'WTN', 'Native', 'Android', 'android', 'wtn', 'webtonative', 'WebToNative', 'JSBridge', 'AndroidInterface', 'webkit', 'flutter_inappwebview'].forEach(b => {
        status[b] = !!(window as any)[b];
      });
      setBridgeStatus(status);
    };
    
    checkBridges();
    const interval = setInterval(checkBridges, 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshVibeDiag = async () => {
    const diag = await notificationService.getVibrationDiagnostics();
    setVibeDiag(diag);
  };

  const handleVibeTest = () => {
    const success = notificationService.testLocalVibrate([100, 50, 100]);
    if (!success) {
      setFcmStatusMsg('Browser API rejected vibration');
    } else {
      setFcmStatusMsg('Hardware Vibe Signal Sent');
    }
    refreshVibeDiag();
  };

  const handleTestFCMPush = async () => {
    if (!user) return;
    setFcmLoading(true);
    setFcmStatusMsg('');
    
    const pushTargetId = 'test_' + Date.now();
    localStorage.setItem('lastPushTargetId', pushTargetId);

    try {
      const alertMsg = await buildDeviceAlertMessage();
      const result = await notificationService.triggerRemoteBouncePush(
        user.uid,
        alertMsg.title,
        alertMsg.body
      );
      
      if (result.success) {
        setFcmSuccess(true);
        setFcmStatusMsg('FCM Signal Dispatched Successfully');
        setTimeout(() => setFcmSuccess(false), 4000);
      } else {
        setFcmStatusMsg(result.error || 'Unknown error');
      }
    } catch (e: any) {
      setFcmStatusMsg(e.message || 'Client integration error');
    } finally {
      setFcmLoading(false);
    }
  };

  const handleTestPureFirebasePush = async () => {
    if (!user) return;
    setPureFbLoading(true);
    setPureFbStatusMsg('');
    
    try {
      const result = await notificationService.triggerPureFirebasePush(
        user.uid,
        "IoT Android App",
        "Firebase Native Push Notification Working!"
      );
      
      if (result.success) {
        setPureFbSuccess(true);
        setPureFbStatusMsg('Pure Firebase Signal Dispatched');
        setTimeout(() => setPureFbSuccess(false), 4000);
      } else {
        setPureFbStatusMsg(result.error || 'Failed to dispatch');
      }
    } catch (err: any) {
      setPureFbStatusMsg(err.message || 'Unknown network error');
    } finally {
      setPureFbLoading(false);
    }
  };

  const handleTestCapacitorPush = async () => {
    try {
      if ((window as any).Capacitor?.isNativePlatform() || (window as any).Capacitor?.getPlatform() === 'web') {
        await LocalNotifications.requestPermissions();
        await LocalNotifications.schedule({
          notifications: [
            {
              title: capTitle || 'Local Test',
              body: capNotifMsg || 'Test',
              id: new Date().getTime(),
              schedule: { at: new Date(Date.now() + 1000) }, // Schedule 1s to allow app to go to background
            }
          ]
        });
        setCapSuccess(true);
        setTimeout(() => setCapSuccess(false), 2000);
      } else {
        alert("Capacitor isn't running native plugin architecture here.");
      }
    } catch (e) {
      console.error(e);
      alert('Capacitor Error: ' + String(e));
    }
  };

  React.useEffect(() => {
    if (user) {
      // Silently try to extract or register token in the background when dev tools are accessed/profile loaded
      notificationService.registerWebPushToken(user.uid).catch(console.error);
    }
  }, [user]);

  if (!profile) return null;

  return (
    <div className="space-y-4 pb-8">
      {/* Compressed Header */}
      <header className="relative text-center pt-2">
        <button 
          onClick={handleOpenEdit}
          className="absolute right-2 top-0 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-primary transition-colors active:scale-95"
          title="Edit Profile"
        >
          <Edit3 className="h-4 w-4" />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-100 text-slate-900 shadow-sm border border-slate-200">
          <User className="h-8 w-8" />
        </div>
        <h2 className="mt-3 text-xl font-black tracking-tight text-slate-900 leading-none">
          {profile.displayName || profile.email.split('@')[0]}
        </h2>
        <p className="mt-1 text-[9px] text-slate-400 font-bold uppercase tracking-widest">{profile.email}</p>
      </header>

      {/* Optimized Info Grid */}
      <section className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-white p-2.5 shadow-sm">
           <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Shield className="h-4 w-4" />
           </div>
           <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Identity</p>
              <p className="font-bold text-slate-900 uppercase text-[10px] truncate">{profile.role}</p>
           </div>
        </div>

        <div className="flex items-center gap-3 rounded-[20px] border border-slate-100 bg-white p-2.5 shadow-sm">
           <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
              <Calendar className="h-4 w-4" />
           </div>
           <div className="min-w-0">
              <p className="text-[7px] font-black uppercase tracking-widest text-slate-400 leading-none mb-0.5">Joined</p>
              <p className="font-bold text-slate-900 text-[10px] truncate">
                {formatDate(profile?.createdAt, 'MMM dd, yy')}
              </p>
           </div>
        </div>
      </section>

      {/* Collapsible Dev Tools */}
      <section className="space-y-2">
        <button 
          onClick={toggleDevTools}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50/50 hover:bg-slate-100 transition-colors"
        >
          <div className="flex items-center gap-2">
             <Terminal className="h-3.5 w-3.5 text-primary" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Developer Tools</h3>
          </div>
          <motion.div
            animate={{ rotate: isDevExpanded ? 180 : 0 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {isDevExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-[28px] border border-slate-900 bg-slate-900 p-5 text-white shadow-xl shadow-slate-900/10">
                 <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-emerald-400">Simulation Mode</h4>
                    <p className="text-[9px] font-medium text-slate-400">Inject synthetic device manifests into the production database.</p>
                 </div>

                 <button 
                   onClick={handleSeedData}
                   disabled={loading || isDeleting}
                   className="relative mt-4 flex w-full items-center justify-between overflow-hidden rounded-[16px] bg-white/10 px-4 py-3.5 transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
                 >
                   <div className="flex items-center gap-3">
                     {loading ? (
                       <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                     ) : success ? (
                       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                     ) : (
                       <Database className="h-3.5 w-3.5 text-white" />
                     )}
                     <span className="text-[10px] font-black uppercase tracking-widest text-left">
                       {loading ? 'Transmitting...' : success ? 'Payload Synced' : 'Seed Lab Data'}
                     </span>
                   </div>
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                 </button>

                  <button 
                    onClick={toggleInsights}
                    className="mt-2 flex w-full items-center justify-between rounded-[16px] bg-white/5 px-4 py-3 transition-all hover:bg-white/10 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      {profile?.showInsights === false ? <EyeOff className="h-3.5 w-3.5 text-slate-400" /> : <Eye className="h-3.5 w-3.5 text-emerald-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        {profile?.showInsights === false ? 'Enable Insights Mode' : 'Disable Insights Mode'}
                      </span>
                    </div>
                    <div className={cn("h-1.5 w-1.5 rounded-full", profile?.showInsights === false ? "bg-slate-600" : "bg-emerald-400")} />
                  </button>

                  <button 
                    onClick={toggleToasts}
                    className="mt-2 flex w-full items-center justify-between rounded-[16px] bg-white/5 px-4 py-3 transition-all hover:bg-white/10 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      {!showToasts ? <BellOff className="h-3.5 w-3.5 text-slate-400" /> : <BellRing className="h-3.5 w-3.5 text-emerald-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/70">
                        {!showToasts ? 'Enable Fallback Toasts' : 'Disable Fallback Toasts'}
                      </span>
                    </div>
                    <div className={cn("h-1.5 w-1.5 rounded-full", !showToasts ? "bg-slate-600" : "bg-emerald-400")} />
                  </button>

                  <div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
                    <button onClick={() => setIsAndroidDebugExpanded(!isAndroidDebugExpanded)} className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Android Debugging</h4>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isAndroidDebugExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    {isAndroidDebugExpanded && (
                    <div className="pt-3 border-t border-white/10 mt-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vibration Diagnostics</span>
                        <button 
                          onClick={handleVibeTest}
                          className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 active:scale-95"
                        >
                          Vibe Check
                        </button>
                      </div>

                    {!vibeDiag ? (
                      <button 
                        onClick={refreshVibeDiag}
                        className="w-full text-[9px] font-bold text-slate-500 py-1"
                      >
                        Click to Scan Hardware...
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase">Hardware API:</span>
                          <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase", vibeDiag.apiSupported ? "text-emerald-400" : "text-rose-400")}>
                            {vibeDiag.apiSupported ? 'Supported' : 'Blocked/None'}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase">Service Worker:</span>
                          <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase", vibeDiag.serviceWorker === 'active' ? "text-emerald-400" : "text-orange-400")}>
                            {vibeDiag.serviceWorker}
                          </span>
                        </div>
                        <div className="col-span-2 mt-2 pt-2 border-t border-white/5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Token Hub:</span>
                            <span className={cn(
                              "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                              profile?.tokenSource?.includes('native_bridge') 
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                            )}>
                              {profile?.tokenSource?.replace(/_/g, ' ') || 'Web Native SDK'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-2">
                             <span className="text-[9px] font-bold text-slate-500 uppercase">Detection Mode:</span>
                             <span className={cn(
                               "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                               navigator.userAgent.includes('w2n') 
                                 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                                 : "bg-rose-500/10 text-rose-500"
                             )}>
                               {navigator.userAgent.includes('w2n') ? 'NATIVE APK DETECTED' : 'BROWSER MODE'}
                             </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-white/5 pt-2">
                             <span className="text-[9px] font-bold text-slate-500 uppercase">Script Injection:</span>
                             <span className={cn(
                               "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                               (window as any).__W2N_HEALTH_CHECK__ === 'Passed' 
                                 ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                                 : "bg-rose-500/10 text-rose-500"
                             )}>
                               {(window as any).__W2N_HEALTH_CHECK__ === 'Passed' ? 'INJECTION ACTIVE' : 'NO INJECTION FOUND'}
                             </span>
                          </div>

                          <div className="flex flex-col gap-2 border-y border-white/5 py-3 mt-1">
                             <div className="flex items-center justify-between">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Bridges Found:</span>
                                 <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">
                                  {['webToNative', 'w2n', 'WTN', 'Native', 'Android', 'android', 'wtn', 'webtonative', 'JSBridge', 'AndroidInterface', 'webkit', 'flutter_inappwebview'].map(b => (
                                    <span key={b} className={cn(
                                      "text-[7px] font-bold px-1.5 py-0.5 rounded-sm border transition-colors",
                                      bridgeStatus[b] ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-slate-600 border-transparent"
                                    )}>
                                      {b}
                                    </span>
                                  ))}
                                </div>
                             </div>
                             
                                 <button 
                                    onClick={() => {
                                      let d = '';
                                      const getProps = (o: any) => {
                                       if (!o) return 'null';
                                       try {
                                         let props = [];
                                         for (let k in o) props.push(k);
                                         let own = Object.getOwnPropertyNames(o);
                                         return 'in:' + props.join(',') + ' own:' + own.join(',');
                                       } catch(e) { return 'err'; }
                                     };
                                     try {
                                       if ((window as any).Android) {
                                          d += "ANDROID(cap): " + getProps((window as any).Android) + "\n";
                                       }
                                       if ((window as any).android) {
                                         d += "android: " + getProps((window as any).android) + "\n";
                                         if ((window as any).android.webview) {
                                           d += "android.webview: " + getProps((window as any).android.webview) + "\n";
                                         }
                                       }
                                       if ((window as any).webToNative) {
                                          d += "W2N KEYS: " + getProps((window as any).webToNative) + "\n";
                                       }
                                       if ((window as any).webkit) {
                                          d += "webkit: yes\n";
                                          if ((window as any).webkit.messageHandlers) {
                                            d += "webkit.handlers: " + getProps((window as any).webkit.messageHandlers) + "\n";
                                          }
                                       }
                                       if (!d) d = "No obvious android/webToNative keys\n";
                                       
                                       // Global search
                                       let found = [];
                                       for (let k in window) {
                                         try {
                                           if (k === 'webkit' || k === 'android' || k === 'Android' || k === 'webToNative') continue;
                                           if (typeof (window as any)[k] === 'object' && (window as any)[k] !== null && k !== 'window' && k !== 'document' && k !== 'location' && k !== 'navigator') {
                                              let kL = k.toLowerCase();
                                              if (kL.indexOf('native') !== -1 || kL.indexOf('bridge') !== -1 || kL.indexOf('app') !== -1) {
                                                found.push(k + ':' + getProps((window as any)[k]));
                                              }
                                           }
                                         } catch(e) {}
                                       }
                                       if (found.length > 0) d += "\nOther: " + found.join(' | ');
                                       
                                     } catch(e:any) {
                                       d = "ERR: " + e.message;
                                     }
                                     (window as any).__W2N_LOGS__ = [d];
                                     setRawStatus(d);
                                   }}
                                    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20 transition-all uppercase tracking-widest active:scale-95"
                                 >
                                    Scan Bridge
                                 </button>
                          </div>

                          <div className="space-y-1 border-t border-white/5 pt-2">
                             <span className="block text-[8px] font-bold text-slate-500 uppercase">App Context (Current URL):</span>
                             <p className="text-[7px] font-mono leading-tight text-slate-400 break-all bg-black/20 p-1.5 rounded">
                                {window.location.href}
                             </p>
                          </div>

                          <div className="space-y-1 border-t border-white/5 pt-2">
                             <div className="flex items-center justify-between">
                                <span className="text-[8px] font-bold text-slate-500 uppercase">Bridge Debug Console:</span>
                                <div className="flex items-center gap-3">
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(rawStatus).catch(() => {});
                                    }}
                                    className="text-[7px] text-emerald-400/60 hover:text-emerald-400 underline uppercase font-bold"
                                  >
                                    Copy
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setBridgeStatus(prev => ({...prev, trigger: true}));
                                      
                                      // Try to invoke webToNative and WebToNativeInterface getFcmToken
                                      let logs = [] as string[];
                                      try {
                                        if ((window as any).webToNative?.getFcmToken) {
                                          logs.push('Called webToNative.getFcmToken()');
                                          (window as any).webToNative.getFcmToken();
                                        }
                                        if ((window as any).webToNative?.askPermission) {
                                          logs.push('Called webToNative.askPermission()');
                                          (window as any).webToNative.askPermission();
                                        }
                                        if ((window as any).android?.getFcmToken) {
                                          logs.push('Called android.getFcmToken()');
                                          (window as any).android.getFcmToken();
                                        }
                                        
                                        // The big one
                                        if ((window as any).WebToNativeInterface) {
                                          const w2n = (window as any).WebToNativeInterface;
                                          logs.push('Found WebToNativeInterface!');
                                          
                                          // WebToNative often requires a STRING name of a global callback
                                          (window as any).w2nCallback1 = (t:any) => { logs.push('w2nCallback1: ' + (typeof t === 'string' ? t.substring(0, 15) : 'object')); if(t) (window as any).__NATIVE_BRIDGE__.setToken(t); };
                                          (window as any).w2nCallback2 = (t:any) => { logs.push('w2nCallback2: ' + (typeof t === 'string' ? t.substring(0, 15) : 'object')); if(t) (window as any).__NATIVE_BRIDGE__.setToken(t); };
                                          (window as any).w2nCallback3 = (t:any) => { logs.push('w2nCallback3: ' + (typeof t === 'string' ? t.substring(0, 15) : 'object')); if(t) (window as any).__NATIVE_BRIDGE__.setToken(t); };
                                          (window as any).w2nCallback4 = (t:any) => { logs.push('w2nCallback4: ' + (typeof t === 'string' ? t.substring(0, 15) : 'object')); if(t) (window as any).__NATIVE_BRIDGE__.setToken(t); };

                                          if (w2n.requestNotificationPermission) {
                                            try { w2n.requestNotificationPermission(); } catch(e){}
                                          }
                                          if (w2n.registerNotification) {
                                            try { w2n.registerNotification(); } catch(e){}
                                            try { w2n.registerNotification('w2nCallback1'); } catch(e){}
                                          }
                                          if (w2n.getRegistrationToken) {
                                            try { w2n.getRegistrationToken(); } catch(e){}
                                            try { w2n.getRegistrationToken('w2nCallback2'); } catch(e){}
                                          }
                                          if (w2n.getOneSignalId) {
                                            try { w2n.getOneSignalId(); } catch(e){}
                                            try { w2n.getOneSignalId('w2nCallback3'); } catch(e){}
                                          }
                                          if (w2n.getAppsFlyerAppId) {
                                            try { w2n.getAppsFlyerAppId('w2nCallback4'); } catch(e){} // Just test if callbacks work at all!
                                          }
                                          
                                          let polls = 0;
                                          const pollToken = () => {
                                            polls++;
                                            if (polls > 20) {
                                              logs.push('Stopped polling.');
                                              (window as any).__W2N_LOGS__ = logs;
                                              setRawStatus(logs.join(' | '));
                                              return;
                                            }
                                            try {
                                              let t = w2n.getRegistrationToken ? w2n.getRegistrationToken() : null;
                                              let t2 = w2n.getOneSignalId ? w2n.getOneSignalId() : null;
                                              
                                              let resultToken = null;
                                              if (t && typeof t === 'string' && t.length > 5) resultToken = t;
                                              if (t2 && typeof t2 === 'string' && t2.length > 5) resultToken = t2;
                                              
                                              if (resultToken) {
                                                logs.push(`Poll ${polls}: Got token! (${resultToken.substring(0,10)}...)`);
                                                if ((window as any).__NATIVE_BRIDGE__) {
                                                  (window as any).__NATIVE_BRIDGE__.setToken(resultToken);
                                                }
                                                (window as any).__W2N_LOGS__ = logs;
                                                setRawStatus(logs.join(' | '));
                                              } else {
                                                logs.push(`Poll ${polls}: Empty/null`);
                                                (window as any).__W2N_LOGS__ = logs;
                                                setRawStatus(logs.join(' | '));
                                                setTimeout(pollToken, 500);
                                              }
                                            } catch (e:any) {
                                              logs.push(`Poll ERR: ${e.message}`);
                                              (window as any).__W2N_LOGS__ = logs;
                                              setRawStatus(logs.join(' | '));
                                            }
                                          };
                                          
                                          // WebToNative often passes token asynchronously to a global function or uses local storage.
                                          const handleAsyncToken = (source: string, token: string) => {
                                            if (token && typeof token === 'string' && token.length > 5) {
                                              logs.push(`Async block triggered by ${source}! Token: ${token.substring(0,10)}...`);
                                              if ((window as any).__NATIVE_BRIDGE__) {
                                                (window as any).__NATIVE_BRIDGE__.setToken(token);
                                              }
                                              (window as any).__W2N_LOGS__ = logs;
                                              setRawStatus(logs.join(' | '));
                                            }
                                          };
                                          
                                          try {
                                            for (let i = 0; i < localStorage.length; i++) {
                                              let k = localStorage.key(i);
                                              if (k && (k.toLowerCase().includes('token') || k.toLowerCase().includes('fcm') || k.toLowerCase().includes('push'))) {
                                                let v = localStorage.getItem(k);
                                                if (v && v.length > 10) logs.push(`Found local storage ${k}: ${v.substring(0,10)}...`);
                                              }
                                            }
                                          } catch(e){}
                                          
                                          (window as any).getRegistrationToken = (t:string) => handleAsyncToken('getRegistrationToken', t);
                                          (window as any).setRegistrationToken = (t:string) => handleAsyncToken('setRegistrationToken', t);
                                          (window as any).onRegistrationToken = (t:string) => handleAsyncToken('onRegistrationToken', t);
                                          (window as any).returnRegistrationToken = (t:string) => handleAsyncToken('returnRegistrationToken', t);
                                          (window as any).fcmTokenCallback = (t:string) => handleAsyncToken('fcmTokenCallback', t);
                                          (window as any).pushTokenCallback = (t:string) => handleAsyncToken('pushTokenCallback', t);
                                          (window as any).webToNativeToken = (t:string) => handleAsyncToken('webToNativeToken', t);
                                          
                                          // Try calling with callback strategies
                                          try { if (w2n.getRegistrationToken) w2n.getRegistrationToken('getRegistrationToken'); } catch(e){}
                                          try { if (w2n.getRegistrationToken) w2n.getRegistrationToken('onRegistrationToken'); } catch(e){}
                                          try { if (w2n.getRegistrationToken) w2n.getRegistrationToken('fcmTokenCallback'); } catch(e){}
                                          try { if (w2n.getRegistrationToken) w2n.getRegistrationToken((window as any).getRegistrationToken); } catch(e){}
                                          try { if (w2n.getRegistrationToken) w2n.getRegistrationToken(); } catch(e){}
                                          
                                          // Also attempt getOneSignalId
                                          try { if (w2n.getOneSignalId) w2n.getOneSignalId('onRegistrationToken'); } catch(e){}
                                          try { if (w2n.getOneSignalId) w2n.getOneSignalId('getRegistrationToken'); } catch(e){}
                                          
                                          pollToken();
                                          
                                        } else {
                                          (window as any).__W2N_LOGS__ = logs;
                                          setRawStatus(logs.join(' | '));
                                        }
                                      } catch(e: any) {
                                        logs.push(`ERROR: ${e.message}`);
                                        (window as any).__W2N_LOGS__ = logs;
                                        setRawStatus(logs.join(' | '));
                                      }
                                    }}
                                    className="text-[7px] text-emerald-400/60 hover:text-emerald-400 underline uppercase font-bold"
                                  >
                                    Force Deep Scan
                                  </button>
                                </div>
                             </div>
                             <div className="text-[7px] font-mono leading-relaxed text-emerald-400/80 break-all bg-black/40 p-2.5 rounded border border-white/5 min-h-[60px] max-h-[120px] overflow-y-auto">
                                {(rawStatus || 'No logs yet...').split(' | ').map((line, i) => (
                                  <div key={i} className={cn("border-b border-white/5 last:border-0 py-1", i === 0 ? "opacity-100 font-bold" : "opacity-60")}>
                                    {line}
                                  </div>
                                ))}
                             </div>
                             
                          </div>

                          <div className="space-y-1 border-t border-white/5 pt-2">
                             <span className="block text-[8px] font-bold text-slate-500 uppercase">System Identity (UserAgent):</span>
                             <p className="text-[7px] font-mono leading-tight text-slate-500 break-all bg-black/20 p-1.5 rounded">
                                {navigator.userAgent}
                             </p>
                          </div>
                          
                          <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>
                          <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">
                             Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".
                          </p>
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                  </div>

                  
                   {/* --- Capacitor Native Engine Section --- */}
                   <div className="mt-6 border-t border-slate-700/50 pt-4">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-sky-400/90 mb-2 flex items-center justify-between">
                       <span>Capacitor Native Engine</span>
                       <Activity className="h-3.5 w-3.5 text-sky-400" />
                     </h4>
                     <p className="text-[8px] text-slate-400 font-medium mb-3 leading-relaxed">
                       Primary method for bundled Android/iOS Apps using <strong>@capacitor/local-notifications</strong>.
                     </p>

                     <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-[16px]">
                       <input 
                         value={capTitle}
                         onChange={e => setCapTitle(e.target.value)}
                         placeholder="Notification Title"
                         className="w-full bg-slate-950/50 font-bold text-[10px] text-white px-3 py-2.5 rounded-lg mb-2 border border-white/5 outline-none focus:border-sky-500/50 transition-colors"
                       />
                       <textarea 
                         value={capNotifMsg}
                         onChange={e => setCapNotifMsg(e.target.value)}
                         placeholder="Notification Body..."
                         className="w-full bg-slate-950/50 text-slate-300 font-medium text-[10px] px-3 py-2.5 rounded-lg mb-3 border border-white/5 outline-none h-14 resize-none focus:border-sky-500/50 transition-colors"
                       />
                       <button
                         onClick={handleTestCapacitorPush}
                         className="flex w-full items-center justify-between rounded-xl bg-sky-500 py-3 px-4 shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 active:scale-95 relative overflow-hidden"
                       >
                         {capSuccess && (
                            <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-300">
                               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-950 flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Native Plugin Fired
                               </span>
                            </div>
                         )}
                         <span className="block text-[9px] font-black uppercase tracking-widest text-sky-950 relative z-0">Dispatch Native Alert</span>
                         <BellRing className="h-3.5 w-3.5 text-sky-950 relative z-0" />
                       </button>
                     </div>
                   </div>

                   {/* --- Web Push Engine Section --- */}
                   <div className="mt-8 border-t border-slate-700/50 pt-4 pb-4">
                     <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.1em] flex-1 text-purple-400/90 flex items-center gap-2">
                         <span>Web Push Engine</span>
                         <Server className="h-3 w-3" />
                       </h4>
                       <button
                         onClick={() => setWebPushDisabled(!webPushDisabled)}
                         className={cn(
                           "px-2 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                           webPushDisabled ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                         )}
                       >
                         {webPushDisabled ? 'Web Actions Disabled' : 'Web Actions Enabled'}
                       </button>
                     </div>
                     <p className="text-[8px] text-slate-400 font-medium mb-3 leading-relaxed">
                       Standard Web APIs (Notification/SW). Best for Desktop/PWA. Toggle this off if you only want to test Capacitor natively to avoid duplicates.
                     </p>

                     <div className={cn("transition-opacity duration-300 flex flex-col gap-2 relative", webPushDisabled ? "opacity-30 pointer-events-none cursor-not-allowed" : "opacity-100")}>
                       {webPushDisabled && (
                         <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase text-red-400 bg-black/60 px-3 py-1 rounded-full border border-red-500/20 shadow-xl backdrop-blur-sm">
                               Web Engine Disabled
                            </span>
                         </div>
                       )}
                       <button 
                         onClick={handleTestNotification}
                         className="flex w-full items-center justify-between rounded-[16px] bg-white/5 border border-white/5 px-4 py-3 transition-all hover:bg-white/10"
                       >
                         <div className="flex items-center gap-3">
                           <Bell className={cn("h-3.5 w-3.5", notifSuccess ? 'text-emerald-400' : (notificationService.getPermissionStatus() === 'granted' ? 'text-emerald-400/50' : notificationService.getPermissionStatus() === 'pwa-required' ? 'text-orange-400' : 'text-slate-400'))} />
                           <div className="text-left">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-white/70">
                               {notifSuccess ? 'Signal Transmitted' : 'Test Local Web Pipeline'}
                             </span>
                             <span className="block text-[7px] font-bold uppercase text-slate-500 mt-0.5">
                               Status: {notificationService.getPermissionStatus().replace('-', ' ')}
                             </span>
                           </div>
                         </div>
                         {notifSuccess ? (
                           <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                         ) : (
                           <RefreshCw className="h-3 w-3 text-slate-600" />
                         )}
                       </button>

                       <button 
                         onClick={handleTestFCMPush}
                         disabled={fcmLoading}
                         className="flex w-full items-center justify-between rounded-[16px] bg-blue-500/10 border border-blue-500/20 px-4 py-3 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <Server className={cn("h-3.5 w-3.5 shrink-0", fcmSuccess ? 'text-emerald-400' : 'text-blue-400')} />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-blue-400/90 truncate">
                               {fcmSuccess ? 'V1 Payload Routed' : 'Test FCM V1 Web Backend'}
                             </span>
                             <span className={cn("block text-[8px] font-bold mt-0.5 truncate", fcmStatusMsg && !fcmSuccess ? "text-red-400" : "text-blue-500/70")}>
                               {fcmStatusMsg || 'Requires registered mobile fcmToken'}
                             </span>
                           </div>
                         </div>
                         {fcmLoading ? (
                           <RefreshCw className="h-3 w-3 shrink-0 animate-spin text-blue-400" />
                         ) : fcmSuccess ? (
                           <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                         ) : null}
                       </button>

                       <button 
                         onClick={handleTestPureFirebasePush}
                         disabled={pureFbLoading}
                         className="flex w-full items-center justify-between rounded-[16px] bg-purple-500/10 border border-purple-500/20 px-4 py-3 transition-all hover:bg-purple-500/20 disabled:opacity-50"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <Server className={cn("h-3.5 w-3.5 shrink-0", pureFbSuccess ? 'text-emerald-400' : 'text-purple-400')} />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-purple-400/90 truncate">
                               {pureFbSuccess ? 'Sent via pure Firebase' : 'Test Pure FCM Console Behavior'}
                             </span>
                             <span className={cn("block text-[8px] font-bold mt-0.5 truncate", pureFbStatusMsg && !pureFbSuccess ? "text-red-400" : "text-purple-500/70")}>
                               {pureFbStatusMsg || 'Direct console API format'}
                             </span>
                           </div>
                         </div>
                         {pureFbLoading ? (
                           <RefreshCw className="h-3 w-3 shrink-0 animate-spin text-purple-400" />
                         ) : pureFbSuccess ? (
                           <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                         ) : null}
                       </button>
                       
                       <button 
                         onClick={async () => {
                            setRawStatus('Repairing FCM Token...');
                            localStorage.removeItem('native_fcm_token');
                            localStorage.removeItem('last_synced_native_token');
                            localStorage.removeItem('pending_native_token');
                            (window as any).__NATIVE_TOKEN_STOLEN = null;
                            
                            if (user) {
                              const res = await notificationService.registerWebPushToken(user.uid);
                              setRawStatus(res.success ? 'FCM Web Token Restored!' : 'FCM Error: ' + res.message);
                              
                              setTimeout(() => {
                                 window.location.reload();
                              }, 1500);
                            }
                         }}
                         className="flex w-full items-center justify-between rounded-[16px] bg-red-500/10 border border-red-500/20 px-4 py-3 transition-all hover:bg-red-500/20"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <RefreshCw className="h-3.5 w-3.5 shrink-0 text-red-400" />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-red-400/90 truncate">
                               Repair Push FCM Token
                             </span>
                             <span className="block text-[8px] font-bold mt-0.5 truncate text-red-500/70">
                               Use this if you see "Device Unregistered"
                             </span>
                           </div>
                         </div>
                       </button>
                     </div>
                   </div>
                   
                   {notificationService.getPermissionStatus() === 'pwa-required' && (
                    <div className="mt-2 text-[8px] font-medium text-orange-500 bg-orange-400/10 px-3 py-2 rounded-lg border border-orange-400/20 space-y-1">
                      <p><span className="text-orange-400 font-bold uppercase mr-1">PWA Mode Required:</span> This mobile browser requires the app to be installed for notifications.</p>
                      <p className="opacity-80">Tap the <span className="font-black">Share icon</span> then <span className="font-black underline">"Add to Home Screen"</span> to enable push signals.</p>
                    </div>
                  )}

                  {notificationService.getPermissionStatus() === 'unsupported' && (
                    <p className="mt-2 text-[8px] font-medium text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700">
                      <span className="text-slate-500 font-bold uppercase mr-1">Legacy Browser:</span>
                      Your current browser environment does not support the Web Notification API.
                    </p>
                  )}

                  {notificationService.getPermissionStatus() === 'denied' && (
                    <p className="mt-2 text-[8px] font-medium text-red-500 bg-red-400/10 px-3 py-2 rounded-lg border border-red-400/20">
                      <span className="text-red-500 font-bold uppercase mr-1">Access Blocked:</span>
                      Notifications are explicitly denied. Please click the <span className="font-black underline">Lock Icon</span> in your address bar to reset site permissions.
                    </p>
                  )}

                  {window.self !== window.top && (
                    <div className="mt-2 space-y-2">
                       <p className="text-[8px] font-medium text-slate-500 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                        <span className="text-orange-400 font-bold uppercase mr-1">Preview Limit:</span>
                        Testing notifications inside this frame is unreliable. Use the button below to launch the system in a separate environment.
                      </p>
                      <button 
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary/10 border border-primary/20 py-2.5 text-[9px] font-black uppercase tracking-widest text-primary transition-all active:scale-95"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Launch in New Tab
                      </button>
                    </div>
                  )}

                  <button 
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={loading || isDeleting}
                    className="mt-1 flex w-full items-center gap-3 rounded-[16px] px-4 py-3 text-white/40 hover:text-red-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Clear Device Pool</span>
                  </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* App Refresh & Version */}
      <div className="flex flex-col gap-3 pb-2 pt-2">
         <button 
           onClick={() => {
             // Clear any cached flags without clearing valid tokens
             window.location.reload();
           }}
           className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-blue-50 py-4 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all active:scale-95"
         >
           <RefreshCw className="h-3.5 w-3.5" />
           Reload Workspace
         </button>
         
         <div className="text-center">
            <span className="text-[10px] font-black text-slate-400/50 uppercase tracking-widest">Version: v1.1.14</span>
         </div>

         <button 
           onClick={() => {}}
           className="flex w-full items-center justify-center gap-2 rounded-[20px] border border-slate-100 bg-white py-4 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all active:scale-95"
         >
           <LifeBuoy className="h-3.5 w-3.5 text-primary" />
           Operational Support
         </button>
      </div>

      {/* Log Out Button */}
      <button 
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-50 py-4 text-[10px] font-black uppercase tracking-widest text-red-500 transition-all active:scale-95"
      >
        <LogOut className="h-3.5 w-3.5" />
        Terminate Session
      </button>

      {/* Footer Branding */}
      <div className="text-center pt-2">
        <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300">IoTConnect core v1.2.0-SIM</p>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-black text-slate-900">Edit Identity</h3>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-full hover:bg-slate-50 transition-colors"
                >
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Display Name</label>
                  <div className="relative">
                    <input 
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter operational callsign"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                    />
                    <Edit3 className="absolute right-4 top-3.5 h-4 w-4 text-slate-300" />
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={isUpdating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/10 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {isUpdating ? 'Synchronizing...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmDelete(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white p-8 text-center shadow-2xl"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-red-50 text-red-500">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-xl font-black text-slate-900">Total Data Wipe</h3>
              <p className="mt-2 text-xs font-medium text-slate-500 leading-relaxed px-4">
                This will permanently discard all device manifests and historical telemetry from the database.
              </p>
              
              <div className="mt-6 flex flex-col gap-2">
                <button 
                  onClick={handleDeleteDevices}
                  disabled={isDeleting}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-red-500 py-3.5 text-[9px] font-black uppercase tracking-widest text-white shadow-lg shadow-red-500/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Confirm Destruction'}
                </button>
                <button 
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-2 text-[9px] font-black uppercase tracking-widest text-slate-400"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
