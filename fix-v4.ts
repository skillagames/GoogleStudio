import * as fs from 'fs';

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

const sIdx = content.indexOf('<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">\\n                    <div className="flex items-center justify-between mb-3">\\n                      <div className="flex items-center gap-2">\\n                        <Activity className="h-3.5 w-3.5 text-emerald-400" />\\n                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Vibration Status</h4>');

console.log("Start idx:", sIdx);

const startStr = '<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">';
const endStr = '</p>\\n                        </div>\\n                      </div>\\n                    )}\\n                  </div>';

if (sIdx !== -1) {
    const startIdx = content.indexOf(startStr, sIdx - 100);
    const endIdx = content.indexOf(endStr, sIdx) + endStr.length;

    console.log({ startIdx, endIdx });

    const newCode = 
  '<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">\\n' +
  '                    <button onClick={() => setIsAndroidDebugExpanded(!isAndroidDebugExpanded)} className="flex items-center justify-between w-full mb-1">\\n' +
  '                      <div className="flex items-center gap-2">\\n' +
  '                        <Activity className="h-3.5 w-3.5 text-emerald-400" />\\n' +
  '                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Android Debugging</h4>\\n' +
  '                      </div>\\n' +
  '                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isAndroidDebugExpanded ? "rotate-180" : "")} />\\n' +
  '                    </button>\\n' +
  '                    \\n' +
  '                    {isAndroidDebugExpanded && (\\n' +
  '                    <div className="pt-3 border-t border-white/10 mt-3 animate-in fade-in slide-in-from-top-2">\\n' +
  '                      <div className="flex items-center justify-between mb-3">\\n' +
  '                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vibration Diagnostics</span>\\n' +
  '                        <button \\n' +
  '                          onClick={handleVibeTest}\\n' +
  '                          className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 active:scale-95"\\n' +
  '                        >\\n' +
  '                          Vibe Check\\n' +
  '                        </button>\\n' +
  '                      </div>\\n' +
  '                      {!vibeDiag ? (\\n' +
  '                        <button \\n' +
  '                          onClick={refreshVibeDiag}\\n' +
  '                          className="w-full text-[9px] font-bold text-slate-500 py-1"\\n' +
  '                        >\\n' +
  '                          Click to Scan Hardware...\\n' +
  '                        </button>\\n' +
  '                      ) : (\\n' +
  '                        <div className="grid grid-cols-2 gap-2">\\n' +
  '                          <div className="space-y-0.5">\\n' +
  '                            <span className="block text-[8px] font-bold text-slate-500 uppercase">Hardware API:</span>\\n' +
  '                            <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase", vibeDiag.apiSupported ? "text-emerald-400" : "text-rose-400")}>\\n' +
  '                              {vibeDiag.apiSupported ? \\'Supported\\' : \\'Blocked/None\\'}\\n' +
  '                            </span>\\n' +
  '                          </div>\\n' +
  '                          <div className="space-y-0.5">\\n' +
  '                            <span className="block text-[8px] font-bold text-slate-500 uppercase">Service Worker:</span>\\n' +
  '                            <span className={cn("inline-flex items-center gap-1 text-[9px] font-black uppercase", vibeDiag.serviceWorker === \\'active\\' ? "text-emerald-400" : "text-orange-400")}>\\n' +
  '                              {vibeDiag.serviceWorker}\\n' +
  '                            </span>\\n' +
  '                          </div>\\n' +
  '                          <div className="col-span-2 mt-2 pt-2 border-t border-white/5 space-y-2">\\n' +
  '                            <div className="flex items-center justify-between">\\n' +
  '                              <span className="text-[9px] font-bold text-slate-500 uppercase">Token Hub:</span>\\n' +
  '                              <span className={cn(\\n' +
  '                                "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",\\n' +
  '                                profile?.tokenSource?.includes(\\'native_bridge\\') \\n' +
  '                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" \\n' +
  '                                  : "bg-amber-500/10 text-amber-500 border border-amber-500/10"\\n' +
  '                              )}>\\n' +
  '                                {profile?.tokenSource?.replace(/_/g, \\' \\') || \\'Web Native SDK\\'}\\n' +
  '                              </span>\\n' +
  '                            </div>\\n' +
  '\\n' +
  '                            <div className="flex items-center justify-between border-t border-white/5 pt-2">\\n' +
  '                               <span className="text-[9px] font-bold text-slate-500 uppercase">Detection Mode:</span>\\n' +
  '                               <span className={cn(\\n' +
  '                                 "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",\\n' +
  '                                 navigator.userAgent.includes(\\'w2n\\') \\n' +
  '                                   ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" \\n' +
  '                                   : "bg-rose-500/10 text-rose-500"\\n' +
  '                               )}>\\n' +
  '                                 {navigator.userAgent.includes(\\'w2n\\') ? \\'NATIVE APK DETECTED\\' : \\'BROWSER MODE\\'}\\n' +
  '                               </span>\\n' +
  '                            </div>\\n' +
  '\\n' +
  '                            <div className="flex items-center justify-between border-t border-white/5 pt-2">\\n' +
  '                               <span className="text-[9px] font-bold text-slate-500 uppercase">Script Injection:</span>\\n' +
  '                               <span className={cn(\\n' +
  '                                 "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",\\n' +
  '                                 (window as any).__W2N_HEALTH_CHECK__ === \\'Passed\\' \\n' +
  '                                   ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" \\n' +
  '                                   : "bg-rose-500/10 text-rose-500"\\n' +
  '                               )}>\\n' +
  '                                 {(window as any).__W2N_HEALTH_CHECK__ === \\'Passed\\' ? \\'INJECTION ACTIVE\\' : \\'NO INJECTION FOUND\\'}\\n' +
  '                               </span>\\n' +
  '                            </div>\\n' +
  '\\n' +
  '                            <div className="flex flex-col gap-2 border-y border-white/5 py-3 mt-1">\\n' +
  '                               <div className="flex items-center justify-between">\\n' +
  '                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Bridges Found:</span>\\n' +
  '                                   <div className="flex flex-wrap gap-1 justify-end max-w-[70%]">\\n' +
  '                                    {[\\'webToNative\\', \\'w2n\\', \\'WTN\\', \\'Native\\', \\'Android\\', \\'android\\', \\'wtn\\', \\'webtonative\\', \\'JSBridge\\', \\'AndroidInterface\\', \\'webkit\\', \\'flutter_inappwebview\\'].map(b => (\\n' +
  '                                      <span key={b} className={cn(\\n' +
  '                                        "text-[7px] font-bold px-1.5 py-0.5 rounded-sm border transition-colors",\\n' +
  '                                        bridgeStatus[b] ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-slate-600 border-transparent"\\n' +
  '                                      )}>\\n' +
  '                                        {b}\\n' +
  '                                      </span>\\n' +
  '                                    ))}\\n' +
  '                                  </div>\\n' +
  '                               </div>\\n' +
  '                            </div>\\n' +
  '                            \\n' +
  '                            <div>\\n' +
  '                               <div className="flex items-center justify-between mb-2">\\n' +
  '                                  <span className="text-[9px] font-bold text-slate-500 uppercase">Raw Plugin Logs:</span>\\n' +
  '                                  <button onClick={() => setRawStatus(\\'\\')} className="text-[7px] text-slate-500 hover:text-white transition-colors bg-white/5 px-1.5 py-0.5 rounded">\\n' +
  '                                    Clear Logs\\n' +
  '                                  </button>\\n' +
  '                                </div>\\n' +
  '                               <div className="text-[7px] font-mono leading-relaxed text-emerald-400/80 break-all bg-black/40 p-2.5 rounded border border-white/5 min-h-[60px] max-h-[120px] overflow-y-auto">\\n' +
  '                                  {(rawStatus || \\'No logs yet...\\').split(\\' | \\').map((line, i) => (\\n' +
  '                                    <div key={i} className={cn("border-b border-white/5 last:border-0 py-1", i === 0 ? "opacity-100 font-bold" : "opacity-60")}>\\n' +
  '                                      {line}\\n' +
  '                                    </div>\\n' +
  '                                  ))}\\n' +
  '                               </div>\\n' +
  '                               \\n' +
  '                            </div>\\n' +
  '\\n' +
  '                            <div className="space-y-1 border-t border-white/5 pt-2">\\n' +
  '                               <span className="block text-[8px] font-bold text-slate-500 uppercase">System Identity (UserAgent):</span>\\n' +
  '                               <p className="text-[7px] font-mono leading-tight text-slate-500 break-all bg-black/20 p-1.5 rounded">\\n' +
  '                                  {navigator.userAgent}\\n' +
  '                               </p>\\n' +
  '                            </div>\\n' +
  '                            \\n' +
  '                            <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>\\n' +
  '                            <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">\\n' +
  '                               Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".\\n' +
  '                            </p>\\n' +
  '                          </div>\\n' +
  '                        </div>\\n' +
  '                      )}\\n' +
  '                    </div>\\n' +
  '                    )}\\n' +
  '                  </div>';

    content = content.slice(0, startIdx) + newCode + content.slice(endIdx);
    fs.writeFileSync('src/pages/Profile.tsx', content);
    console.log("Success! File saved.");
}
