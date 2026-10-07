#!/usr/bin/env node
// richyrik: Premium "Deep Space" Glassmorphism design overhaul script

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// ──────────────────────────────────────────────────────────────────
// 1. GLOBAL BACKGROUND: Replace flat dark backgrounds with deep obsidian
// ──────────────────────────────────────────────────────────────────

// The key base backgrounds
content = content.replace(/bg-slate-950/g, 'bg-[#07090E]');

// bg-slate-900 used as page background in FinOps motion.div className
content = content.replace(
  /className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col"/g,
  'className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col"'
);

// Landing page root
content = content.replace(
  'className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 overflow-hidden relative"',
  'className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center p-6 overflow-hidden relative"'
);

// ──────────────────────────────────────────────────────────────────
// 2. GLASSMORPHISM: Replace solid card backgrounds globally
// The glass recipe: bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]
// ──────────────────────────────────────────────────────────────────

const GLASS = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]';
const GLASS_HOVER = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] hover:border-white/[0.15] hover:shadow-[0_12px_40px_0_rgba(0,0,0,0.5)] transition-all duration-300';

// FinOps card pattern: bg-slate-900 ring-1 ring-slate-800 rounded-xl
content = content.replace(
  /bg-slate-900 ring-1 ring-slate-800 rounded-xl/g,
  `${GLASS} rounded-xl`
);

// FinOps header
content = content.replace(
  'className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-sm px-6 py-4 flex items-center justify-between sticky top-0 z-50"',
  'className="bg-[#07090E]/80 border-b border-white/[0.08] backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-50"'
);

// FinOps left nav
content = content.replace(
  'className="w-56 shrink-0 bg-slate-900/60 border-r border-slate-800 p-4 flex flex-col gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"',
  'className="w-56 shrink-0 bg-white/[0.02] backdrop-blur-xl border-r border-white/[0.06] p-4 flex flex-col gap-1 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto"'
);

// FinOps sidebar KPI cards
content = content.replace(
  /className="bg-slate-800\/60 rounded-lg p-3 ring-1 ring-slate-700"/g,
  'className="bg-white/[0.05] backdrop-blur-md rounded-lg p-3 border border-white/[0.08]"'
);

// FinOps nav active state
content = content.replace(
  "'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'",
  "'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'"
);

// FinOps nav main area
content = content.replace(
  'className="flex-1 p-6 overflow-auto"',
  'className="flex-1 p-6 overflow-auto bg-transparent"'
);

// FinOpsDashboard outer container
content = content.replace(
  'className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col"',
  'className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col relative"'
);

// ──────────────────────────────────────────────────────────────────
// 3. LANDING PAGE OVERHAUL
// ──────────────────────────────────────────────────────────────────

// Remove old blob section and replace with framer-motion animated blobs
content = content.replace(
  `      {/* richyrik: Ambient Orbiting Blobs background wrapper */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 blur-[120px] rounded-full opacity-30 animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600 blur-[120px] rounded-full opacity-30 animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-emerald-600 blur-[120px] rounded-full opacity-20 animate-pulse" style={{ animationDuration: '8s' }} />
      </div>`,
  `      {/* richyrik: Framer Motion animated gradient mesh orbs — deep space breathing background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-[10%] left-[15%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: '#7000FF', filter: 'blur(150px)' }}
          animate={{ x: [0, 60, -40, 0], y: [0, -80, 40, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[10%] right-[10%] w-[450px] h-[450px] rounded-full opacity-15"
          style={{ background: '#00F0FF', filter: 'blur(150px)' }}
          animate={{ x: [0, -70, 50, 0], y: [0, 60, -50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
        />
        <motion.div
          className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: '#00FF66', filter: 'blur(150px)' }}
          animate={{ x: [0, 40, -60, 20, 0], y: [0, -40, 60, -20, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
        />
        <motion.div
          className="absolute top-[70%] left-[20%] w-[350px] h-[350px] rounded-full opacity-10"
          style={{ background: '#FF6B00', filter: 'blur(150px)' }}
          animate={{ x: [0, 80, -30, 0], y: [0, -50, 70, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 9 }}
        />
      </div>`
);

// Upgrade Tilt settings on Landing Page cards
content = content.replace(
  `            glareEnable={true}
            glareMaxOpacity={0.4}
            glareColor="white"
            glarePosition="all"
            tiltMaxAngleX={10}
            tiltMaxAngleY={10}
            className="flex-1 flex"`,
  `            glareEnable={true}
            glareMaxOpacity={0.5}
            glareColor="white"
            glarePosition="all"
            tiltMaxAngleX={15}
            tiltMaxAngleY={15}
            scale={1.03}
            transitionSpeed={2500}
            className="flex-1 flex"`
);

