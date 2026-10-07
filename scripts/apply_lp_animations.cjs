const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Ticker tape
const landingPageStart = `<div className="min-h-screen bg-[#07090E] flex flex-col items-center justify-center p-6 overflow-hidden relative">`;
const tickerTape = `      {/* richyrik: Command Center Ticker Tape (Infinite Scrolling Text) */}
      <div className="absolute top-0 left-0 h-8 w-full bg-white/[0.02] border-b border-white/[0.05] overflow-hidden flex items-center z-50">
        <motion.div
          className="whitespace-nowrap text-[10px] font-mono tracking-widest text-cyan-400"
          animate={{ x: ["100vw", "-100%"] }}
          transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
        >
          SYSTEM SECURE • 0 CRITICAL ALERTS • AWS BILLING SYNCED • ALL MODULES ONLINE • NO ACTIVE BREACHES
        </motion.div>
      </div>`;
c = c.replace(landingPageStart, landingPageStart + '\n' + tickerTape);

// 2 & 3. Header reveal and subtitle shimmer
const headerOld = `<div className="flex items-center justify-center gap-3 mb-4">
          <img src="/airtel-logo.svg" alt="Airtel" className="h-10 w-auto opacity-90" />
          <div className="h-8 w-px bg-slate-600" />
          <span className="text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">Wynk Cloud Portal</span>
        </div>
        <p className="text-slate-500 text-sm font-medium tracking-widest uppercase">
          Select a module to continue
        </p>`;
const headerNew = `        {/* richyrik: Cyberpunk Text Reveal */}
        <motion.div 
          className="flex items-center justify-center gap-3 mb-4"
          initial={{ opacity: 0, filter: "blur(10px)", y: -20 }}
          animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <img src="/airtel-logo.svg" alt="Airtel" className="h-10 w-auto opacity-90" />
          <div className="h-8 w-px bg-slate-600" />
          <motion.h1 className="text-xl tracking-tight font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
            Wynk Cloud Portal
          </motion.h1>
        </motion.div>
        {/* richyrik: Gradient Shimmer Sweep */}
        <p className="text-sm font-medium tracking-widest uppercase bg-gradient-to-r from-slate-500 via-white to-slate-500 bg-[length:200%_auto] animate-shimmer text-transparent bg-clip-text">
          Select a module to continue
        </p>`;
c = c.replace(headerOld, headerNew);

// 4. Zero-Gravity Idle Float
const cardMapOld = `{cards.map((card) => (
          <Tilt
            key={card.id}`;
const cardMapNew = `{cards.map((card, index) => (
          /* richyrik: Zero-Gravity Idle Float */
          <motion.div
            key={card.id}
            animate={{ y: [-5, 5, -5] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: index === 1 ? 1 : 0 }}
            className="flex-1 flex"
          >
          <Tilt`;

const cardMapEndOld = `</Tilt>
        ))}`;
const cardMapEndNew = `</Tilt>
          </motion.div>
        ))}`;

c = c.replace(cardMapOld, cardMapNew);
c = c.replace(cardMapEndOld, cardMapEndNew);

c = c.replace(/className="flex-1 flex"\n          >\n            <button/g, 'className="w-full flex"\n          >\n            <button');


fs.writeFileSync('src/App.tsx', c, 'utf8');
console.log('✅ Successfully applied new animations');
