import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, ChevronRight, RefreshCcw } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { cn, formatDate } from '../lib/utils';

const Alerts: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadAlerts();
    }
  }, [user]);

  const loadAlerts = async () => {
    setLoading(true);
    const data = await notificationService.getAlerts(user!.uid);
    setAlerts(data);
    setLoading(false);
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Security Alerts</h1>
        <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Critical Connectivity Status</p>
      </header>

      <div className="grid gap-3">
        {alerts.length > 0 ? (
          alerts.map((alert, idx) => (
            <motion.button
              key={alert.deviceId + alert.type}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(`/devices/${alert.deviceId}`)}
              className={cn(
                "group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] bg-white p-4 border transition-all active:scale-[0.98] shadow-sm text-left",
                alert.type === 'expired' ? "border-red-100" : alert.type === 'inactive' ? "border-slate-100" : "border-orange-100"
              )}
            >
              <div className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]",
                alert.type === 'expired' ? "bg-red-50 text-red-500" : alert.type === 'inactive' ? "bg-slate-50 text-slate-400" : "bg-orange-50 text-orange-500"
              )}>
                {alert.type === 'expired' ? <AlertTriangle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black tracking-tight text-slate-900">{alert.deviceName}</h4>
                  <span className="text-[8px] font-black uppercase text-slate-400">
                    {alert.type === 'expired' ? 'CRITICAL' : alert.type === 'inactive' ? 'PENDING' : 'WARNING'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-0.5">{alert.message}</p>
                <p className="text-[9px] font-medium text-slate-400 mt-1 italic">
                  {alert.type === 'expired' ? 'Expired on ' : alert.type === 'inactive' ? 'Waiting for provision since ' : 'Expiring on '}
                  {alert.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              <ChevronRight className="h-4 w-4 text-slate-300" />
            </motion.button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-[32px] bg-slate-50 text-slate-200 border border-slate-100 shadow-inner">
              <Bell className="h-10 w-10" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-black text-slate-900 uppercase">Clear Horizon</p>
              <p className="text-[10px] text-slate-400 font-medium max-w-[200px]">All cluster peripherals are currently operating within valid subscription parameters.</p>
            </div>
            <button 
              onClick={loadAlerts}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80"
            >
              <RefreshCcw className="h-3 w-3" />
              Re-scan Cluster
            </button>
          </div>
        )}
      </div>

      {/* Quick Actions if there are alerts */}
      {alerts.length > 0 && (
        <div className="rounded-[28px] bg-slate-900 p-6 text-white shadow-xl shadow-slate-900/20">
           <h3 className="text-xs font-black uppercase tracking-widest leading-none mb-2">Protocol Suggestion</h3>
           <p className="text-[10px] text-slate-400 font-medium leading-relaxed mb-4">
             Detected {alerts.length} device(s) requiring immediate attention. Tap on an alert to initiate the renewal protocol and restore full telemetry sync.
           </p>
           <button 
            onClick={() => navigate('/devices')}
            className="w-full rounded-xl bg-white/10 py-2.5 text-[9px] font-black uppercase tracking-widest text-white hover:bg-white/20 transition-colors"
           >
             Manage Subscription Matrix
           </button>
        </div>
      )}
    </div>
  );
};

export default Alerts;
