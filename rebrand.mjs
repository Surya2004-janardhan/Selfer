import fs from 'fs';
import path from 'path';

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.js') || filePath.endsWith('.json')) {
        results.push(filePath);
      }
    }
  }
  return results;
}

const targetDirs = [
  'src/cli',
  'src/config',
  'src/runtime',
  'src/infra'
];

let replacedFiles = 0;

for (const dir of targetDirs) {
  const fullDir = path.resolve(dir);
  if (!fs.existsSync(fullDir)) continue;
  
  const files = walkDir(fullDir);
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content
      .replace(/openclaw/g, 'selfer')
      .replace(/OpenClaw/g, 'Selfer')
      .replace(/OPENCLAW/g, 'SELFER');
      
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      replacedFiles++;
    }
  }
}

console.log(`Rebranded ${replacedFiles} files from openclaw to selfer.`);
