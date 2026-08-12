const fs = require('fs');
const path = require('path');
function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== '.next') {
        processDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      
      // We will replace text-zinc-500 with text-zinc-400
      // text-gray-500 with text-gray-400
      // text-slate-500 with text-slate-400
      
      newContent = newContent.replace(/\btext-zinc-500\b/g, 'text-zinc-400');
      newContent = newContent.replace(/\btext-gray-500\b/g, 'text-gray-400');
      newContent = newContent.replace(/\btext-slate-500\b/g, 'text-slate-400');
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated contrast in', fullPath);
      }
    }
  }
}
processDir('p:/finance-tracker-main/components');
processDir('p:/finance-tracker-main/app');
console.log('Done');
