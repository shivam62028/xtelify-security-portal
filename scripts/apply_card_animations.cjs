const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add itemVariant at the top of LandingPage
const lpDef = `const LandingPage: React.FC<{ onNavigate: (m: 'cloudops' | 'finops') => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<'cloudops' | 'finops' | null>(null);`;
const lpDefNew = `const LandingPage: React.FC<{ onNavigate: (m: 'cloudops' | 'finops') => void }> = ({ onNavigate }) => {
  const [hovered, setHovered] = useState<'cloudops' | 'finops' | null>(null);

  // richyrik: Stagger variant
  const itemVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };`;
c = c.replace(lpDef, lpDefNew);

// 2. Add group class to button
c = c.replace(
  "'w-full text-left rounded-2xl p-8 cursor-pointer outline-none transition-all duration-500',",
  "'group w-full text-left rounded-2xl p-8 cursor-pointer outline-none transition-all duration-500',"
);

// 3. Wrap inner content of button with Stagger container
const buttonTopStr = `>
              {/* richyrik: Shimmer bar at top of card */}
              <div className={\`h-1 w-full rounded-full mb-7 \${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600' : 'bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600'}\`} />`;

const buttonTopStrNew = `>
              {/* richyrik: Staggered Cascade Reveal (On Mount) */}
              <motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }} initial="hidden" animate="visible">
              {/* richyrik: Shimmer bar at top of card */}
              <motion.div variants={itemVariant} className={\`h-1 w-full rounded-full mb-7 \${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600' : 'bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-600'}\`} />`;

c = c.replace(buttonTopStr, buttonTopStrNew);

// 4. Update the default view for the text elements + Continuous Shimmer Effect
const defaultViewStr = `<div className="flex items-start justify-between mb-6">
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

                      <div className="grid grid-cols-3 gap-3 mb-7">`;

const defaultViewStrNew = `<motion.div variants={itemVariant} className="flex items-start justify-between mb-6">
                        <div className={\`p-3 rounded-xl \${card.id === 'cloudops' ? 'bg-purple-500/10 ring-1 ring-purple-500/30' : 'bg-emerald-500/10 ring-1 ring-emerald-500/30'}\`}>
                          {card.icon}
                        </div>
                        <span className={\`text-[10px] font-bold tracking-widest px-2.5 py-1 rounded-full ring-1 \${card.tagColor}\`}>
                          {card.tag}
                        </span>
                      </motion.div>

                      <motion.h2 variants={itemVariant} className={\`text-2xl font-bold mb-1 bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`}>{card.title}</motion.h2>
                      {/* richyrik: Continuous Shimmer Effect (Subheadings) */}
                      <motion.p variants={itemVariant} className={\`text-xs font-semibold uppercase tracking-widest mb-4 animate-shimmer text-transparent bg-clip-text bg-[length:200%_auto] \${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-400 via-white to-purple-400' : 'bg-gradient-to-r from-emerald-400 via-white to-emerald-400'}\`}>
                        {card.subtitle}
                      </motion.p>
                      <motion.p variants={itemVariant} className="text-slate-400 text-sm leading-relaxed mb-7">{card.description}</motion.p>

                      <motion.div variants={itemVariant} className="grid grid-cols-3 gap-3 mb-7">`;

c = c.replace(defaultViewStr, defaultViewStrNew);

// 5. Update the closing tag of the grid in default view
const defaultViewGridEndStr = `                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (`;

const defaultViewGridEndStrNew = `                          </div>
                        ))}
                      </motion.div>
                    </motion.div>
                  ) : (`;

c = c.replace(defaultViewGridEndStr, defaultViewGridEndStrNew);

// 6. Update the Enter Module link and close the Stagger container
const buttonBottomStr = `</AnimatePresence>
              </div>
<div className={\`flex items-center gap-2 text-sm font-semibold \${card.id === 'cloudops' ? 'text-purple-400' : 'text-emerald-400'}\`}>
                Enter Module <ArrowRight size={15} className={\`transition-transform duration-300 \${hovered === card.id ? 'translate-x-1.5' : ''}\`} />
              </div>
            </button>`;

const buttonBottomStrNew = `</AnimatePresence>
              </div>
              {/* richyrik: Kinetic Enter Module Link */}
              <motion.div variants={itemVariant} className={\`flex items-center gap-2 text-sm font-semibold \${card.id === 'cloudops' ? 'text-purple-400' : 'text-emerald-400'}\`}>
                Enter Module <span className="transform transition-transform duration-300 group-hover:translate-x-2"><ArrowRight size={15} /></span>
              </motion.div>
              </motion.div>
            </button>`;

c = c.replace(buttonBottomStr, buttonBottomStrNew);

fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('✅ Applied card text animations');
