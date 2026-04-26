import * as fs from 'fs';

let content = fs.readFileSync('src/pages/Profile.tsx', 'utf-8');

const oldStr = 
  '<div className="mt-4 rounded-2xl bg-white/5 p-4 border border-white/10">\\n' +
  '                    <div className="flex items-center justify-between mb-3">\\n' +
  '                      <div className="flex items-center gap-2">\\n' +
  '                        <Activity className="h-3.5 w-3.5 text-emerald-400" />\\n' +
  '                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white/90">Vibration Status</h4>\\n' +
  '                      </div>\\n' +
  '                      <button \\n' +
  '                        onClick={handleVibeTest}\\n' +
  '                        className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 active:scale-95"\\n' +
  '                      >\\n' +
  '                        Vibe Check\\n' +
  '                      </button>\\n' +
  '                    </div>';

const newStr = 
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
  '                      </div>';

content = content.replace(oldStr, newStr);

const endStr = 
  '                          <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>\\n' +
  '                          <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">\\n' +
  '                             Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".\\n' +
  '                          </p>\\n' +
  '                        </div>\\n' +
  '                      </div>\\n' +
  '                    )}\\n' +
  '                  </div>';

const newEndStr = 
  '                          <span className="block text-[8px] font-bold text-slate-500 uppercase pt-2">Android Vibration Policy:</span>\\n' +
  '                          <p className="text-[8px] leading-relaxed font-medium text-slate-400 italic">\\n' +
  '                             Firebase vibrations are controlled by the OS "Notification Channel". If the popup appears but the phone stays silent, you must long-press the notification on your phone and set it to "Alerting/Default" instead of "Silent".\\n' +
  '                          </p>\\n' +
  '                        </div>\\n' +
  '                      </div>\\n' +
  '                    )}\\n' +
  '                    </div>\\n' +
  '                  )}\\n' +
  '                  </div>';

content = content.replace(endStr, newEndStr);

fs.writeFileSync('src/pages/Profile.tsx', content);
console.log('Update finished!', content.includes('Android Debugging'));
