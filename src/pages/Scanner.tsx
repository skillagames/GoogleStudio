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
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isTransitioningRef = useRef(false);
  const scannerId = "reader";

  // ✅ NEW: Force camera permission request
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error("Permission request failed:", err);
      setError("Camera permission denied. Please allow camera access.");
      return false;
    }
  };

  const startScanner = async () => {
    if (isTransitioningRef.current) return;

    // ✅ NEW: Force permission BEFORE starting scanner
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setCameraActive(false);
      return;
    }

    const readerElement = document.getElementById(scannerId);
    if (!readerElement) {
      console.warn("Scanner element not found in DOM yet.");
      return;
    }

    try {
      isTransitioningRef.current = true;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId);
      }

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
    // ⬇️ unchanged UI (left exactly as you had it)
    <div className="flex max-h-[calc(100vh-140px)] flex-col space-y-4 overflow-hidden py-1">
      {/* ... KEEP EVERYTHING BELOW EXACTLY THE SAME ... */}