// Landing page card gradient -> glassmorphism card
content = content.replace(
  `              className={[
                'w-full text-left rounded-2xl border p-8 cursor-pointer transition-all duration-500 outline-none',
                // richyrik: glassmorphism + 3D lift on hover
                'bg-gradient-to-br backdrop-blur-md',
                card.gradient,
                'border-slate-700/60',
                \`ring-2 ring-transparent \${card.ring}\`,
                \`shadow-2xl \${card.glow}\`,
                hovered === card.id
                  ? '-translate-y-4 scale-105'
                  : 'translate-y-0 scale-100',
              ].join(' ')}
              style={{ transform: hovered === card.id ? 'translateY(-16px) scale(1.04) rotateX(2deg)' : 'translateY(0) scale(1) rotateX(0deg)', transformStyle: 'preserve-3d', perspective: '1000px', transition: 'all 0.45s cubic-bezier(0.23,1,0.32,1)' }}`,
  `              className={[
                'w-full text-left rounded-2xl p-8 cursor-pointer outline-none transition-all duration-500',
                // richyrik: Premium glassmorphism card
                'bg-white/[0.04] backdrop-blur-2xl',
                'border border-white/[0.10]',
                'shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.08)]',
                hovered === card.id
                  ? 'border-white/[0.20] shadow-[0_16px_48px_0_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.12)]'
                  : '',
              ].join(' ')}
              style={{ transform: hovered === card.id ? 'translateY(-14px) scale(1.02)' : 'translateY(0) scale(1)', transition: 'all 0.4s cubic-bezier(0.23,1,0.32,1)' }}`
);

// Landing page title gradient typography
content = content.replace(
  '<h2 className="text-2xl font-bold text-white mb-1">{card.title}</h2>',
  '<h2 className={`text-2xl font-bold mb-1 bg-clip-text text-transparent ${card.id === \'cloudops\' ? \'bg-gradient-to-r from-cyan-300 to-violet-400\' : \'bg-gradient-to-r from-emerald-300 to-teal-400\'}`}>{card.title}</h2>'
);

// Landing page header title
content = content.replace(
  '<span className="text-slate-300 font-semibold text-xl tracking-tight">Wynk Cloud Portal</span>',
  '<span className="text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">Wynk Cloud Portal</span>'
);

// Landing page stat boxes
content = content.replace(
  /className="bg-slate-800\/60 rounded-lg p-2\.5 text-center"/g,
  'className="bg-white/[0.05] border border-white/[0.08] rounded-lg p-2.5 text-center backdrop-blur-sm"'
);

// ──────────────────────────────────────────────────────────────────
// 4. FINOPS MODAL GLASSMORPHISM
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  'className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"',
  'className="bg-[#0D1117]/90 backdrop-blur-2xl border border-white/[0.10] shadow-[0_24px_64px_0_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)] rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"'
);

content = content.replace(
  'className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/50"',
  'className="flex items-center justify-between p-4 border-b border-white/[0.08] bg-white/[0.02]"'
);

content = content.replace(
  'className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3"',
  'className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex justify-end gap-3"'
);

content = content.replace(
  'className="bg-slate-950 rounded-lg ring-1 ring-slate-800 overflow-x-auto"',
  'className="bg-black/20 rounded-lg ring-1 ring-white/[0.06] overflow-x-auto"'
);

// Modal table row input
content = content.replace(
  'className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"',
  'className="w-full bg-white/[0.04] border border-white/[0.10] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 backdrop-blur-sm"'
);

content = content.replace(
  'className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-xs font-medium transition-colors ring-1 ring-slate-700"',
  'className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.10] text-white rounded-md text-xs font-medium transition-all ring-1 ring-white/[0.10]"'
);

// ──────────────────────────────────────────────────────────────────
// 5. FINOPS DASHBOARD: Gradient headers for sections
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  '<h2 className="text-xl font-bold text-white">Billing Observability</h2>',
  '<h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-400">Billing Observability</h2>'
);

content = content.replace(
  '<h2 className="text-xl font-bold text-white">Credit Discount Tracker</h2>',
  '<h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-cyan-400">Credit Discount Tracker</h2>'
);

