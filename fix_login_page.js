const fs = require('fs');

const file = 'p:/finance-tracker-main/app/(auth)/login/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the sticky header (the extra top nav bar)
// Lines 318 to 362 roughly. We will find it by regex.
const headerRegex = /\{\/\* Header Navbar Sticky on Scroll with Top and Bottom Borders \*\/\}.*?<\/header>/s;
content = content.replace(headerRegex, '');

// 2. Move the {showLogin && (...)} block OUTSIDE the <motion.div> that moves -100vw.
// The motion.div ends with:
//                         </motion.div>
//                     </div>
//                 )}
//             </AnimatePresence>
// 
//             <CalculatorModal isOpen={isCalculatorOpen} onClose={() => setIsCalculatorOpen(false)} />
//
// We want to extract the {showLogin && (...)} block and put it after the AnimatePresence.
// The showLogin block is around line 1265 and ends at line 1693 where it's wrapped in {showLogin && ...}
const showLoginRegex = /(\{showLogin && \([\s\S]*?(?=<\/AnimatePresence>))(\s*<\/AnimatePresence>)/;
const match = content.match(showLoginRegex);

if (match) {
    const showLoginBlock = match[1];
    // Remove the block from inside AnimatePresence
    content = content.replace(showLoginBlock, '');
    
    // Insert it after AnimatePresence
    const animatePresenceEndRegex = /(<\/AnimatePresence>\s*)(<CalculatorModal)/;
    content = content.replace(animatePresenceEndRegex, `$1\n${showLoginBlock}\n$2`);
} else {
    console.log("Could not find showLogin block");
}

fs.writeFileSync(file, content);
console.log('Fixed page.tsx');
