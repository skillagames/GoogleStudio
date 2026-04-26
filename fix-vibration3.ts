import * as fs from 'fs';

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

const oldStr = 
  \`<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Vibration Status</h4>
                      </div>
                      <button 
                        onClick={handleVibeTest}
                        className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 active:scale-95"
                      >
                        Vibe Check
                      </button>
                    </div>\`;

const newStr = 
  \`<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">
                    <button onClick={() => setIsAndroidDebugExpanded(!isAndroidDebugExpanded)} className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Android Debugging</h4>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", isAndroidDebugExpanded ? "rotate-180" : "")} />
                    </button>
                    
                    {isAndroidDebugExpanded && (
                    <div className="pt-3 border-t border-white/10 mt-3 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vibration Diagnostics</span>
                        <button 
                          onClick={handleVibeTest}
                          className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 active:scale-95"
                        >
                          Vibe Check
                        </button>
                      </div>\`;

content = content.replace(oldStr, newStr);

const endStr = 
  \`                          <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>
                          <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">
                             Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".
                          </p>
                        </div>
                      </div>
                    )}
                  </div>\`;

const newEndStr = 
  \`                          <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>
                          <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">
                             Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".
                          </p>
                        </div>
                      </div>
                    )}
                    </div>
                  )}
                  </div>\`;

content = content.replace(endStr, newEndStr);

fs.writeFileSync('src/pages/Profile.tsx', content);
console.log('Update finished!', content.includes('Android Debugging'));
