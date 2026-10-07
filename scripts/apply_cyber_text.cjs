const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const cyberComponent = `// richyrik: Beautiful Cyber Text Reveal Component
const CyberTextReveal = ({ text, className, delay = 0, isGradient = false }: { text: string, className?: string, delay?: number, isGradient?: boolean }) => {
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: delay }
    }
  };
  
  const child = {
    hidden: { opacity: 0, y: 15, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", damping: 14, stiffness: 100 }
    }
  };

  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="visible" 
      className={\`flex flex-wrap \${className}\`}
    >
      {words.map((word, i) => (
        <motion.span 
          variants={child} 
          key={i} 
          className={\`mr-1.5 \${isGradient ? className : ''}\`}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};

function App() {`;

if (!c.includes("CyberTextReveal")) {
  c = c.replace("function App() {", cyberComponent);
}

const oldTitle = `<motion.h2 variants={itemVariant} className={\`text-2xl font-bold mb-1 bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`}>{card.title}</motion.h2>`;
const newTitle = `<div className="mb-1"><CyberTextReveal text={card.title} isGradient={true} className={\`text-2xl font-bold bg-clip-text text-transparent \${card.id === 'cloudops' ? 'bg-gradient-to-r from-cyan-300 to-violet-400' : 'bg-gradient-to-r from-emerald-300 to-teal-400'}\`} /></div>`;

const oldSubtitle = `{/* richyrik: Continuous Shimmer Effect (Subheadings) */}
                      <motion.p variants={itemVariant} className={\`text-xs font-semibold uppercase tracking-widest mb-4 animate-shimmer text-transparent bg-clip-text bg-[length:200%_auto] \${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-400 via-white to-purple-400' : 'bg-gradient-to-r from-emerald-400 via-white to-emerald-400'}\`}>
                        {card.subtitle}
                      </motion.p>`;
const newSubtitle = `{/* richyrik: Continuous Shimmer Effect (Subheadings) */}
                      <div className="mb-4">
                        <CyberTextReveal delay={0.2} text={card.subtitle} isGradient={true} className={\`text-xs font-semibold uppercase tracking-widest animate-shimmer text-transparent bg-clip-text bg-[length:200%_auto] \${card.id === 'cloudops' ? 'bg-gradient-to-r from-purple-400 via-white to-purple-400' : 'bg-gradient-to-r from-emerald-400 via-white to-emerald-400'}\`} />
                      </div>`;

const oldDesc = `<motion.p variants={itemVariant} className="text-slate-400 text-sm leading-relaxed mb-7">{card.description}</motion.p>`;
const newDesc = `<div className="text-slate-400 text-sm leading-relaxed mb-7"><CyberTextReveal delay={0.4} text={card.description} /></div>`;

if (c.includes(oldTitle)) {
  c = c.replace(oldTitle, newTitle);
  c = c.replace(oldSubtitle, newSubtitle);
  c = c.replace(oldDesc, newDesc);
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
