import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Scan, AlertCircle, CheckCircle2, Keyboard, Camera, ArrowRight, X } from 'lucide-react';
import { deviceService } from '../services/deviceService';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const Scanner: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [isHardwareLocked, setIsHardwareLocked] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [permissionState, setPermissionState] = useState<PermissionState | 'unknown'>('unknown');
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);
  const scannerId = "reader";

  const checkPermissions = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      setPermissionState(result.state);
      
      result.onchange = () => {
        setPermissionState(result.state);
      };
      
      return result.state;
    } catch (err) {
      console.warn("Permissions API not supported or failed", err);
      return 'unknown';
    }
  };

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      setPermissionState('granted');
      return true;
    } catch (err) {
      console.error("Permission request denied", err);
      setPermissionState('denied');
      return false;
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

    // Proactively check/request permissions
    const currentState = await checkPermissions();
    if (currentState === 'denied') {
      setError("Camera access is required. Please enable it in your browser settings.");
      return;
    }
    
    if (currentState === 'prompt' || currentState === 'unknown') {
      const granted = await requestPermission();
      if (!granted) {
        setError("Camera permission denied. Access is required for scanning.");
        return;
      }
    }

    try {
      isTransitioningRef.current = true;
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
          qrbox: { width: 280, height: 280 },
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

  const handleDetected = async (code: string) => {
    try {
      const hardwareData = await deviceService.verifyHardware(code);
      if (!hardwareData) {
        setError("Core Recon Failed: Doesn't recognize device.");
        setScanResult(null);
        return;
      }

      setScanResult(code);
      setIsHardwareLocked(true); // Always lock if found in master registry
      setDeviceInfo({
        serialNumber: code,
        name: hardwareData.model || `Terminal ${code.substring(0, 4).toUpperCase()}`,
        imei: hardwareData.imei || 'N/A',
        iccid: hardwareData.iccid || 'N/A'
      });
      stopScanner();
    } catch (err) {
      console.error("Verification error", err);
      setError("System check failed. Please try again.");
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleDetected(manualCode.trim());
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
    <div className="flex flex-col h-[calc(100vh-170px)] space-y-6 py-2">
      {/* Tab Switcher */}
      <div className="flex gap-1 rounded-[20px] bg-slate-100 p-1 shrink-0">
        <button 
          onClick={() => { setActiveTab('scan'); setScanResult(null); }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-[16px] py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
            activeTab === 'scan' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
          )}
        >
          <Camera className="h-3.5 w-3.5" /> Scan Code
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

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-[340px]">
          <AnimatePresence mode="wait">
            {!scanResult ? (
              <motion.div 
                key={activeTab}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="w-full relative aspect-[1/1.1]"
              >
                {activeTab === 'scan' ? (
                  <div className="h-full w-full overflow-hidden rounded-[40px] border-2 border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                     <div id={scannerId} className="h-full w-full object-cover grayscale-[0.5]" />
                     
                     {!cameraActive && !error && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
                          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initializing Core...</span>
                       </div>
                     )}

                     {error && (
                       <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white px-8 text-center">
                          <AlertCircle className="h-8 w-8 text-red-500" />
                          <span className="text-[13px] font-bold text-slate-900 leading-snug">{error}</span>
                          
                          <div className="flex flex-col gap-2 w-full mt-4">
                            <button 
                              onClick={() => {
                                setError(null);
                                startScanner();
                              }}
                              className="bg-slate-900 text-white rounded-[16px] py-3.5 text-[10px] font-black uppercase tracking-widest active:scale-95 transition-transform"
                            >
                              Try Again
                            </button>
                            <button 
                              onClick={() => setActiveTab('manual')}
                              className="text-[10px] font-black uppercase tracking-widest text-slate-400 underline"
                            >
                              Manual Entry
                            </button>
                          </div>
                       </div>
                     )}

                     {cameraActive && (
                       <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                         <motion.div 
                            animate={{ scale: [1, 1.05, 1], borderColor: ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)'] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="h-56 w-56 rounded-[48px] border-2 border-slate-900/10 shadow-[0_0_0_9999px_rgba(255,255,255,0.4)]"
                         />
                         <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 animate-[scan-line_2s_linear_infinite] bg-emerald-400 shadow-[0_0_15px_#10b981]" />
                       </div>
                     )}
                  </div>
                ) : (
                  <form onSubmit={handleManualSubmit} className="h-full w-full rounded-[40px] border-2 border-slate-200 bg-white p-7 flex flex-col justify-center items-center text-center shadow-xl shadow-slate-200/50 overflow-hidden">
                     <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-50 text-slate-900 mb-4 shrink-0">
                        <Keyboard className="h-6 w-6" />
                     </div>
                     <div className="space-y-0.5 mb-6">
                        <h3 className="text-lg font-black tracking-tight text-slate-900 leading-none">Manual Entry</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Transmit serial code</p>
                     </div>
                     <div className="w-full space-y-2.5">
                        <input 
                          type="text"
                          placeholder="ENTER SERIAL NUMBER"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                          className="w-full rounded-[20px] bg-slate-50 border-2 border-slate-50 px-5 py-4 text-xs font-black tracking-widest text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all placeholder:text-slate-300"
                        />
                        <button 
                          type="submit"
                          disabled={!manualCode.trim()}
                          className="flex h-14 w-full items-center justify-center gap-2 rounded-[20px] bg-slate-900 text-xs font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-30 shadow-lg shadow-slate-950/20"
                        >
                          Verify Hardware <ArrowRight className="h-4 w-4" />
                        </button>
                     </div>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full relative aspect-[1/1.1]"
              >
                <div className="h-full w-full rounded-[40px] border-2 border-slate-900 bg-white p-6 flex flex-col shadow-2xl shadow-slate-900/15 overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none">Device Identified</h4>
                      <p className="text-sm font-black tracking-tight text-slate-900 font-mono leading-none pt-1">SN: {deviceInfo?.serialNumber}</p>
                      <div className="h-1 w-8 bg-emerald-400 rounded-full mt-2" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-emerald-50 text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <button onClick={() => setScanResult(null)} className="rounded-full bg-slate-50 p-1.5 text-slate-400 hover:bg-slate-100 transition-colors">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">Friendly Name</label>
                      <input 
                        type="text"
                        value={deviceInfo?.name}
                        onChange={(e) => setDeviceInfo({ ...deviceInfo, name: e.target.value })}
                        className="w-full rounded-[16px] bg-slate-50 border-2 border-slate-50 p-3 text-xs font-bold text-slate-900 focus:border-slate-900 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">IMEI</label>
                        <input 
                          type="text"
                          placeholder="..."
                          readOnly={isHardwareLocked}
                          value={deviceInfo?.imei}
                          onChange={(e) => setDeviceInfo({ ...deviceInfo, imei: e.target.value })}
                          className={cn(
                            "w-full rounded-[16px] border-2 p-2.5 text-[10px] font-bold transition-all focus:outline-none",
                            isHardwareLocked ? "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50 border-slate-50 text-slate-900 focus:border-slate-900 focus:bg-white"
                          )}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 px-1">ICCID</label>
                        <input 
                          type="text"
                          placeholder="..."
                          readOnly={isHardwareLocked}
                          value={deviceInfo?.iccid}
                          onChange={(e) => setDeviceInfo({ ...deviceInfo, iccid: e.target.value })}
                          className={cn(
                            "w-full rounded-[16px] border-2 p-2.5 text-[10px] font-bold transition-all focus:outline-none",
                            isHardwareLocked ? "bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50 border-slate-50 text-slate-900 focus:border-slate-900 focus:bg-white"
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-2">
                    <button 
                      onClick={handleRegister}
                      disabled={registering}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-slate-900 text-[11px] font-black uppercase tracking-widest text-white transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-slate-950/20"
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
