import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, Calendar, LogOut, Terminal, Database, RefreshCw, CheckCircle2, Trash2, AlertTriangle, ChevronDown, Edit3, Save, X, Eye, EyeOff } from 'lucide-react';
import { formatDate, cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { deviceService } from '../services/deviceService';
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

  const [pngUrl, setPngUrl] = useState<string>('');

  // Generate PNG from SVG data
  React.useEffect(() => {
    const generatePng = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw background
      ctx.fillStyle = '#000000';
      const radius = 112;
      ctx.beginPath();
      ctx.roundRect(0, 0, 512, 512, radius);
      ctx.fill();

      // Draw text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 260px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IO', 256, 268); // Adjusted Y for visual centering

      setPngUrl(canvas.toDataURL('image/png'));
    };

    generatePng();
  }, []);

  if (!profile) return null;

  return (
    <div className="space-y-4 pb-8">
      {/* Compressed Header */}
      <header className="relative flex flex-col items-center pt-2">
        <button 
          onClick={handleOpenEdit}
          className="absolute right-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-primary transition-colors active:scale-95 border border-slate-100"
          title="Edit Profile"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>

        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 text-slate-900 shadow-sm border border-slate-200">
          <User className="h-6 w-6" />
        </div>
        <h2 className="mt-2 text-lg font-black tracking-tight text-slate-900 leading-none">
          {profile.displayName || profile.email.split('@')[0]}
        </h2>
        <p className="mt-0.5 text-[8px] text-slate-400 font-bold uppercase tracking-widest">{profile.email}</p>
      </header>

      {/* Lean Metadata Bar */}
      <section className="flex items-center justify-center gap-1.5 py-1">
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
           <Shield className="h-3 w-3 text-slate-400" />
           <span className="text-[9px] font-black uppercase tracking-wider text-slate-900">{profile.role}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-slate-100 bg-white px-3 py-1.5 shadow-sm">
           <Calendar className="h-3 w-3 text-slate-400" />
           <span className="text-[9px] font-black uppercase tracking-wider text-slate-900">
             {formatDate(profile?.createdAt, 'MMM yy')}
           </span>
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
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Developer Payload</h3>
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
              <div className="rounded-[24px] border border-slate-900 bg-slate-900 p-4 text-white shadow-xl shadow-slate-900/10">
                 <div className="space-y-0.5">
                    <h4 className="text-[11px] font-bold text-emerald-400 uppercase tracking-tight">Simulation Mode</h4>
                    <p className="text-[8px] font-medium text-slate-400">Inject synthetic device manifests.</p>
                 </div>

                 <button 
                   onClick={handleSeedData}
                   disabled={loading || isDeleting}
                   className="relative mt-3 flex w-full items-center justify-between overflow-hidden rounded-xl bg-white/10 px-3.5 py-3 transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
                 >
                   <div className="flex items-center gap-2.5">
                     {loading ? (
                       <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />
                     ) : success ? (
                       <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                     ) : (
                       <Database className="h-3 w-3 text-white" />
                     )}
                     <span className="text-[9px] font-black uppercase tracking-widest text-left">
                       {loading ? 'Transmitting...' : success ? 'Payload Synced' : 'Seed Lab Data'}
                     </span>
                   </div>
                 </button>

                 <button 
                    onClick={toggleInsights}
                    className="mt-1.5 flex w-full items-center justify-between rounded-xl bg-white/5 px-3.5 py-2.5 transition-all hover:bg-white/10 active:scale-95"
                  >
                    <div className="flex items-center gap-2.5">
                      {profile?.showInsights === false ? <EyeOff className="h-3 w-3 text-slate-400" /> : <Eye className="h-3 w-3 text-emerald-400" />}
                      <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                        {profile?.showInsights === false ? 'Enable Insights' : 'Disable Insights'}
                      </span>
                    </div>
                    <div className={cn("h-1 w-1 rounded-full", profile?.showInsights === false ? "bg-slate-600" : "bg-emerald-400")} />
                  </button>

                 <button 
                    onClick={() => setShowConfirmDelete(true)}
                    disabled={loading || isDeleting}
                    className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-white/40 hover:text-red-400 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Clear Device Pool</span>
                  </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Log Out Button */}
      <button 
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3 text-[9px] font-black uppercase tracking-widest text-red-500 transition-all border border-slate-200 active:scale-95 shadow-sm hover:bg-red-50 hover:border-red-100"
      >
        <LogOut className="h-3 w-3" />
        Terminate Session
      </button>

      {/* Footer Branding & Icon Download */}
      <div className="flex flex-col items-center gap-4 pt-4 border-t border-slate-50">
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Master Asset: 512x512</p>
          <div className="flex gap-4">
            {/* SVG Version */}
            <div className="group relative">
              <img 
                src="/icon.svg" 
                alt="IO Core Icon SVG" 
                className="h-20 w-20 rounded-[18px] shadow-lg border border-slate-100 transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <a 
                href="/icon.svg" 
                download="IOtConnect-Icon.svg"
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-[8px] font-black text-white uppercase tracking-tighter">Save SVG</span>
              </a>
            </div>

            {/* PNG Version */}
            <div className="group relative">
              {pngUrl ? (
                <>
                  <img 
                    src={pngUrl} 
                    alt="IO Core Icon PNG" 
                    className="h-20 w-20 rounded-[18px] shadow-lg border border-slate-100 transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <a 
                    href={pngUrl} 
                    download="IOtConnect-Icon.png"
                    className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 rounded-[18px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <span className="text-[8px] font-black text-white uppercase tracking-tighter">Save PNG</span>
                  </a>
                </>
              ) : (
                <div className="h-20 w-20 rounded-[18px] border border-dashed border-slate-200 flex items-center justify-center animate-pulse">
                  <div className="h-4 w-4 bg-slate-100 rounded-full" />
                </div>
              )}
            </div>
          </div>
          <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-300 mt-2">IOtConnect core v1.2.0-SIM</p>
        </div>
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
                  Abort Action
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