content = content.replace(
  '<h2 className="text-xl font-bold text-white">NFA & GBPA Status Tracker</h2>',
  '<h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-300 to-purple-400">NFA & GBPA Status Tracker</h2>'
);

content = content.replace(
  '<h2 className="text-xl font-bold text-white">AOP Dashboard — Annual Operating Plan</h2>',
  '<h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-orange-400">AOP Dashboard — Annual Operating Plan</h2>'
);

// FinOps header title
content = content.replace(
  '<h1 className="text-base font-bold text-white">FinOps Dashboard</h1>',
  '<h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-teal-400">FinOps Dashboard</h1>'
);

// ──────────────────────────────────────────────────────────────────
// 6. CLOUDOPS / AppContent: Glassmorphism backgrounds
// ──────────────────────────────────────────────────────────────────

// The `darkMode ? "bg-slate-800 border-slate-700"` pattern used for analytics charts/cards
content = content.replace(
  /`p-4 rounded-lg border h-80 mb-6 \$\{darkMode \? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"\}`/g,
  '`p-4 rounded-lg h-80 mb-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]`'
);

content = content.replace(
  /`h-72 mb-6 p-4 rounded-lg border \$\{darkMode \? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"\}`/g,
  '`h-72 mb-6 p-4 rounded-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]`'
);

content = content.replace(
  /`p-4 rounded-lg border \$\{darkMode \? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"\}`/g,
  '`p-4 rounded-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]`'
);

content = content.replace(
  /`p-4 rounded-lg border mb-6 \$\{darkMode \? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"\}`/g,
  '`p-4 rounded-lg mb-6 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)]`'
);

// Owner mini-stat boxes  
content = content.replace(
  /`p-3 rounded-lg border \$\{darkMode \? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"\}`/g,
  '`p-3 rounded-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]`'
);

// Owner chart inner area
content = content.replace(
  /`h-64 p-4 rounded-lg border \$\{darkMode \? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"\}`/g,
  '`h-64 p-4 rounded-lg bg-white/[0.03] backdrop-blur-xl border border-white/[0.08]`'
);

// Owner analysis section background
content = content.replace(
  /`rounded-lg border overflow-hidden \$\{darkMode \? "border-slate-700" : "border-slate-200"\}`/g,
  '`rounded-lg overflow-hidden border border-white/[0.08]`'
);

// Dataset table thead
content = content.replace(
  /`$\{darkMode \? "bg-slate-800" : "bg-slate-100"\}`/g,
  '`bg-white/[0.04]`'
);

// ──────────────────────────────────────────────────────────────────
// 7. CLOUDOPS AppContent: Header and nav glassmorphism
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  /className={`sticky top-0 z-50 border-b transition-colors \$\{darkMode \? 'bg-slate-900\/95 border-slate-800' : 'bg-white\/95 border-slate-200'\} backdrop-blur-sm`}/g,
  'className={`sticky top-0 z-50 border-b bg-[#07090E]/80 border-white/[0.08] backdrop-blur-xl`}'
);

// CloudOps main bg
content = content.replace(
  /className={`flex-1 overflow-auto \$\{darkMode \? 'bg-slate-950' : 'bg-slate-50'\}`}/g,
  'className="flex-1 overflow-auto bg-[#07090E]"'
);

content = content.replace(
  /className={`min-h-screen \$\{darkMode \? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'\} flex flex-col`}/g,
  'className="min-h-screen bg-[#07090E] text-white flex flex-col"'
);

// AppContent motion.div wrapper
content = content.replace(
  'className="bg-slate-950 min-h-screen"',
  'className="bg-[#07090E] min-h-screen"'
);

// sidebar in CloudOps
content = content.replace(
  /className={`w-64 shrink-0 border-r \$\{darkMode \? 'bg-slate-900\/60 border-slate-800' : 'bg-white border-slate-200'\} flex flex-col`}/g,
  'className="w-64 shrink-0 border-r bg-white/[0.02] backdrop-blur-xl border-white/[0.06] flex flex-col"'
);

// ──────────────────────────────────────────────────────────────────
// 8. CLOUDOPS KPI Cards — active nav glow
// ──────────────────────────────────────────────────────────────────
// Active nav item in CloudOps sidebar
content = content.replace(
  "'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'",
  "'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.25)]'"
);

// ──────────────────────────────────────────────────────────────────
// 9. RECHARTS: Update dark tooltip backgrounds
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  /backgroundColor: darkMode \? '#1e293b' : '#fff'/g,
  "backgroundColor: 'rgba(10,14,25,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)'"
);

