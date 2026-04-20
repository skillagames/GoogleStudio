import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Battery, Signal, ChevronRight, PlusCircle, AlertCircle, X, Zap, Activity, ShieldCheck } from 'lucide-react';
import { deviceService, Device } from '../services/deviceService';
import { useAuth } from '../context/AuthContext';
import { formatDate, cn } from '../lib/utils';
import { motion } from 'motion/react';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'expired' | 'inactive' | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadDevices();
      deviceService.seedMasterRegistry();
    }
  }, [user]);

  useEffect(() => {
    const handleScroll = () => {
      // Logic to toggle sticky state based on hero section height (approx 240px)
      if (window.scrollY > 220) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadDevices = async () => {
    try {
      const data = await deviceService.getUserDevices(user!.uid);
      setDevices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
    </div>
  );

  const firstName = profile?.displayName?.split(' ')[0] || 'Member';
  
  const filteredDevices = filter 
    ? devices.filter(d => d.subscriptionStatus === filter)
    : devices;

  return (
    <div className="space-y-5 pb-10">
      {/* Hero Welcome Section - Compact & Centralized */}
      <section className="relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-4 shadow-sm">
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex flex-col items-center text-center space-y-4"
        >
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Device Cluster Control</span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">
              Hello, <span className="text-primary">{firstName}</span>
            </h1>
          </div>
          
          <div className="flex w-full max-w-[240px] flex-col gap-1.5">
            <button 
              onClick={() => navigate('/scan')}
              className="group flex w-full items-center justify-center gap-2 rounded-[16px] bg-slate-900 py-2.5 text-white transition-all active:scale-95"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">Add Device</span>
            </button>
            <button 
              onClick={() => navigate('/devices')}
              className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-slate-50 border border-slate-100 py-2 text-slate-900 transition-all active:scale-95"
            >
              <Smartphone className="h-3.5 w-3.5" />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]">View Inventory</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* Stats Quick View - Constant Sticky Header */}
      <section className={cn(
        "sticky top-[64px] z-20 py-2 transition-colors duration-200",
        isSticky ? "bg-bg-main/90 backdrop-blur-md" : "bg-transparent"
      )}>
        <div className="grid grid-cols-3 gap-2">
          <StatCard 
            label="ACTIVE" 
            value={devices.filter(d => d.subscriptionStatus === 'active').length.toString()} 
            color="emerald" 
            icon={Signal}
            isActive={filter === 'active'}
            onClick={() => setFilter(filter === 'active' ? null : 'active')}
          />
          <StatCard 
            label="EXPIRED" 
            value={devices.filter(d => d.subscriptionStatus === 'expired').length.toString()} 
            color="orange" 
            icon={AlertCircle}
            isActive={filter === 'expired'}
            onClick={() => setFilter(filter === 'expired' ? null : 'expired')}
          />
          <StatCard 
            label="PENDING" 
            value={devices.filter(d => d.subscriptionStatus === 'inactive').length.toString()} 
            color="slate" 
            icon={Smartphone}
            isActive={filter === 'inactive'}
            onClick={() => setFilter(filter === 'inactive' ? null : 'inactive')}
          />
        </div>
      </section>

      {/* Device List Header & Natural List */}
      <section>
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Quick Inventory</h2>
            {filter && (
               <button 
                onClick={() => setFilter(null)}
                className="flex items-center gap-1 rounded-full bg-slate-900 px-2 py-0.5 text-[8px] font-bold text-white uppercase tracking-tighter"
               >
                 {filter} <X className="h-2 w-2" />
               </button>
            )}
          </div>
          <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tight">{filteredDevices.length} DEVICE(S)</span>
        </div>
        
        <div className="grid gap-3">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((device, idx) => (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.03 }}
                key={device.id}
              >
                <DeviceCard device={device} onClick={() => navigate(`/devices/${device.id}`)} />
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-white border border-slate-100 text-slate-200 shadow-sm">
                <Smartphone className="h-8 w-8" />
              </div>
              <p className="text-xs font-bold text-slate-400">{filter ? `No ${filter} devices found` : 'No devices provisioned'}</p>
              {!filter && (
                <button 
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await deviceService.seedDevices(user!.uid);
                      await loadDevices();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-primary underline"
                >
                  Seed Simulation
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Cluster Insights Section */}
      {profile?.showInsights !== false && (
        <section className="space-y-4 pt-2">
           <div className="flex items-center justify-between mb-2">
              <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Cluster Insights</h2>
              <div className="flex h-1 w-12 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary w-2/3" />
              </div>
           </div>

           <div className="grid gap-4">
              {/* Health Overview Card */}
              <div className="relative overflow-hidden rounded-[32px] border border-slate-100 bg-white p-6 shadow-sm">
                 <div className="flex items-center gap-6">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                       <svg className="h-full w-full -rotate-90 transform">
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-50" />
                          <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray="226.2" strokeDashoffset={226.2 - (226.2 * (devices.filter(d => d.subscriptionStatus === 'active').length / (devices.length || 1)))} className="text-primary transition-all duration-1000 ease-out" />
                       </svg>
                       <div className="absolute flex flex-col items-center leading-none">
                          <span className="text-lg font-black text-slate-900">{Math.round((devices.filter(d => d.subscriptionStatus === 'active').length / (devices.length || 1)) * 100)}%</span>
                          <span className="text-[7px] font-black uppercase text-slate-400">Health</span>
                       </div>
                    </div>
                    
                    <div className="space-y-3">
                       <div>
                          <h4 className="text-xs font-black text-slate-900 uppercase">Operational Status</h4>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Your cluster is currently performing at optimized capacity with {devices.filter(d => d.subscriptionStatus === 'active').length} active devices.</p>
                       </div>
                       <div className="flex gap-4">
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Throughput</p>
                             <p className="text-xs font-black text-slate-900 italic">2.4 GB/s</p>
                          </div>
                          <div className="space-y-0.5">
                             <p className="text-[8px] font-black text-slate-400 uppercase">Latency</p>
                             <p className="text-xs font-black text-slate-900 italic">12ms</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Recent Activity Log */}
              <div className="rounded-[32px] border border-slate-100 bg-slate-50 p-6">
                 <div className="flex items-center gap-2 mb-4">
                    <Activity className="h-3.5 w-3.5 text-slate-400" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recent Logistics</h4>
                 </div>
                 
                 <div className="space-y-4">
                    <LogItem icon={Zap} title="Telemetry Pulse" desc="Device Pro Route X1 transmitted usage metrics" time="2m ago" color="blue" />
                    <LogItem icon={ShieldCheck} title="Service Renewal" desc="Field Monitor M1 subscription auto-renewed" time="1h ago" color="emerald" />
                    <LogItem icon={AlertCircle} title="Low Signal" desc="Enterprise Hub G5 reporting intermittent latency" time="3h ago" color="orange" />
                 </div>
              </div>
           </div>
        </section>
      )}
    </div>
  );
};

const LogItem = ({ icon: Icon, title, desc, time, color }: { icon: any, title: string, desc: string, time: string, color: 'blue' | 'emerald' | 'orange' }) => (
  <div className="flex gap-4">
     <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100",
        color === 'blue' && "text-blue-500",
        color === 'emerald' && "text-emerald-500",
        color === 'orange' && "text-orange-500"
     )}>
        <Icon className="h-4 w-4" />
     </div>
     <div className="flex-1 space-y-0.5">
        <div className="flex items-center justify-between">
           <h5 className="text-[10px] font-black text-slate-900 uppercase">{title}</h5>
           <span className="text-[8px] font-bold text-slate-400">{time}</span>
        </div>
        <p className="text-[10px] text-slate-500 font-medium leading-tight">{desc}</p>
     </div>
  </div>
);

