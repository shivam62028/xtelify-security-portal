import os

file_path = 'src/App.tsx'
with open(file_path, 'r') as f:
    content = f.read()

# Replace panel classes
old_p6 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-6 hover:ring-slate-700 transition-all'
new_p6 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-6 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 transform transition-all duration-300'

old_p5 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 hover:ring-slate-700 transition-all'
new_p5 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 transform transition-all duration-300'

old_p5_mb6 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 mb-6'
new_p5_mb6 = 'bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.07)] rounded-xl p-5 mb-6 hover:border-white/[0.15] hover:bg-white/[0.05] hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] hover:-translate-y-1 transform transition-all duration-300'

content = content.replace(old_p6, new_p6)
content = content.replace(old_p5, new_p5)
content = content.replace(old_p5_mb6, new_p5_mb6)

# Stagger wrapper around the dashboard content
# Let's wrap the content inside AppContent (the else branch) in a motion.div
# First find where the KPI cards row begins:
# 4603:           {/* richyrik: KPI cards — purple/indigo/blue/amber/red accent palette */}

start_marker = '{/* richyrik: KPI cards — purple/indigo/blue/amber/red accent palette */}'
stagger_start = '''<motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 40 },
              visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.15, duration: 0.6, ease: "easeOut" } }
            }}
          >
          {/* richyrik: KPI cards — purple/indigo/blue/amber/red accent palette */}'''

# But since KPI cards already has its own stagger motion.div:
# Actually, the entire AppContent is already wrapped in:
# <div className="space-y-6"> maybe? No, let's see.

with open(file_path, 'w') as f:
    f.write(content)

print("Applied panel styling changes.")
