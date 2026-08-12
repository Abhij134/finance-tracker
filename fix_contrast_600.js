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
      
      newContent = newContent.replace(/\btext-zinc-600\b/g, 'text-zinc-400');
      newContent = newContent.replace(/\btext-gray-600\b/g, 'text-gray-400');
      newContent = newContent.replace(/\btext-slate-600\b/g, 'text-slate-400');
      
      if (newContent !== content) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated contrast 600 in', fullPath);
      }
    }
  }
}
processDir('p:/finance-tracker-main/components');
processDir('p:/finance-tracker-main/app');
console.log('Done');
