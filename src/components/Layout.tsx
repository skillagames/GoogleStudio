import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Plus, 
  User as UserIcon, 
  Bell,
  Settings, 
  ChevronLeft, 
  LayoutDashboard,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { notificationService } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  showBack?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showBack }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin } = useAuth();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    if (user) {
      const checkAlerts = async () => {
        const alerts = await notificationService.getAlerts(user.uid);
        setAlertCount(alerts.length);
      };
      checkAlerts();
      
      // Update count periodically if on dashboard or alerts page
      const interval = setInterval(checkAlerts, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [user]);

  // Toggle for easy undo if requested
  const ENABLE_LOGO_ANIMATION = true;

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Plus, label: 'Scan', path: '/scan' },
    { icon: Bell, label: 'Alerts', path: '/alerts' },
    { icon: UserIcon, label: 'Profile', path: '/profile' },
  ];

  if (isAdmin) {
    navItems.splice(2, 0, { icon: ShieldCheck, label: 'Admin', path: '/admin' });
  }

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <div className="flex min-h-screen flex-col pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-between px-4">
          <div className="flex items-center">
            {showBack && (
              <button 
                onClick={() => navigate(-1)}
                className="rounded-full p-2 hover:bg-slate-100"
              >
                <ChevronLeft className="h-6 w-6 text-slate-600" />
              </button>
            )}
          </div>

          {/* Centered Logo */}
          <div 
            onClick={() => navigate('/')}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 cursor-pointer transition-transform active:scale-95"
          >
            <motion.div 
              initial={ENABLE_LOGO_ANIMATION ? { scale: 0.5, opacity: 0, rotate: -15 } : {}}
              animate={ENABLE_LOGO_ANIMATION ? { scale: 1, opacity: 1, rotate: 0 } : {}}
              transition={{ 
                type: "spring", 
                stiffness: 260, 
                damping: 20,
                delay: 0.1
              }}
              className="bg-black text-white px-1.5 py-0.5 rounded font-black text-base leading-tight shadow-sm"
            >
              IoT
            </motion.div>
            <div className="flex flex-col leading-none">
              <motion.span 
                initial={ENABLE_LOGO_ANIMATION ? { x: -10, opacity: 0 } : {}}
                animate={ENABLE_LOGO_ANIMATION ? { x: 0, opacity: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-lg font-black tracking-tighter text-slate-900"
              >
                Connect
              </motion.span>
            </div>
          </div>
          
          <div className="flex items-center">
            <button 
              onClick={handleLogout}
              className="rounded-full p-2 text-slate-300 hover:bg-slate-100 hover:text-red-500 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6 px-safe">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2 pb-safe">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 transition-colors relative",
                location.pathname === item.path ? "text-primary" : "text-slate-400"
              )}
            >
              <item.icon className="h-6 w-6" />
              {item.label === 'Alerts' && alertCount > 0 && (
                <span className="absolute right-3.5 top-2 flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500"></span>
                </span>
              )}
              <span className="text-[10px] uppercase tracking-widest font-bold">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
