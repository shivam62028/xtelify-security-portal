const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const itemVariantStr = `  // richyrik: Stagger variant
  const itemVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };`;

const viewVariantsStr = `  // richyrik: Stagger variant
  const itemVariant = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
  };

  const viewVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, staggerChildren: 0.1 } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
  };`;

if (c.includes(itemVariantStr)) {
  c = c.replace(itemVariantStr, viewVariantsStr);
}

const defaultViewOld = `<motion.div
                      key="default-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col h-full"
                    >`;

const defaultViewNew = `<motion.div
                      key="default-view"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex flex-col h-full"
                    >`;

if (c.includes(defaultViewOld)) {
  c = c.replace(defaultViewOld, defaultViewNew);
}

const hoverViewOld = `<motion.div
                      key="hover-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-4 h-full content-start"
                    >`;

const hoverViewNew = `<motion.div
                      key="hover-view"
                      variants={viewVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="grid grid-cols-2 gap-4 h-full content-start"
                    >`;

if (c.includes(hoverViewOld)) {
  c = c.replace(hoverViewOld, hoverViewNew);
}

fs.writeFileSync('src/App.tsx', c, 'utf8');
