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
  const [selectedPlan, setSelectedPlan] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'cancel' | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin to ensure it's from our app
      if (event.origin !== window.location.origin) return;
      
      if (event.data?.type === 'PAYFAST_PAYMENT_RESULT') {
        const { status } = event.data;
        if (status === 'success') {
          setPaymentStatus('success');
          // Wait a bit then refresh device data
          setTimeout(loadData, 2000);
        } else {
          setPaymentStatus('cancel');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const PLANS = [
    { id: 0, name: "Starter Pulse", price: "$4.99", desc: "Basic connectivity for 30 days" },
    { id: 1, name: "Monthly Booster", price: "$9.99", desc: "Unlimited data for 30 days" },
    { id: 2, name: "Quarterly Core", price: "$24.99", desc: "Solid performance for 90 days" },
    { id: 3, name: "Annual Pro", price: "$89.99", desc: "Best value for power users" }
  ];

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
    try {
      const plan = PLANS[selectedPlan];
      // PayFast requires amount to have 2 decimal places (e.g. 10.00)
      const amount = parseFloat(plan.price.replace('$', '')).toFixed(2);
      const m_payment_id = `INFRA-${id}-${Date.now()}`;
      
      // Use our backend callback route
      const baseUrl = window.location.origin;
      const return_url = `${baseUrl}/api/payments/payfast-callback?status=success`;
      const cancel_url = `${baseUrl}/api/payments/payfast-callback?status=cancel`;
      const notify_url = 'https://webhook.site/placeholder';
      
      // Request signature from our backend
      const response = await fetch('/api/payments/payfast-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          item_name: plan.name,
          m_payment_id,
          return_url,
          cancel_url,
          notify_url 
        })
      });

      const { signature, merchant_id, merchant_key, sandbox_url } = await response.json();

      // Clear renewing state
      setIsRenewing(false);
      setShowRenewModal(false);

      // Open a popup for the payment
      const paymentWindow = window.open('about:blank', 'payfast_popup', 'width=500,height=700');
      
      if (!paymentWindow) {
        alert('Please allow popups to complete the payment.');
        return;
      }

      // Create and submit PayFast form in the POPUP
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = sandbox_url;
      form.target = 'payfast_popup';

      const fields = {
        merchant_id,
        merchant_key,
        return_url,
        cancel_url,
        notify_url,
        m_payment_id,
        amount,
        item_name: plan.name,
        signature
      };

      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error('Payment initialization failed:', err);
      setIsRenewing(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div></div>;
  if (!device) return <div className="text-center py-12 text-slate-500">Device not found</div>;

  const isExpired = device.subscriptionStatus === 'expired';
  const expirationDate = new Date(device.expirationDate.seconds * 1000);

  return (
    <div className="space-y-6 pb-12">
      {/* Payment Status Banners */}
      <AnimatePresence>
        {paymentStatus === 'success' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-xs font-black text-emerald-900 uppercase">Protocol Success</p>
                <p className="text-[10px] text-emerald-600 font-medium">Node subscription is currently processing renewal.</p>
              </div>
              <button onClick={() => setPaymentStatus(null)} className="ml-auto text-emerald-400"><XCircle className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
        {paymentStatus === 'cancel' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-xs font-black text-slate-900 uppercase">Action Aborted</p>
                <p className="text-[10px] text-slate-500 font-medium">The payment process was cancelled by the operator.</p>
              </div>
              <button onClick={() => setPaymentStatus(null)} className="ml-auto text-slate-300"><XCircle className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRenewModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-[32px] bg-white p-5 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 mb-3">
                    <CreditCard className="h-5 w-5" />
                 </div>
                 <h2 className="text-lg font-black text-slate-900 tracking-tight">Reactivate Node</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select connectivity payload</p>
                 
                 <div className="mt-4 w-full space-y-1.5">
                    {PLANS.map((plan) => {
                      const { id, ...rest } = plan;
                      return (
                        <PlanOption 
                          key={id}
                          {...rest}
                          active={selectedPlan === id}
                          onClick={() => setSelectedPlan(id)}
                        />
                      );
                    })}
                 </div>

                 <div className="mt-5 w-full space-y-2">
                   <button 
                    onClick={handleRenew}
                    disabled={isRenewing}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-3.5 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95 disabled:opacity-50"
                   >
                     {isRenewing ? (
                       <RefreshCcw className="h-4 w-4 animate-spin" />
                     ) : (
                       <>Execute Protocol</>
                     )}
                   </button>
                   <button 
                    onClick={() => setShowRenewModal(false)}
                    className="w-full py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                   >
                     Abort Action
                   </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailBadge = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
      <Icon className="h-5 w-5" />
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-900 italic leading-none">{value}</p>
    </div>
  </div>
);

interface PlanOptionProps {
  key?: number | string;
  name: string;
  price: string;
  desc: string;
  active?: boolean;
  onClick: () => void;
}

const PlanOption = ({ name, price, desc, active, onClick }: PlanOptionProps) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex w-full items-center justify-between rounded-2xl border p-3.5 text-left transition-all active:scale-[0.98]",
      active ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10" : "border-slate-100 bg-white hover:border-slate-200"
    )}
  >
    <div className="min-w-0">
      <h4 className={cn("font-black text-[11px] uppercase tracking-wider truncate", active ? "text-white" : "text-slate-900")}>{name}</h4>
      <p className={cn("text-[9px] font-medium leading-none mt-1", active ? "text-white/60" : "text-slate-400")}>{desc}</p>
    </div>
    <div className="text-right ml-4 shrink-0">
      <p className={cn("text-xs font-black", active ? "text-white" : "text-slate-900")}>{price}</p>
    </div>
  </button>
);

export default DeviceDetails;