const DeviceCard = ({ device, onClick }: { device: Device; onClick: () => void }) => {
  const isExpired = device.subscriptionStatus === 'expired';
  const isInactive = device.subscriptionStatus === 'inactive';
  
  return (
    <button 
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-4 overflow-hidden rounded-[24px] bg-white p-1.5 pr-5 border transition-all active:scale-[0.98] shadow-sm",
        isExpired ? "border-red-100/50" : isInactive ? "border-slate-50 opacity-90 border-dashed" : "border-slate-100 hover:border-slate-300"
      )}
    >
      <div className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-slate-50 text-slate-900 transition-colors group-hover:bg-slate-900 group-hover:text-white",
        isExpired && "bg-red-50 text-red-400",
        isInactive && "bg-slate-100 text-slate-400"
      )}>
        <Smartphone className="h-6 w-6" />
      </div>
      
      <div className="flex-1 text-left">
        <h4 className="text-sm font-black tracking-tight text-slate-900 line-clamp-1">{device.name}</h4>
        <div className="flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-tight">
          <span className={cn(
             isExpired ? "text-red-500" : isInactive ? "text-slate-400" : "text-emerald-500"
          )}>
            {isExpired ? 'Expired' : isInactive ? 'Inactive' : 'Active'}
          </span>
        </div>
      </div >

      <ChevronRight className="h-4 w-4 text-slate-300" />
    </button>
  );
};

const StatCard = ({ label, value, color, icon: Icon, isActive, onClick }: { label: string; value: string; color: 'emerald' | 'orange' | 'slate'; icon: any; isActive: boolean; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "relative overflow-hidden rounded-[20px] border transition-all text-left p-2.5 shadow-sm active:scale-95",
      isActive 
        ? (color === 'emerald' ? "border-emerald-500 bg-emerald-50/50 ring-1 ring-inset ring-emerald-500" : 
           color === 'orange' ? "border-orange-500 bg-orange-50/50 ring-1 ring-inset ring-orange-500" :
           "border-slate-500 bg-slate-50/50 ring-1 ring-inset ring-slate-500") 
        : "border-slate-100 bg-white"
    )}
  >
    <div className={cn(
      "absolute -right-2 -top-2 h-8 w-8 opacity-[0.03]",
      color === 'emerald' ? "text-emerald-500" : color === 'orange' ? "text-orange-500" : "text-slate-500"
    )}>
      <Icon className="h-full w-full" />
    </div>
    <p className="text-[7px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <div className="flex items-center gap-1.5 text-slate-900">
      <span className={cn(
        "text-sm font-black tracking-tighter",
        color === 'orange' && !isActive && "text-orange-600",
        color === 'slate' && !isActive && "text-slate-600"
      )}>{value}</span>
      <div className={cn(
        "h-1.5 w-1.5 rounded-full",
        color === 'emerald' ? "bg-emerald-400" : color === 'orange' ? "bg-orange-500" : "bg-slate-400"
      )} />
    </div>
  </button>
);

export default Dashboard;
