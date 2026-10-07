const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const oldComp = `// richyrik: Beautiful Cyber Text Reveal Component
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
};`;

const newComp = `// richyrik: Beautiful Cyber Text Reveal Component
const CyberTextReveal = ({ text, className, delay = 0, isGradient = false }: { text: string, className?: string, delay?: number, isGradient?: boolean }) => {
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: delay }
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
      className={\`flex flex-wrap \${!isGradient ? className : ''}\`}
    >
      {words.map((word, i) => (
        <motion.span 
          variants={child} 
          key={i} 
          className={\`mr-[0.3em] \${isGradient ? className : ''}\`}
        >
          {word}
        </motion.span>
      ))}
    </motion.div>
  );
};`;

if (c.includes(oldComp)) {
  c = c.replace(oldComp, newComp);
  fs.writeFileSync('src/App.tsx', c, 'utf8');
  console.log("Fixed CyberTextReveal!");
} else {
  console.log("Not found.");
}
