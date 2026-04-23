import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Calendar, LogOut, Terminal, Database, RefreshCw, CheckCircle2, Trash2, AlertTriangle, ChevronDown, Edit3, Save, X, Eye, EyeOff, Bell, Server } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { deviceService } from '../services/deviceService';
import { notificationService } from '../services/notificationService';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDevExpanded, setIsDevExpanded] = useState(false);
  
  // Edit Profile State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLogout = () => {
    auth.signOut();
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

  const handleTestNotification = async () => {
    if (!user) return;
    const alerts = await notificationService.getAlerts(user.uid);
    const expiredCount = alerts.filter(a => a.type === 'expired').length;

    await notificationService.notify({
      title: 'Device Status Alert',
      body: `You have (${expiredCount}) expired devices that require attention.`,
      tag: 'test-notification'
    });
    
    setNotifSuccess(true);
    setTimeout(() => setNotifSuccess(false), 2000);
  };

  const [fcmSuccess, setFcmSuccess] = useState(false);
  const [fcmLoading, setFcmLoading] = useState(false);
  const [fcmStatusMsg, setFcmStatusMsg] = useState('');

  const handleTestFCMPush = async () => {
    if (!user) return;
    setFcmLoading(true);
    setFcmStatusMsg('');
    try {
      const result = await notificationService.triggerRemoteBouncePush(
        user.uid,
        'Remote FCM Test',
        'This push was routed securely through the Node.js V1 proxy!'
      );
      
      if (result.success) {
        setFcmSuccess(true);
        setFcmStatusMsg('FCM Sent Successfully');
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
          onClick={() => setIsDevExpanded(!isDevExpanded)}
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
                    onClick={handleTestNotification}
                    className="mt-2 flex w-full items-center justify-between rounded-[16px] bg-white/5 px-4 py-3 transition-all hover:bg-white/10 active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className={cn("h-3.5 w-3.5", notifSuccess ? 'text-emerald-400' : (notificationService.getPermissionStatus() === 'granted' ? 'text-emerald-400/50' : notificationService.getPermissionStatus() === 'pwa-required' ? 'text-orange-400' : 'text-blue-400'))} />
                      <div className="text-left">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-white/70">
                          {notifSuccess ? 'Signal Transmitted' : 'Test Local Pipeline'}
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
                    className="mt-2 flex w-full items-center justify-between rounded-[16px] bg-blue-500/10 border border-blue-500/20 px-4 py-3 transition-all hover:bg-blue-500/20 active:scale-95 disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Server className={cn("h-3.5 w-3.5 shrink-0", fcmSuccess ? 'text-emerald-400' : 'text-blue-400')} />
                      <div className="text-left min-w-0 pr-2">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-blue-400/90 truncate">
                          {fcmSuccess ? 'V1 Payload Routed' : 'Test FCM V1 Backend'}
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
