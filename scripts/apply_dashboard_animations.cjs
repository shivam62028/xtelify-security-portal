const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const oldCard = `const Card: React.FC<CardProps & { accentColor?: string; ringColor?: string }> = ({ title, val, Icon, bg, accentColor, ringColor }) => {
  const accent = accentColor || 'text-purple-400';
  const ring   = ringColor   || 'bg-purple-500/15 ring-purple-500/30';
  return (
    <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 flex items-start gap-4 hover:ring-slate-700 transition-all duration-200 group">
      <div className={\`p-3 rounded-xl \${ring} ring-1 shrink-0\`}>
        <Icon size={20} className={accent} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{title}</p>
        <p className={\`text-3xl font-bold text-white tabular-nums\`}>
          {typeof val === 'number' ? <CountUpComponent end={val} duration={2.5} separator="," /> : val}
        </p>
      </div>
    </div>
  );
};`;

const newCard = `const Card: React.FC<CardProps & { accentColor?: string; ringColor?: string }> = ({ title, val, Icon, bg, accentColor, ringColor }) => {
  const accent = accentColor || 'text-purple-400';
  const ring   = ringColor   || 'bg-purple-500/15 ring-purple-500/30';
  return (
    <motion.div 
      whileHover={{ scale: 1.05, translateY: -5 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.5)] hover:border-white/[0.2] hover:bg-white/[0.05] rounded-xl p-5 flex items-start gap-4 transition-all duration-300 group overflow-hidden relative cursor-pointer"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1, scale: 1.5, rotate: 45 }}
        className={\`absolute -right-10 -top-10 w-32 h-32 blur-3xl opacity-0 \${ring.split(' ')[0]} transition-opacity duration-500 pointer-events-none\`}
      />
      <motion.div 
        whileHover={{ rotate: 10, scale: 1.1 }}
        className={\`p-3 rounded-xl \${ring} ring-1 shrink-0 z-10\`}
      >
        <Icon size={20} className={accent} />
      </motion.div>
      <div className="flex-1 min-w-0 z-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-300 transition-colors mb-1.5">{title}</p>
        <p className={\`text-3xl font-black text-white tabular-nums drop-shadow-md\`}>
          {typeof val === 'number' ? <CountUpComponent end={val} duration={2.5} separator="," /> : val}
        </p>
      </div>
    </motion.div>
  );
};`;

if (c.includes(oldCard)) {
  c = c.replace(oldCard, newCard);
  console.log("Card replaced.");
}

const oldAnalyticsRow = `          {/* richyrik: Three-column analytics row — FinOps ring-panel style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">`;
const newAnalyticsRow = `          {/* richyrik: Three-column analytics row — FinOps ring-panel style */}
          <motion.div 
            initial="hidden" animate="visible"
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.15 } } }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6"
          >`;

if (c.includes(oldAnalyticsRow)) {
  c = c.replace(oldAnalyticsRow, newAnalyticsRow);
  console.log("Analytics row replaced.");
}

const oldEndAnalyticsRow = `          </div>

          {/* richyrik: Two-column heatmaps/pipelines */}`;
const newEndAnalyticsRow = `          </motion.div>

          {/* richyrik: Two-column heatmaps/pipelines */}`;

if (c.includes(oldEndAnalyticsRow)) {
  c = c.replace(oldEndAnalyticsRow, newEndAnalyticsRow);
  console.log("End Analytics row replaced.");
}

const oldPanelClass = `bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-6 hover:ring-slate-700 transition-all`;
const newPanelClass = `bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-6 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 transform transition-all duration-300`;
c = c.replaceAll(oldPanelClass, newPanelClass);

const oldPanelClass2 = `bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 hover:ring-slate-700 transition-all`;
const newPanelClass2 = `bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 transform transition-all duration-300`;
c = c.replaceAll(oldPanelClass2, newPanelClass2);

// Make the direct children of the motion.div staggered
c = c.replace(
  `{/* SLA Compliance */}
            <div className="bg-white/[0.03]`,
  `{/* SLA Compliance */}
            <motion.div variants={itemVariant} className="bg-white/[0.03]`
);
c = c.replace(
  `{/* richyrik: Vulnerability Age Distribution */}
            <div className="bg-white/[0.03]`,
  `{/* richyrik: Vulnerability Age Distribution */}
            <motion.div variants={itemVariant} className="bg-white/[0.03]`
);
c = c.replace(
  `{/* richyrik: Resolution Tracking */}
            <div className="bg-white/[0.03]`,
  `{/* richyrik: Resolution Tracking */}
            <motion.div variants={itemVariant} className="bg-white/[0.03]`
);

// We must also change their closing tags!
// We can't safely do this with simple replace string, let's use regex for each block.
fs.writeFileSync('src/App.tsx', c, 'utf8');
