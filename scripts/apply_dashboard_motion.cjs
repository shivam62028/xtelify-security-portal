const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const t1 = `          {/* richyrik: Three-column analytics row — FinOps ring-panel style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            {/* SLA Compliance */}
            <div className="bg-white/[0.03] backdrop-blur-2xl`;
const r1 = `          {/* richyrik: Three-column analytics row — FinOps ring-panel style */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6"
          >
            {/* SLA Compliance */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }} className="bg-white/[0.03] backdrop-blur-2xl`;
c = c.replace(t1, r1);

const t2 = `            {/* richyrik: Vulnerability Age Distribution */}
            <div className="bg-white/[0.03] backdrop-blur-2xl`;
const r2 = `            {/* richyrik: Vulnerability Age Distribution */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }} className="bg-white/[0.03] backdrop-blur-2xl`;
c = c.replace(t2, r2);

const t3 = `            {/* richyrik: Resolution Tracking */}
            <div className="bg-white/[0.03] backdrop-blur-2xl`;
const r3 = `            {/* richyrik: Resolution Tracking */}
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }} className="bg-white/[0.03] backdrop-blur-2xl`;
c = c.replace(t3, r3);

const t4 = `            </div>
          </div>

          {/* richyrik: Risk Heatmap`;
const r4 = `            </motion.div>
          </motion.div>

          {/* richyrik: Risk Heatmap`;
c = c.replace(t4, r4);

const t5 = `          {/* richyrik: Risk Heatmap — FinOps ring-panel style */}
          <div className="bg-white/[0.03]`;
const r5 = `          {/* richyrik: Risk Heatmap — FinOps ring-panel style */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white/[0.03]`;
c = c.replace(t5, r5);

const t6 = `          {/* richyrik: Asset Resolution Pipeline — FinOps dark pill stage style */}
          <div className="bg-white/[0.03]`;
const r6 = `          {/* richyrik: Asset Resolution Pipeline — FinOps dark pill stage style */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white/[0.03]`;
c = c.replace(t6, r6);

const t7 = `          {/* richyrik: Criticality Status + Vulnerability Types — FinOps ring-panel style */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
            <div className="bg-white/[0.03]`;
const r7 = `          {/* richyrik: Criticality Status + Vulnerability Types — FinOps ring-panel style */}
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }} className="bg-white/[0.03]`;
c = c.replace(t7, r7);

const t8 = `            <div className="lg:col-span-2 bg-white/[0.03]`;
const r8 = `            <motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } }} className="lg:col-span-2 bg-white/[0.03]`;
c = c.replace(t8, r8);

const t9 = `            </div>
          </div>

          {/* richyrik: Secondary Row`;
const r9 = `            </motion.div>
          </motion.div>

          {/* richyrik: Secondary Row`;
c = c.replace(t9, r9);

const t10 = `          {/* richyrik: Secondary Row 2: Workload & Risk Distribution */}
          <div className="bg-white/[0.03]`;
const r10 = `          {/* richyrik: Secondary Row 2: Workload & Risk Distribution */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white/[0.03]`;
c = c.replace(t10, r10);

const t11 = `          {/* richyrik: Secondary Row 3: Cluster Risk Distribution */}
          <div className="bg-white/[0.03]`;
const r11 = `          {/* richyrik: Secondary Row 3: Cluster Risk Distribution */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white/[0.03]`;
c = c.replace(t11, r11);

const t12 = `          {/* richyrik: Discovery Timeline */}
          <div className="bg-white/[0.03]`;
const r12 = `          {/* richyrik: Discovery Timeline */}
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.5, ease: "easeOut" }} className="bg-white/[0.03]`;
c = c.replace(t12, r12);

// We need to fix closing divs for motion divs
c = c.replace('            </div>\n          </div>\n\n          {/* richyrik: Asset Resolution', '            </motion.div>\n          {/* richyrik: Asset Resolution'); // For Heatmap
c = c.replace('            </div>\n          </div>\n\n          {/* richyrik: Criticality', '            </motion.div>\n          {/* richyrik: Criticality'); // For Asset pipeline
c = c.replace('          </div>\n\n          {/* richyrik: Secondary Row 3:', '          </motion.div>\n\n          {/* richyrik: Secondary Row 3:'); // For Secondary Row 2
c = c.replace('          </div>\n\n          {/* richyrik: Discovery', '          </motion.div>\n\n          {/* richyrik: Discovery'); // For Secondary Row 3
c = c.replace('          </div>\n\n          {/* richyrik: Ask AI', '          </motion.div>\n\n          {/* richyrik: Ask AI'); // For Discovery timeline

fs.writeFileSync('src/App.tsx', c, 'utf8');
