import * as fs from 'fs';

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

const startStr = '<button \n                    onClick={handleTestNotification}';
const endStr = '{notificationService.getPermissionStatus() === \'pwa-required\' &&';

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const newUI = `
                   {/* --- Capacitor Native Engine Section --- */}
                   <div className="mt-6 border-t border-slate-700/50 pt-4">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.1em] text-sky-400/90 mb-2 flex items-center justify-between">
                       <span>Capacitor Native Engine</span>
                       <Activity className="h-3.5 w-3.5 text-sky-400" />
                     </h4>
                     <p className="text-[8px] text-slate-400 font-medium mb-3 leading-relaxed">
                       Primary method for bundled Android/iOS Apps using <strong>@capacitor/local-notifications</strong>.
                     </p>

                     <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-[16px]">
                       <input 
                         value={capTitle}
                         onChange={e => setCapTitle(e.target.value)}
                         placeholder="Notification Title"
                         className="w-full bg-slate-950/50 font-bold text-[10px] text-white px-3 py-2.5 rounded-lg mb-2 border border-white/5 outline-none focus:border-sky-500/50 transition-colors"
                       />
                       <textarea 
                         value={capNotifMsg}
                         onChange={e => setCapNotifMsg(e.target.value)}
                         placeholder="Notification Body..."
                         className="w-full bg-slate-950/50 text-slate-300 font-medium text-[10px] px-3 py-2.5 rounded-lg mb-3 border border-white/5 outline-none h-14 resize-none focus:border-sky-500/50 transition-colors"
                       />
                       <button
                         onClick={handleTestCapacitorPush}
                         className="flex w-full items-center justify-between rounded-xl bg-sky-500 py-3 px-4 shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 active:scale-95 relative overflow-hidden"
                       >
                         {capSuccess && (
                            <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center z-10 animate-in fade-in zoom-in duration-300">
                               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-950 flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Native Plugin Fired
                               </span>
                            </div>
                         )}
                         <span className="block text-[9px] font-black uppercase tracking-widest text-sky-950 relative z-0">Dispatch Native Alert</span>
                         <BellRing className="h-3.5 w-3.5 text-sky-950 relative z-0" />
                       </button>
                     </div>
                   </div>

                   {/* --- Web Push Engine Section --- */}
                   <div className="mt-8 border-t border-slate-700/50 pt-4 pb-4">
                     <div className="flex items-center justify-between mb-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.1em] flex-1 text-purple-400/90 flex items-center gap-2">
                         <span>Web Push Engine</span>
                         <Server className="h-3 w-3" />
                       </h4>
                       <button
                         onClick={() => setWebPushDisabled(!webPushDisabled)}
                         className={cn(
                           "px-2 py-1.5 rounded-md text-[8px] font-bold uppercase tracking-wider border transition-colors cursor-pointer",
                           webPushDisabled ? "bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"
                         )}
                       >
                         {webPushDisabled ? 'Web Actions Disabled' : 'Web Actions Enabled'}
                       </button>
                     </div>
                     <p className="text-[8px] text-slate-400 font-medium mb-3 leading-relaxed">
                       Standard Web APIs (Notification/SW). Best for Desktop/PWA. Toggle this off if you only want to test Capacitor natively to avoid duplicates.
                     </p>

                     <div className={cn("transition-opacity duration-300 flex flex-col gap-2 relative", webPushDisabled ? "opacity-30 pointer-events-none cursor-not-allowed" : "opacity-100")}>
                       {webPushDisabled && (
                         <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <span className="text-[10px] font-black uppercase text-red-400 bg-black/60 px-3 py-1 rounded-full border border-red-500/20 shadow-xl backdrop-blur-sm">
                               Web Engine Disabled
                            </span>
                         </div>
                       )}
                       <button 
                         onClick={handleTestNotification}
                         className="flex w-full items-center justify-between rounded-[16px] bg-white/5 border border-white/5 px-4 py-3 transition-all hover:bg-white/10"
                       >
                         <div className="flex items-center gap-3">
                           <Bell className={cn("h-3.5 w-3.5", notifSuccess ? 'text-emerald-400' : (notificationService.getPermissionStatus() === 'granted' ? 'text-emerald-400/50' : notificationService.getPermissionStatus() === 'pwa-required' ? 'text-orange-400' : 'text-slate-400'))} />
                           <div className="text-left">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-white/70">
                               {notifSuccess ? 'Signal Transmitted' : 'Test Local Web Pipeline'}
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
                         className="flex w-full items-center justify-between rounded-[16px] bg-blue-500/10 border border-blue-500/20 px-4 py-3 transition-all hover:bg-blue-500/20 disabled:opacity-50"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <Server className={cn("h-3.5 w-3.5 shrink-0", fcmSuccess ? 'text-emerald-400' : 'text-blue-400')} />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-blue-400/90 truncate">
                               {fcmSuccess ? 'V1 Payload Routed' : 'Test FCM V1 Web Backend'}
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

                       <button 
                         onClick={handleTestPureFirebasePush}
                         disabled={pureFbLoading}
                         className="flex w-full items-center justify-between rounded-[16px] bg-purple-500/10 border border-purple-500/20 px-4 py-3 transition-all hover:bg-purple-500/20 disabled:opacity-50"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <Server className={cn("h-3.5 w-3.5 shrink-0", pureFbSuccess ? 'text-emerald-400' : 'text-purple-400')} />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-purple-400/90 truncate">
                               {pureFbSuccess ? 'Sent via pure Firebase' : 'Test Pure FCM Console Behavior'}
                             </span>
                             <span className={cn("block text-[8px] font-bold mt-0.5 truncate", pureFbStatusMsg && !pureFbSuccess ? "text-red-400" : "text-purple-500/70")}>
                               {pureFbStatusMsg || 'Direct console API format'}
                             </span>
                           </div>
                         </div>
                         {pureFbLoading ? (
                           <RefreshCw className="h-3 w-3 shrink-0 animate-spin text-purple-400" />
                         ) : pureFbSuccess ? (
                           <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                         ) : null}
                       </button>
                       
                       <button 
                         onClick={async () => {
                            setRawStatus('Repairing FCM Token...');
                            localStorage.removeItem('native_fcm_token');
                            localStorage.removeItem('last_synced_native_token');
                            localStorage.removeItem('pending_native_token');
                            (window as any).__NATIVE_TOKEN_STOLEN = null;
                            
                            if (user) {
                              const res = await notificationService.registerWebPushToken(user.uid);
                              setRawStatus(res.success ? 'FCM Web Token Restored!' : 'FCM Error: ' + res.message);
                              
                              setTimeout(() => {
                                 window.location.reload();
                              }, 1500);
                            }
                         }}
                         className="flex w-full items-center justify-between rounded-[16px] bg-red-500/10 border border-red-500/20 px-4 py-3 transition-all hover:bg-red-500/20"
                       >
                         <div className="flex items-center gap-3 min-w-0">
                           <RefreshCw className="h-3.5 w-3.5 shrink-0 text-red-400" />
                           <div className="text-left min-w-0 pr-2">
                             <span className="block text-[10px] font-black uppercase tracking-widest text-red-400/90 truncate">
                               Repair Push FCM Token
                             </span>
                             <span className="block text-[8px] font-bold mt-0.5 truncate text-red-500/70">
                               Use this if you see "Device Unregistered"
                             </span>
                           </div>
                         </div>
                       </button>
                     </div>
                   </div>
                   
                   `;
    content = content.slice(0, startIdx) + newUI + content.slice(endIdx);
    fs.writeFileSync('src/pages/Profile.tsx', content);
    console.log('Replaced successfully!');
} else {
    console.log('Failed to find markers.', {
      startIdx,
      endIdx,
      startStrExists: content.includes(startStr),
      endStrExists: content.includes(endStr)
    });
}
