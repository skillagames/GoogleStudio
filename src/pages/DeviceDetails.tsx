import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  deviceService, 
  Device, 
  UsageStat 
} from '../services/deviceService';
import { 
  Activity, 
  Clock, 
  Database, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn } from '../lib/utils';

const DeviceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [stats, setStats] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [deviceData, statsData] = await Promise.all([
        deviceService.getDeviceById(id!),
        deviceService.getUsageStats(id!)
      ]);
      setDevice(deviceData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const syncTelemetry = async () => {
    if (!id) return;
    setIsRenewing(true);
    try {
      await deviceService.syncTelemetry(id);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenewing(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    // Simulate delay
    await new Promise(r => setTimeout(r, 1500));
    try {
      await deviceService.renewSubscription(id!);
      await loadData();
      setShowRenewModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenewing(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>;
  if (!device) return <div className="text-center py-12 text-slate-500">Device not found</div>;

  const isExpired = device.subscriptionStatus === 'expired';
  const expirationDate = new Date(device.expirationDate.seconds * 1000);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Card */}
      <section className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
         <div className={cn(
            "absolute -right-8 -top-8 h-32 w-32 rounded-full blur-3xl",
            isExpired ? "bg-red-500/10" : "bg-primary/10"
          )} />
          
          <div className="relative flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{device.name}</h2>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">SN: {device.serialNumber}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">IMEI: {device.imei || 'N/A'}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ICCID: {device.iccid || 'N/A'}</p>
              </div>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-tight",
              isExpired ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-600"
            )}>
              {isExpired ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
              {device.subscriptionStatus}
            </div>
          </div>

          <div className="mt-8 flex gap-4">
             <div className="flex-1">
                <p className="text-[10px] uppercase font-bold text-slate-500">Expires</p>
                <p className="text-lg font-bold text-slate-900">{formatDate(device.expirationDate, 'MMM dd, yyyy')}</p>
             </div>
             {isExpired && (
                <button 
                  onClick={() => setShowRenewModal(true)}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-2 text-sm font-bold text-white transition-transform active:scale-95 shadow-lg shadow-orange-500/20"
                >
                  <RefreshCcw className="h-4 w-4" /> Renew
                </button>
             )}
          </div>
      </section>

      {/* Usage Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Usage Statistics</h3>
          <button 
            onClick={syncTelemetry}
            disabled={isRenewing}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 disabled:opacity-50"
          >
            <RefreshCcw className={cn("h-3 w-3", isRenewing && "animate-spin")} />
            Sync Pulse
          </button>
        </div>
        <div className="relative h-[200px] w-full rounded-2xl bg-white border border-slate-200 p-2 shadow-sm">
          {stats.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Zero Telemetry Data</p>
                <p className="text-[10px] text-slate-500 max-w-[160px]">Push a pulse or seed historical metrics to view analytics.</p>
              </div>
              <button 
                onClick={async () => {
                  setIsRenewing(true);
                  try {
                    await deviceService.seedDeviceUsage(id!);
                    await loadData();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setIsRenewing(false);
                  }
                }}
                disabled={isRenewing}
                className="mt-1 rounded-full bg-slate-900 px-4 py-1.5 text-[9px] font-black uppercase tracking-widest text-white active:scale-95 disabled:opacity-50"
              >
                {isRenewing ? 'Seeding...' : 'Seed History'}
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" key={stats.length}>
              <AreaChart data={stats}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(val) => formatDate(val, 'dd')}
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#3b82f6', fontSize: '12px' }}
                  labelStyle={{ display: 'none' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="dataUsedMb" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <DetailBadge icon={Database} label="Total Data" value={`${stats.reduce((acc, s) => acc + s.dataUsedMb, 0).toLocaleString()} MB`} />
          <DetailBadge icon={Clock} label="Active Time" value={`${stats.reduce((acc, s) => acc + s.activeHours, 0)} Hrs`} />
        </div>
      </section>

      {/* Renew Modal */}
      <AnimatePresence>
        {showRenewModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenewModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-md rounded-t-[40px] bg-white p-8 sm:rounded-[32px] shadow-2xl"
            >
              <div className="flex flex-col items-center gap-4 text-center">
                 <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <CreditCard className="h-8 w-8" />
                 </div>
                 <h2 className="text-2xl font-black text-slate-900">Renew Subscription</h2>
                 <p className="text-sm text-slate-500">Choose a plan to reactivate your device services instantly.</p>
                 
                 <div className="mt-4 w-full space-y-3">
                    <PlanOption name="Monthly Booster" price="$9.99" desc="Unlimited data for 30 days" active />
                    <PlanOption name="Annual Pro" price="$89.99" desc="Best value for power users" />
                 </div>

                 <button 
                  onClick={handleRenew}
                  disabled={isRenewing}
                  className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-primary py-4 font-bold text-white transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-primary/20"
                 >
                   {isRenewing ? (
                     <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                   ) : (
                     <>Confirm Payment</>
                   )}
                 </button>
                 <button 
                  onClick={() => setShowRenewModal(false)}
                  className="text-sm font-bold text-slate-500"
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

const DetailBadge = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900 italic">{value}</p>
    </div>
  </div>
);

const PlanOption = ({ name, price, desc, active }: { name: string, price: string, desc: string, active?: boolean }) => (
  <div className={cn(
    "flex w-full items-center justify-between rounded-xl border p-4 text-left",
    active ? "border-primary bg-primary/5" : "border-slate-100 bg-white"
  )}>
    <div>
      <h4 className="font-bold text-slate-900 text-sm">{name}</h4>
      <p className="text-[10px] text-slate-500">{desc}</p>
    </div>
    <div className="text-right">
      <p className="text-sm font-bold text-primary">{price}</p>
    </div>
  </div>
);

export default DeviceDetails;
