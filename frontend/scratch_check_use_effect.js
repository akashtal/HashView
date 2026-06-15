const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.expo')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('d:/Office Work/HashView/frontend/src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('useEffect(')) {
    const hasImport = /import\s+.*?\{\s*[^}]*?\buseEffect\b[^}]*?\}.*?['"]react['"]/.test(content);
    const allUseEffectsAreReactDot =
      content.match(/useEffect\(/g)?.length === content.match(/React\.useEffect\(/g)?.length;

    if (!hasImport && !allUseEffectsAreReactDot) {
      console.log('MISSING IMPORT IN: ' + file);
    }
  }
}
