const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Replace the hovered view inside AnimatePresence
const oldHoveredStr = `                    <motion.div
                      key="hovered"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="h-full flex flex-col justify-center"
                    >
                      <div className="mb-4">
                        <h3 className={\`text-lg font-bold bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`}>Live Dashboard Stats</h3>
                        <p className="text-slate-400 text-xs mt-1">Real-time metrics synced from production.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 mb-7">
                        {card.hoverStats?.map((s) => (
                          <div key={s.label} className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{s.label}</div>
                            <div className={\`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br \${s.color}\`}>
                              {s.isNumber ? (
                                <CountUpComponent 
                                  start={0} 
                                  end={Number(s.value)} 
                                  duration={1.5} 
                                  separator="," 
                                  prefix={s.prefix || ''} 
                                  suffix={s.suffix || ''} 
                                  decimals={s.decimals || 0}
                                />
                              ) : (
                                s.value
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>`;

const newHoveredStr = `                    <motion.div
                      key="hovered"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="h-full flex flex-col justify-center"
                    >
                      {/* richyrik: Fixed Hover Data */}
                      <div className="mb-4">
                        <h3 className={\`text-lg font-bold bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`}>Live Dashboard Stats</h3>
                        <p className="text-slate-400 text-xs mt-1">Real-time metrics synced from production.</p>
                      </div>
                      
                      {card.id === 'cloudops' ? (
                        <div className="grid grid-cols-2 gap-3 mb-7">
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Total Issues</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-cyan-400 to-blue-500">{dashboardStats?.total || 0}</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Critical</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-purple-400 to-pink-500">{dashboardStats?.severity?.critical || 0}</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Breached</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-amber-400 to-orange-500">0</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Sync</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-500">Active</div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mb-7">
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">MTD Spend</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-teal-500">$142K</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Active NFAs</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-amber-400 to-orange-500">3</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Credits</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-cyan-500">85%</div>
                          </div>
                          <div className="bg-white/[0.06] border border-white/[0.12] rounded-xl p-4 backdrop-blur-md shadow-[0_8px_32px_0_rgba(0,0,0,0.2)] flex flex-col justify-center">
                            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Status</div>
                            <div className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-violet-400 to-purple-500">Healthy</div>
                          </div>
                        </div>
                      )}
                    </motion.div>`;

if (c.includes(oldHoveredStr)) {
  c = c.replace(oldHoveredStr, newHoveredStr);
  console.log("Hovered content replaced successfully.");
} else {
  console.error("Could not find the hovered content string. The string may not match perfectly.");
}

// 2. Replace Ticker Tape
const oldTickerStr = `{/* richyrik: Command Center Ticker Tape (Infinite Scrolling Text) */}
      <div className="absolute top-0 left-0 h-8 w-full bg-white/[0.02] border-b border-white/[0.05] overflow-hidden flex items-center z-50">
        <motion.div
          className="whitespace-nowrap text-[10px] font-mono tracking-widest text-cyan-400"
          animate={{ x: ["100vw", "-100%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        >
          SYSTEM SECURE • 0 CRITICAL ALERTS • AWS BILLING SYNCED • ALL MODULES ONLINE • NO ACTIVE BREACHES
        </motion.div>
      </div>`;

const newTickerStr = `{/* richyrik: Command Center Ticker Tape (Infinite Scrolling Text) */}
      <div className="absolute top-0 w-full h-8 bg-black/40 border-b border-white/10 overflow-hidden flex items-center z-50">
        <motion.div
          className="text-xs font-mono tracking-widest text-emerald-400 whitespace-nowrap"
          animate={{ x: ["100vw", "-100%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        >
          SYSTEM SECURE • 0 CRITICAL ALERTS • AWS BILLING SYNCED • ALL MODULES ONLINE • NO ACTIVE BREACHES • VULNERABILITY SCANNERS ACTIVE
        </motion.div>
      </div>`;

if (c.includes(oldTickerStr)) {
  c = c.replace(oldTickerStr, newTickerStr);
  console.log("Ticker replaced successfully.");
} else {
  console.error("Could not find ticker string.");
}

// 3. Add Animated Data Rings
const animatedGridStr = `{/* richyrik: Animated grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />`;

const ringsAndGridStr = `{/* richyrik: Animated Data Rings */}
      <motion.div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] border border-dashed border-white/5 rounded-full pointer-events-none" style={{ x: "-50%", y: "-50%" }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 100, ease: "linear" }} />
      <motion.div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] border border-dashed border-white/5 rounded-full pointer-events-none" style={{ x: "-50%", y: "-50%" }} animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 100, ease: "linear" }} />
      
      {/* richyrik: Animated grid background */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />`;

if (c.includes(animatedGridStr)) {
  c = c.replace(animatedGridStr, ringsAndGridStr);
  console.log("Rings added successfully.");
} else {
  console.error("Could not find grid string.");
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