content = content.replace(
  /backgroundColor: darkMode \? '#1f2937' : '#fff'/g,
  "backgroundColor: 'rgba(10,14,25,0.92)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)'"
);

// Recharts CartesianGrid lines color
content = content.replace(
  /stroke={darkMode \? "#334155" : "#e2e8f0"}/g,
  'stroke="rgba(255,255,255,0.06)"'
);

// Recharts axis strokes
content = content.replace(
  /stroke={darkMode \? "#94a3b8" : "#64748b"} fontSize={11}/g,
  'stroke="#64748b" fontSize={11}'
);

content = content.replace(
  /stroke={darkMode \? "#94a3b8" : "#64748b"} fontSize={12}/g,
  'stroke="#64748b" fontSize={12}'
);

// ──────────────────────────────────────────────────────────────────
// 10. FINOPS section main rounded cards: upgrade card containers
// ──────────────────────────────────────────────────────────────────

// Billing KPI row cards
content = content.replace(
  /className=\{`rounded-xl p-4 ring-1 \$\{k\.bg\} bg-slate-900`\}/g,
  'className={`rounded-xl p-4 border ${k.bg} bg-white/[0.03] backdrop-blur-xl border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)]`}'
);

// NFA/GBPA approval card outer
content = content.replace(
  'className="space-y-4">\n                {approvalItems.map((item) => {',
  'className="space-y-4">\n                {approvalItems.map((item) => {'
);

// ──────────────────────────────────────────────────────────────────
// 11. FINOPS FinOpsDashboard top motion.div: inject animated bg
// ──────────────────────────────────────────────────────────────────

// Inject animated background orbs into FinOpsDashboard's motion.div
content = content.replace(
  `    transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col relative"
    >
      {/* richyrik: FinOps Header */}`,
  `    transition={{ duration: 0.6, ease: "easeOut" }}
      className="min-h-screen bg-[#07090E] text-slate-100 font-sans flex flex-col relative"
    >
      {/* richyrik: Deep Space background orbs for FinOps */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          className="absolute top-[5%] left-[10%] w-[600px] h-[600px] rounded-full"
          style={{ background: '#00FF66', filter: 'blur(160px)', opacity: 0.07 }}
          animate={{ x: [0, 50, -30, 0], y: [0, -60, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-[5%] right-[5%] w-[500px] h-[500px] rounded-full"
          style={{ background: '#7000FF', filter: 'blur(150px)', opacity: 0.08 }}
          animate={{ x: [0, -60, 40, 0], y: [0, 50, -40, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
        />
        <motion.div
          className="absolute top-[40%] right-[30%] w-[400px] h-[400px] rounded-full"
          style={{ background: '#00F0FF', filter: 'blur(150px)', opacity: 0.05 }}
          animate={{ x: [0, 40, -50, 0], y: [0, -40, 50, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
        />
      </div>
      {/* richyrik: FinOps Header */}`
);

// ──────────────────────────────────────────────────────────────────
// 12. CLOUDOPS AppContent: inject animated bg orbs
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  '      initial={{ opacity: 0, y: 30 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.6, ease: "easeOut" }}\n      className="bg-[#07090E] min-h-screen"',
  `      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="bg-[#07090E] min-h-screen relative"`
);

// ──────────────────────────────────────────────────────────────────
// 13. LANDING PAGE: grid background refinement
// ──────────────────────────────────────────────────────────────────
content = content.replace(
  `'linear-gradient(rgba(99,102,241,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.3) 1px, transparent 1px)'`,
  `'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)'`
);

// ──────────────────────────────────────────────────────────────────
// 14. BUTTON GLOW EFFECTS
// ──────────────────────────────────────────────────────────────────
// FinOps "Manage Data" button glow
content = content.replace(
  'className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200 rounded-lg ring-1 ring-indigo-500/30 transition-all text-sm font-medium"',
  'className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 hover:text-indigo-200 rounded-lg ring-1 ring-indigo-500/30 transition-all text-sm font-medium hover:shadow-[0_0_15px_rgba(99,102,241,0.4)]"'
);

// Save button glow
content = content.replace(
  'className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-lg shadow-emerald-500/20 transition-all"',
  'className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_28px_rgba(16,185,129,0.6)] transition-all"'
);

// ──────────────────────────────────────────────────────────────────
// Done — write file
// ──────────────────────────────────────────────────────────────────
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅  Design overhaul complete! Deep Space Glassmorphism applied.');
