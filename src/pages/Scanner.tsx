import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Scan, AlertCircle, CheckCircle2, Keyboard, Camera as CameraIcon, ArrowRight, X } from 'lucide-react';
import { Camera as CapacitorCamera } from '@capacitor/camera';
import { deviceService } from '../services/deviceService';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Capacitor } from '@capacitor/core';

const Scanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionState, setPermissionState] = useState<string>('prompt');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);
  const scannerId = "reader";

  // New helper to handle native capacitor permissions
  const requestCameraPermissions = async () => {
    // Only run this if we are in a native capacitor environment (Android/iOS)
    if (!Capacitor.isNativePlatform()) return true;

    try {
      const status = await CapacitorCamera.checkPermissions();
      
      if (status.camera === 'granted') {
        return true;
      }

      const request = await CapacitorCamera.requestPermissions({
        permissions: ['camera']
      });

      if (request.camera === 'granted') {
        return true;
      }

      setError("Camera permission denied at OS level. Please check App Settings.");
      return false;
    } catch (err) {
      console.error("Native permission check failed", err);
      // Fallback: let the browser getUserMedia try anyway
      return true;
    }
  };

  const startScanner = async () => {
    if (isTransitioningRef.current) return;
    
    // Check if the reader element exists in the DOM
    const readerElement = document.getElementById(scannerId);
    if (!readerElement) {
      console.warn("Scanner element not found in DOM yet.");
      return;
    }

    try {
      isTransitioningRef.current = true;
      
      // Step 1: Force native permission prompt if on Android/iOS
      const hasPermission = await requestCameraPermissions();
      if (!hasPermission) {
        isTransitioningRef.current = false;
        return;
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

      // If already scanning, don't start again
      if (html5QrCodeRef.current.isScanning) {
        setCameraActive(true);
        isTransitioningRef.current = false;
        return;
      }

      setCameraActive(true);
      setError(null);

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleDetected(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error("Camera access failed", err);
      // Only set error if it's a real failure, not just a transition conflict
      if (!err?.toString().includes("already under transition")) {
        setError("Camera access blocked or not found. Try manual entry.");
      }
      setCameraActive(false);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const stopScanner = async () => {
    if (isTransitioningRef.current) return;
    
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        isTransitioningRef.current = true;
        await html5QrCodeRef.current.stop();
        setCameraActive(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      } finally {
        isTransitioningRef.current = false;
      }
    }
  };

  useEffect(() => {
    let timeoutId: any;
    
    const syncScanner = async () => {
      if (activeTab === 'scan' && !scanResult) {
        // Short delay to ensure DOM is ready and previous state finished
        timeoutId = setTimeout(() => {
          startScanner();
        }, 100);
      } else {
        await stopScanner();
      }
    };

    syncScanner();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      stopScanner();
    };
  }, [activeTab, scanResult]);

  const handleDetected = (code: string) => {
    setScanResult(code);
    setDeviceInfo({
      serialNumber: code,
      name: `Terminal ${code.substring(0, 4).toUpperCase()}`,
      imei: '',
      iccid: ''
    });
    stopScanner();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleDetected(manualCode.trim());
  };

  const handleRegister = async () => {
    if (!user || !deviceInfo) return;
    setRegistering(true);
    try {
      const deviceId = await deviceService.registerDevice({
        serialNumber: deviceInfo.serialNumber,
        name: deviceInfo.name,
        imei: deviceInfo.imei || 'N/A',
        iccid: deviceInfo.iccid || 'N/A',
        ownerId: user.uid,
        planId: 'default-plan'
      });
      navigate(`/devices/${deviceId}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="flex max-h-[calc(100vh-140px)] flex-col space-y-4 overflow-hidden py-1">
      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-[20px] bg-slate-100 p-1">
        <button 
          onClick={() => { setActiveTab('scan'); setScanResult(null); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'scan' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          )}
        >
          <CameraIcon className="h-3.5 w-3.5" /> Scan Code
        </button>
        <button 
          onClick={() => { setActiveTab('manual'); setScanResult(null); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'manual' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          )}
        >
          <Keyboard className="h-3.5 w-3.5" /> Manual Entry
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!scanResult ? (
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="h-full space-y-4"
            >
              {activeTab === 'scan' ? (
                <div className="relative aspect-square w-full overflow-hidden rounded-[40px] border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/50">
                   <div id={scannerId} className="h-full w-full object-cover grayscale-[0.5]" />
                   
                   {!cameraActive && !error && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
                        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initializing Core...</span>
                     </div>
                   )}

                   {error && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-10 text-center">
                        <AlertCircle className="h-10 w-10 text-red-400" />
                        <span className="text-xs font-bold text-slate-900">{error}</span>
                        <button 
                          onClick={() => setActiveTab('manual')}
                          className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary underline"
                        >
                          Switch to Manual
                        </button>
                     </div>
                   )}

                   {cameraActive && (
                     <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                       <motion.div 
                          animate={{ scale: [1, 1.05, 1], borderColor: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)'] }}
                          transition={{ repeat: Infinity, duration: 2 }}
                          className="h-40 w-40 rounded-[32px] border-2 border-slate-900/10 shadow-[0_0_0_9999px_rgba(255,255,255,0.4)]"
                       />
                       <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 animate-[scan-line_2s_linear_infinite] bg-emerald-400 shadow-[0_0_15px_#10b981]" />
                     </div>
                   )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="rounded-[32px] border-2 border-slate-100 bg-white p-8 space-y-6 shadow-sm">
                   <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-slate-50 text-slate-900">
                      <Keyboard className="h-8 w-8" />
                   </div>
                   <div className="space-y-1">
                      <h3 className="text-xl font-black tracking-tight text-slate-900">Manual Provisioning</h3>
                      <p className="text-xs font-medium text-slate-500">Enter the hardware serial number from the back of your device.</p>
                   </div>
                   <div className="space-y-3">
                      <input 
                        type="text"
                        placeholder="ENTER SERIAL NUMBER"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        className="w-full rounded-[20px] bg-slate-50 border-2 border-slate-50 px-5 py-4 text-sm font-black tracking-widest text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                      />
                      <button 
                        type="submit"
                        disabled={!manualCode.trim()}
                        className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 py-4 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-30"
                      >
                        Search Database <ArrowRight className="h-4 w-4" />
                      </button>
                   </div>
                </form>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-[32px] border-2 border-slate-900 bg-white p-6 shadow-xl shadow-slate-900/5">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <button onClick={() => setScanResult(null)} className="rounded-full bg-slate-50 p-2 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="mt-6 space-y-1">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Identified</h4>
                  <p className="text-lg font-black tracking-tight text-slate-900 font-mono underline decoration-emerald-400">SN: {deviceInfo?.serialNumber}</p>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Friendly Name</label>
                    <input 
                      type="text"
                      value={deviceInfo?.name}
                      onChange={(e) => setDeviceInfo({ ...deviceInfo, name: e.target.value })}
                      className="w-full rounded-[18px] bg-slate-50 border-2 border-slate-50 p-4 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">IMEI</label>
                      <input 
                        type="text"
                        placeholder="..."
                        value={deviceInfo?.imei}
                        onChange={(e) => setDeviceInfo({ ...deviceInfo, imei: e.target.value })}
                        className="w-full rounded-[18px] bg-slate-50 border-2 border-slate-50 p-4 text-[10px] font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">ICCID</label>
                      <input 
                        type="text"
                        placeholder="..."
                        value={deviceInfo?.iccid}
                        onChange={(e) => setDeviceInfo({ ...deviceInfo, iccid: e.target.value })}
                        className="w-full rounded-[18px] bg-slate-50 border-2 border-slate-50 p-4 text-[10px] font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleRegister}
                    disabled={registering}
                    className="flex w-full items-center justify-center gap-3 rounded-[20px] bg-slate-900 py-5 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {registering ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : "Commit Registration"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0%, 100% { top: 10%; opacity: 0.1; }
          50% { top: 90%; opacity: 1; }
        }
        #reader video { 
          width: 100% !important; 
          height: 100% !important; 
          object-fit: cover !important;
          border-radius: 40px !important;
        }
      `}} />
    </div>
  );
};

export default Scanner;
