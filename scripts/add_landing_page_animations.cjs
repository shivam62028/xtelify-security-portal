const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace('import { motion } from "framer-motion";', 'import { motion, AnimatePresence } from "framer-motion";');

const landingPageDecl = `const LandingPage: React.FC<{ onNavigate: (m: 'cloudops' | 'finops') => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<'cloudops' | 'finops' | null>(null);`;

const newLandingPageDecl = `const LandingPage: React.FC<{ onNavigate: (m: 'cloudops' | 'finops') => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<'cloudops' | 'finops' | null>(null);

  // richyrik: Fetch live dashboard stats for CloudOps
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  useEffect(() => {
    fetch(\`\${BACKEND_URL}/api/db/summary\`)
      .then(res => res.json())
      .then(data => setDashboardStats(data))
      .catch(console.error);
  }, []);`;

c = c.replace(landingPageDecl, () => newLandingPageDecl);

// Now the cards definition.
// We want to add hoverStats property to each card.
const cloudopsCardStart = `      tagColor: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
      stats: [
        { label: 'Issues Tracked', value: '∞' },
        { label: 'Formats', value: '4' },
        { label: 'Integrations', value: 'Outlook' },
      ],
    },`;

const newCloudopsCardStart = `      tagColor: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
      stats: [
        { label: 'Issues Tracked', value: '∞' },
        { label: 'Formats', value: '4' },
        { label: 'Integrations', value: 'Outlook' },
      ],
      hoverStats: [
        { label: 'Total Issues', value: dashboardStats?.total || 0, isNumber: true, color: 'from-cyan-400 to-blue-500' },
        { label: 'Critical Risks', value: dashboardStats?.severity?.critical || 0, isNumber: true, color: 'from-purple-400 to-pink-500' },
        { label: 'Open Issues', value: dashboardStats?.status?.open || 0, isNumber: true, color: 'from-amber-400 to-orange-500' },
        { label: 'Resolution Rate', value: dashboardStats?.total ? ((dashboardStats?.status?.resolved || 0) / dashboardStats.total * 100).toFixed(1) + '%' : '0%', isNumber: false, color: 'from-emerald-400 to-teal-500' },
      ],
    },`;

c = c.replace(cloudopsCardStart, () => newCloudopsCardStart);

const finopsCardStart = `      tagColor: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
      stats: [
        { label: 'Cloud Providers', value: '2' },
        { label: 'Credit Pools', value: 'GCP+AWS' },
        { label: 'Budget View', value: 'AOP' },
      ],
    },`;

const newFinopsCardStart = `      tagColor: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
      stats: [
        { label: 'Cloud Providers', value: '2' },
        { label: 'Credit Pools', value: 'GCP+AWS' },
        { label: 'Budget View', value: 'AOP' },
      ],
      hoverStats: [
        { label: 'MTD Spend', value: 142.5, prefix: '$', suffix: 'K', isNumber: true, color: 'from-emerald-400 to-teal-500', decimals: 1 },
        { label: 'Pending NFAs', value: '3 Awaiting', isNumber: false, color: 'from-amber-400 to-orange-500' },
        { label: 'Active GBPAs', value: '12 Contracts', isNumber: false, color: 'from-blue-400 to-cyan-500' },
        { label: 'AOP Utilization', value: 68, suffix: '% Consumed', isNumber: true, color: 'from-violet-400 to-purple-500' },
      ],
    },`;

c = c.replace(finopsCardStart, () => newFinopsCardStart);


// Now replace the inside of the <button> inside <Tilt> with the AnimatePresence logic
const cardBodyRegex = /(<div className=\{\`h-1 w-full rounded-full mb-7.*?\/>\n)([\s\S]*?)(<div className=\{\`flex items-center gap-2 text-sm font-semibold \$\{card\.id === 'cloudops' \? 'text-purple-400' : 'text-emerald-400'\}\`\}>\n\s*Enter Module <ArrowRight[\s\S]*?<\/div>)/;

const newCardBody = `$1
              {/* richyrik: Framer Motion AnimatePresence for Live Data Reveal */}
              <div className="min-h-[220px]">
                <AnimatePresence mode="wait">
                  {hovered !== card.id ? (
                    <motion.div
                      key="default"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className={\`p-3 rounded-xl \${card.id === 'cloudops' ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : 'bg-emerald-500/10 ring-1 ring-emerald-500/30'}\`}>
                          {card.icon}
                        </div>
                        <span className={\`text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full ring-1 \${card.tagColor}\`}>
                          {card.tag}
                        </span>
                      </div>

                      <h2 className={\`text-2xl font-bold mb-1 bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`}>{card.title}</h2>
                      <p className={\`text-xs font-semibold uppercase tracking-widest mb-4 \${card.id === 'cloudops' ? 'text-purple-400' : 'text-emerald-400'}\`}>
                        {card.subtitle}
                      </p>
                      <p className="text-slate-400 text-sm leading-relaxed mb-7">{card.description}</p>

                      <div className="grid grid-cols-3 gap-3 mb-7">
                        {card.stats.map((s) => (
                          <div key={s.label} className="bg-white/[0.05] border border-white/[0.08] rounded-lg p-2.5 text-center backdrop-blur-sm">
                            <div className="text-white font-bold text-sm">{s.value}</div>
                            <div className="text-slate-500 text-[10px] mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
$3`;

// Use function to prevent '$1' replacement issues with the string inside newCardBody
c = c.replace(cardBodyRegex, (match, p1, p2, p3) => {
  return newCardBody.replace('$1', p1).replace('$3', p3);
});

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('✅ Added landing page animations!');
