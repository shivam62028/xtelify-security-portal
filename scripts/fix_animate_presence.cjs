const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const oldDefaultStart = `<AnimatePresence mode="wait">
                  {hovered !== card.id ? (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >`;

const newDefaultStart = `<AnimatePresence mode="wait">
                  {hovered !== card.id ? (
                    <motion.div
                      key="default-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >`;

c = c.replace(oldDefaultStart, newDefaultStart);

const oldHoveredBlock = `                    <motion.div
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

const newHoveredBlock = `                    <motion.div
                      key="hover-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-4 h-full content-start"
                    >
                      {card.id === 'cloudops' ? (
                        <>
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
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                    </motion.div>`;

if (c.includes(oldHoveredBlock)) {
  c = c.replace(oldHoveredBlock, newHoveredBlock);
  console.log("Replaced hover block successfully");
} else {
  console.log("Hover block not found");
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
