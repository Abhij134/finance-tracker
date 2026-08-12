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
      
      const regex = /<([a-zA-Z0-9]+)([^>]*className=[\"\'\`\{][^>]*overflow-(y-auto|x-auto|scroll)[^>]*)(?<!tabIndex=\{0\})>/g;
      
      let modified = false;
      const newContent = content.replace(regex, (match, tag, rest) => {
        // Double check it doesn't already have tabIndex
        if (!rest.includes('tabIndex')) {
          modified = true;
          // Important: check if it's self-closing
          if (rest.endsWith('/')) {
            return `<${tag}${rest.slice(0, -1)} tabIndex={0}/>`;
          }
          return `<${tag}${rest} tabIndex={0}>`;
        }
        return match;
      });
      if (modified) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Updated', fullPath);
      }
    }
  }
}
processDir('p:/finance-tracker-main/components');
processDir('p:/finance-tracker-main/app');
console.log('Done');
